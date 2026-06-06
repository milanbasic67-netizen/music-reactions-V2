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

async function downloadFromUrl(url, targetPath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
    });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(targetPath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// --- RUTA: IMPORT YOUTUBE (VERZIJA 14 - ISPRAVLJEN POLLING) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const RAPID_KEY = '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea';
    const RAPID_HOST = 'yt-downloader9.p.rapidapi.com';

    console.log("\n--- YOUTUBE IMPORT (POLLING FIX) ---");

    try {
        // 1. ZAPOČNI ZADATAK
        const startRes = await axios.post(`https://${RAPID_HOST}/start`, {
            urls: [url],
            onlyAudio: false,
            ignorePlaylists: true,
            videoQuality: 'best'
        }, {
            headers: {
                'x-rapidapi-key': RAPID_KEY,
                'x-rapidapi-host': RAPID_HOST,
                'Content-Type': 'application/json'
            }
        });

        const uid = startRes.data.uid;
        if (!uid) throw new Error("Nisam dobio UID od API-ja.");
        console.log("UID dobijen:", uid);

        // 2. POLLING (Provera na /dl endpointu)
        let mp4Url = null;
        let attempts = 0;
        const maxAttempts = 15; // Ukupno 45 sekundi čekanja

        while (!mp4Url && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 3000)); // Čekaj 3s
            
            console.log(`Provera statusa (${attempts}/${maxAttempts})...`);

            const dlRes = await axios.get(`https://${RAPID_HOST}/dl`, {
                params: { uid: uid },
                headers: {
                    'x-rapidapi-key': RAPID_KEY,
                    'x-rapidapi-host': RAPID_HOST
                }
            });

            const statusData = dlRes.data;

            // yt-downloader9 obično vraća niz u data polju
            // Primer: { data: [{ url: "...", quality: "720p" }] }
            if (statusData && Array.isArray(statusData)) {
                mp4Url = statusData[0].url || statusData[0].video;
            } else if (statusData.data && Array.isArray(statusData.data)) {
                mp4Url = statusData.data[0].url || statusData.data[0].video;
            } else if (statusData.url) {
                mp4Url = statusData.url;
            }
        }

        if (!mp4Url) throw new Error("Video nije bio spreman nakon 45 sekundi.");

        const videoName = `yt-${Date.now()}.mp4`;
        const tempPath = path.join(uploadsDir, videoName);

        console.log("Skidanje sa YouTube-a...");
        await downloadFromUrl(mp4Url, tempPath);

        console.log("Slanje na Supabase...");
        const fileBuffer = fs.readFileSync(tempPath);
        const { error: upErr } = await supabase.storage
            .from("songs")
            .upload(videoName, fileBuffer, { contentType: 'video/mp4' });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("songs").getPublicUrl(videoName);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        console.log("Import USPEŠAN!");
        res.json({ success: true, videoUrl: publicUrl });

    } catch (err) {
        console.error("Greška:", err.message);
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

app.listen(PORT, () => console.log(`Server Online - Verzija 14`));