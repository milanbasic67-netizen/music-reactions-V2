const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const uploadsDir = path.join(__dirname, "uploads");
const rendersDir = path.join(__dirname, "renders");
[uploadsDir, rendersDir].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

const upload = multer({ dest: uploadsDir });

// --- POBOLJŠANA DOWNLOAD FUNKCIJA (Sa logovanjem progresa) ---
async function downloadFromUrl(url, targetPath) {
    console.log("Započinjem mrežni prenos fajla...");
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 120000, // 2 minuta timeout
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
    });

    const totalLength = response.headers['content-length'];
    console.log(`Veličina fajla za skidanje: ${(totalLength / 1024 / 1024).toFixed(2)} MB`);

    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(targetPath);
        response.data.pipe(writer);
        
        let downloaded = 0;
        response.data.on('data', (chunk) => {
            downloaded += chunk.length;
            // Logujemo svakih 5MB da ne zagušimo konzolu
            if (downloaded % (5 * 1024 * 1024) < chunk.length) {
                console.log(`Skinuto: ${(downloaded / 1024 / 1024).toFixed(2)} MB...`);
            }
        });

        writer.on('finish', () => {
            console.log("Download na disk završen!");
            resolve();
        });
        writer.on('error', (err) => {
            console.error("Greška pri pisanju na disk:", err);
            reject(err);
        });
    });
}

// --- RUTA: IMPORT YOUTUBE (VERZIJA 19) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    console.log("\n--- YOUTUBE IMPORT START (V19) ---");

    try {
        const encodedParams = new URLSearchParams();
        encodedParams.set('url', url);

        const apiRes = await axios.post('https://youtube-video-downloader-ai.p.rapidapi.com/download.php', encodedParams, {
            headers: {
                'x-rapidapi-key': '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea',
                'x-rapidapi-host': 'youtube-video-downloader-ai.p.rapidapi.com',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = apiRes.data;
        let mp4Url = null;

        if (data.medias && Array.isArray(data.medias)) {
            const best = data.medias.find(m => m.ext === 'mp4' && m.quality.includes('720p')) || 
                         data.medias.find(m => m.ext === 'mp4') || 
                         data.medias[0];
            mp4Url = best?.download_url;
        }

        if (!mp4Url) throw new Error("Nije pronađen download_url.");

        const videoName = `yt-${Date.now()}.mp4`;
        const tempPath = path.join(uploadsDir, videoName);

        // Preuzimanje na server
        await downloadFromUrl(mp4Url, tempPath);

        // Upload na Supabase
        console.log("Počinjem slanje na Supabase Storage...");
        const fileBuffer = fs.readFileSync(tempPath);
        const { error: upErr } = await supabase.storage
            .from("songs")
            .upload(videoName, fileBuffer, { contentType: 'video/mp4' });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("songs").getPublicUrl(videoName);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        console.log("SVE USPEŠNO ZAVRŠENO!");
        res.json({ success: true, videoUrl: publicUrl });

    } catch (err) {
        console.error("KRITIČNA GREŠKA:", err.message);
        res.status(500).json({ error: "Import failed", details: err.message });
    }
});

// --- RUTA: RENDER DUET (Bez promena) ---
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;
    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(rendersDir, `final-${Date.now()}.mp4`);
    const finalDuration = parseFloat(duration) || 10;

    try {
        await downloadFromUrl(originalUrl, localOriginal);
        ffmpeg()
            .input(localOriginal).input(reactionFile.path).duration(finalDuration)
            .complexFilter([
                `[0:v]fps=30,setsar=1,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[v0]`,
                `[1:v]fps=30,format=yuv420p,setsar=1,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[v1]`,
                `[v0][v1]vstack=inputs=2,setsar=1[v_final]`,
                `[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.5[a0]`,
                `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=1.2[a1]`,
                `[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[a_final]`
            ])
            .outputOptions(["-map [v_final]", "-map [a_final]", "-c:v libx264", "-preset ultrafast", "-crf 24", "-pix_fmt yuv420p", "-movflags +faststart"])
            .on("end", async () => {
                const storageName = `duets/tiktok-${Date.now()}.mp4`;
                const { error: upErr } = await supabase.storage.from("videos").upload(storageName, fs.createReadStream(outputPath));
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(storageName);
                [localOriginal, reactionFile.path, outputPath].forEach(p => { if (p && fs.existsSync(p)) fs.unlink(p, () => {}); });
                res.json({ success: true, videoUrl: publicUrl });
            })
            .on("error", (err) => { console.error(err); res.status(500).json({ error: "Render failed" }); })
            .save(outputPath);
    } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

app.listen(PORT, () => console.log(`Server Online - Verzija 19`));