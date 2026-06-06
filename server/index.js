const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const { PassThrough } = require("stream");
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

// --- RUTA: IMPORT YOUTUBE (VERZIJA 41 - STABLE STREAMING) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const RAPID_KEY = '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea';
    
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[7].length == 11) ? match[7] : null;

    console.log("\n--- YOUTUBE IMPORT (STABLE STREAMING) ---");

    try {
        const apiRes = await axios.get('https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details', {
            params: { videoId, urlAccess: 'proxied', renderableFormats: '360p' },
            headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com' }
        });

        const mp4Url = apiRes.data?.contents?.[0]?.videos?.[0]?.url;
        if (!mp4Url) throw new Error("Link nije pronađen.");

        console.log("Pokrećem prenos...");

        const response = await axios({
            url: mp4Url,
            method: 'GET',
            responseType: 'stream'
        });

        // Koristimo PassThrough da stabilizujemo protok podataka
        const passThrough = new PassThrough();
        response.data.pipe(passThrough);

        const videoName = `yt-${Date.now()}.mp4`;

        // Upload strima bez baferovanja u RAM
        const { data: upData, error: upErr } = await supabase.storage
            .from("songs")
            .upload(videoName, passThrough, { 
                contentType: 'video/mp4',
                duplex: 'half'
            });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("songs").getPublicUrl(videoName);
        
        console.log("Završeno uspešno u 30 sekundi!");
        res.json({ success: true, videoUrl: publicUrl, title: apiRes.data.metadata?.title });

    } catch (err) {
        console.error("Greška:", err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: "Import failed", details: err.message });
        }
    }
});

// --- RUTA: RENDER DUET (Bez promena) ---
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;
    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(rendersDir, `final-${Date.now()}.mp4`);
    
    try {
        const resp = await axios({ url: originalUrl, method: 'GET', responseType: 'stream' });
        const writer = fs.createWriteStream(localOriginal);
        resp.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        ffmpeg()
            .input(localOriginal).input(reactionFile.path).duration(parseFloat(duration) || 10)
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

app.listen(PORT, () => console.log(`Server Online - Verzija 41`));