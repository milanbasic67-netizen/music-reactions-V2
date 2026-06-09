const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({ dest: uploadsDir });

function getYTID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
}

// --- RUTA: IMPORT YOUTUBE (OPTIMIZOVANA ZA RENDER) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const RAPID_KEY = '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea';
    const videoId = getYTID(url);

    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    const videoPath = path.join(uploadsDir, `v-${Date.now()}.mp4`);
    const audioPath = path.join(uploadsDir, `a-${Date.now()}.mp3`);
    const mergedPath = path.join(uploadsDir, `merged-${Date.now()}.mp4`);

    const cleanup = () => {
        [videoPath, audioPath, mergedPath].forEach(p => {
            if (fs.existsSync(p)) {
                try { fs.unlinkSync(p); } catch (e) { console.error("Cleanup error:", e.message); }
            }
        });
    };

    console.log(`\n--- NOVI IMPORT: ${videoId} ---`);

    try {
        const apiRes = await axios.get('https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details', {
            params: { videoId, urlAccess: 'proxied' },
            headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com' }
        });

        const contents = apiRes.data?.contents?.[0];
        const vList = contents?.videos || [];
        const aList = contents?.audios || [];

        const videoObj = vList.find(v => v.label === "360p") || vList.find(v => v.label === "480p") || vList[vList.length - 1];
        const audioObj = aList.find(a => a.label.includes("medium")) || aList[0];

        if (!videoObj?.url || !audioObj?.url) throw new Error("Links not found.");

        const download = async (url, dest) => {
            const writer = fs.createWriteStream(dest);
            const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 60000 });
            response.data.pipe(writer);
            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', (err) => { cleanup(); reject(err); });
            });
        };

        console.log("Downloading streams...");
        await Promise.all([download(videoObj.url, videoPath), download(audioObj.url, audioPath)]);

        console.log("FFmpeg merging...");
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions(["-c:v copy", "-c:a aac", "-shortest"])
            .on("error", (err) => {
                console.error("FFmpeg error:", err.message);
                cleanup();
                if (!res.headersSent) res.status(500).json({ error: "FFmpeg process failed" });
            })
            .on("end", async () => {
                try {
                    console.log("Uploading to Supabase...");
                    const videoName = `yt-${Date.now()}.mp4`;
                    const stats = fs.statSync(mergedPath);
                    const storageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/songs/${videoName}`;

                    await axios.post(storageUrl, fs.createReadStream(mergedPath), {
                        headers: {
                            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                            'API-Key': process.env.SUPABASE_SERVICE_ROLE_KEY,
                            'Content-Type': 'video/mp4',
                            'Content-Length': stats.size,
                            'x-upsert': 'true'
                        }
                    });

                    cleanup();
                    console.log("Done. Response sent.");

                    res.json({ 
                        success: true, 
                        videoUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/songs/${videoName}`,
                        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                        title: apiRes.data.metadata?.title || "YouTube Song"
                    });
                } catch (err) {
                    cleanup();
                    console.error("Upload error:", err.message);
                    if (!res.headersSent) res.status(500).json({ error: "Storage upload failed" });
                }
            })
            .save(mergedPath);

    } catch (err) {
        cleanup();
        console.error("General error:", err.message);
        if (!res.headersSent) res.status(500).json({ error: "Import process failed", details: err.message });
    }
});

// --- RUTA: RENDER DUET (OPTIMIZOVANO ČIŠĆENJE) ---
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;
    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(uploadsDir, `final-${Date.now()}.mp4`);

    try {
        const resp = await axios({ url: originalUrl, method: 'GET', responseType: 'stream', timeout: 30000 });
        const writer = fs.createWriteStream(localOriginal);
        resp.data.pipe(writer);
        await new Promise((res, rej) => { writer.on('finish', res); writer.on('error', rej); });

        ffmpeg()
            .input(localOriginal).input(reactionFile.path).duration(parseFloat(duration) || 10)
            .complexFilter([
                `[0:v]fps=20,scale=480:360:force_original_aspect_ratio=increase,crop=480:360[v0]`,
                `[1:v]fps=20,scale=480:360:force_original_aspect_ratio=increase,crop=480:360[v1]`,
                `[v0][v1]vstack=inputs=2[v_final]`,
                `[0:a]volume=0.6[a0]`, `[1:a]highpass=f=200,volume=3.0[a1]`, `[a0][a1]amix=inputs=2:duration=first[a_final]`
            ])
            .outputOptions(["-map [v_final]", "-map [a_final]", "-c:v libx264", "-preset ultrafast", "-crf 32"])
            .on("end", async () => {
                const storageName = `duets/tiktok-${Date.now()}.mp4`;
                await axios.post(`${process.env.SUPABASE_URL}/storage/v1/object/videos/${storageName}`, fs.createReadStream(outputPath), {
                    headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'API-Key': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'video/mp4' }
                });
                [localOriginal, reactionFile.path, outputPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
                res.json({ success: true, videoUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/videos/${storageName}` });
            })
            .on("error", (err) => {
                [localOriginal, reactionFile.path, outputPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
                res.status(500).json({ error: "Render failed" });
            })
            .save(outputPath);
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.listen(PORT, () => console.log(`Backend V58+ Optimized - Running on port ${PORT}`));