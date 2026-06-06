const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const https = require("https");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");
const rendersDir = path.join(__dirname, "renders");
[uploadsDir, rendersDir].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

const upload = multer({ dest: uploadsDir });

function getYTID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
}

// --- RUTA: IMPORT YOUTUBE (VERZIJA 46 - BYPASS LOAD BALANCER) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const RAPID_KEY = '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea';
    const videoId = getYTID(url);

    console.log("\n--- YOUTUBE IMPORT (CHUNKING MODE) ---");

    try {
        const apiRes = await axios.get('https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details', {
            params: { videoId, urlAccess: 'proxied', renderableFormats: '360p' },
            headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com' }
        });

        const mp4Url = apiRes.data?.contents?.[0]?.videos?.[0]?.url;
        if (!mp4Url) throw new Error("Link nije pronađen.");

        const videoName = `yt-${Date.now()}.mp4`;
        const supabaseUrl = new URL(`${process.env.SUPABASE_URL}/storage/v1/object/songs/${videoName}`);
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        // KLJUČNA PROMENA: Koristimo 'Transfer-Encoding: chunked' da zaobiđemo proksi limite
        const supabaseRequest = https.request({
            hostname: supabaseUrl.hostname,
            path: supabaseUrl.pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'API-Key': supabaseKey,
                'Content-Type': 'video/mp4',
                'Transfer-Encoding': 'chunked', // Ovo sprečava load balancere da blokiraju zbog veličine
                'x-upsert': 'true'
            }
        }, (supRes) => {
            let resData = "";
            supRes.on("data", (d) => resData += d);
            supRes.on("end", () => {
                if (supRes.statusCode >= 200 && supRes.statusCode < 300) {
                    res.json({ 
                        success: true, 
                        videoUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/songs/${videoName}`,
                        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                        title: apiRes.data.metadata?.title || "YouTube Song"
                    });
                } else {
                    console.error("Supabase Error:", supRes.statusCode, resData);
                    res.status(500).json({ error: "Supabase error", details: resData });
                }
            });
        });

        https.get(mp4Url, (ytRes) => {
            ytRes.pipe(supabaseRequest);
        });

    } catch (err) {
        res.status(500).json({ error: "Import failed", details: err.message });
    }
});

// --- RUTA: RENDER DUET ---
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;
    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(rendersDir, `final-${Date.now()}.mp4`);

    try {
        const file = fs.createWriteStream(localOriginal);
        https.get(originalUrl, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                ffmpeg()
                    .input(localOriginal).input(reactionFile.path).duration(parseFloat(duration) || 10)
                    .complexFilter([
                        `[0:v]fps=24,scale=640:480:force_original_aspect_ratio=increase,crop=640:480[v0]`,
                        `[1:v]fps=24,scale=640:480:force_original_aspect_ratio=increase,crop=640:480[v1]`,
                        `[v0][v1]vstack=inputs=2[v_final]`,
                        `[0:a]volume=0.5[a0]`, `[1:a]volume=1.2[a1]`, `[a0][a1]amix=inputs=2:duration=first[a_final]`
                    ])
                    .outputOptions(["-map [v_final]", "-map [a_final]", "-c:v libx264", "-preset ultrafast", "-crf 28"])
                    .on("end", async () => {
                        const storageName = `duets/tiktok-${Date.now()}.mp4`;
                        const fileStream = fs.createReadStream(outputPath);
                        await axios.post(`${process.env.SUPABASE_URL}/storage/v1/object/videos/${storageName}`, fileStream, {
                            headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'API-Key': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'video/mp4' }
                        });
                        [localOriginal, reactionFile.path, outputPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
                        res.json({ success: true, videoUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/videos/${storageName}` });
                    })
                    .on("error", (err) => res.status(500).json({ error: "Render failed" }))
                    .save(outputPath);
            });
        });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.listen(PORT, () => console.log(`Backend V46 - Pro Tier Ready`));