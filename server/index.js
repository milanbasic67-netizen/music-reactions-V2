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
    const writer = fs.createWriteStream(targetPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// --- RUTA: IMPORT YOUTUBE (Fiksirana za SMVD JSON strukturu) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    console.log("\n--- YOUTUBE IMPORT ZAPOČET ---", url);

    try {
        const options = {
            method: 'GET',
            url: 'https://social-media-video-downloader.p.rapidapi.com/smvd/get/all',
            params: { url: url },
            headers: {
                'X-RapidAPI-Key': '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea',
                'X-RapidAPI-Host': 'social-media-video-downloader.p.rapidapi.com'
            }
        };

        const apiRes = await axios.request(options);
        const data = apiRes.data;

        // --- LOGIKA ZA IZVLAČENJE LINKA IZ TVOG KONTEKSTA ---
        let mp4Url = null;

        if (data.contents && data.contents[0] && data.contents[0].videos) {
            const videos = data.contents[0].videos;
            
            // 1. Pokušavamo da nađemo 720p MP4 (najbolji balans kvaliteta i brzine za duet)
            let bestVideo = videos.find(v => v.label === "720p" && v.metadata.mime_type.includes("video/mp4"));
            
            // 2. Ako nema 720p, tražimo 1080p MP4
            if (!bestVideo) {
                bestVideo = videos.find(v => v.label === "1080p" && v.metadata.mime_type.includes("video/mp4"));
            }

            // 3. Ako nema ni toga, uzmi bilo koji MP4
            if (!bestVideo) {
                bestVideo = videos.find(v => v.metadata.mime_type.includes("video/mp4"));
            }

            if (bestVideo) mp4Url = bestVideo.url;
        }

        if (!mp4Url) {
            throw new Error("Nije pronađen odgovarajući MP4 video link u API odgovoru.");
        }

        const videoName = `yt-${Date.now()}.mp4`;
        const tempPath = path.join(uploadsDir, videoName);

        console.log("Skidam video na server...");
        await downloadFromUrl(mp4Url, tempPath);

        console.log("Slanje na Supabase...");
        const fileBuffer = fs.readFileSync(tempPath);
        const { error: upErr } = await supabase.storage
            .from("songs")
            .upload(videoName, fileBuffer, { contentType: 'video/mp4' });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("songs").getPublicUrl(videoName);

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        console.log("Uspeh! Video URL:", publicUrl);
        res.json({ success: true, videoUrl: publicUrl });

    } catch (err) {
        console.error("YouTube Error:", err.message);
        res.status(500).json({ error: "Greška pri uvozu: " + err.message });
    }
});

// --- RUTA: RENDER DUET (TikTok 1080x1920 Fix) ---
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

app.listen(PORT, () => console.log(`Server Online na portu ${PORT}`));