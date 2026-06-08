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
[uploadsDir].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

const upload = multer({ dest: uploadsDir });

function getYTID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
}

// --- RUTA: IMPORT YOUTUBE (VERZIJA 58 - VIDEO + AUDIO MERGE) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const RAPID_KEY = '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea';
    const videoId = getYTID(url);

    console.log("\n--- YOUTUBE IMPORT (MERGING ADAPTIVE STREAMS) ---");

    try {
        // 1. Dobijanje podataka sa API-ja
        const apiRes = await axios.get('https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details', {
            params: { videoId, urlAccess: 'proxied' },
            headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com' }
        });

        const contents = apiRes.data?.contents?.[0];
        const vList = contents?.videos || [];
        const aList = contents?.audios || [];

        // 2. Biramo 360p video i najbolji audio
        const videoObj = vList.find(v => v.label === "360p") || vList.find(v => v.label === "480p") || vList[vList.length - 1];
        const audioObj = aList.find(a => a.label.includes("medium")) || aList[0];

        if (!videoObj?.url || !audioObj?.url) throw new Error("Nisu pronađeni linkovi za preuzimanje.");

        const videoPath = path.join(uploadsDir, `v-${Date.now()}.mp4`);
        const audioPath = path.join(uploadsDir, `a-${Date.now()}.mp3`);
        const mergedPath = path.join(uploadsDir, `merged-${Date.now()}.mp4`);

        console.log(`Skidam video (360p) i audio...`);

        // 3. Skidamo oba fajla na disk (ukupno oko 12MB, bezbedno za Render)
        const download = async (url, dest) => {
            const writer = fs.createWriteStream(dest);
            const response = await axios({ url, method: 'GET', responseType: 'stream' });
            response.data.pipe(writer);
            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        };

        await Promise.all([
            download(videoObj.url, videoPath),
            download(audioObj.url, audioPath)
        ]);

        console.log("Spajam video i audio pomoću FFmpeg...");

        // 4. SPAJANJE (Muxing) - traje svega par sekundi
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions("-c:v copy") // Samo kopiramo video (nema re-encodinga, čuva kvalitet)
            .outputOptions("-c:a aac")  // Enkodiramo audio u standardni AAC
            .on("end", async () => {
                console.log("Spajanje završeno. Šaljem na Supabase...");
                
                const videoName = `yt-${Date.now()}.mp4`;
                const fileStream = fs.createReadStream(mergedPath);
                const stats = fs.statSync(mergedPath);

                const supabaseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/songs/${videoName}`;
                
                await axios.post(supabaseUrl, fileStream, {
                    headers: {
                        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                        'API-Key': process.env.SUPABASE_SERVICE_ROLE_KEY,
                        'Content-Type': 'video/mp4',
                        'Content-Length': stats.size,
                        'x-upsert': 'true'
                    }
                });

                // Čišćenje fajlova
                [videoPath, audioPath, mergedPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });

                res.json({ 
                    success: true, 
                    videoUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/songs/${videoName}`,
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    title: apiRes.data.metadata?.title || "YouTube Song"
                });
            })
            .on("error", (err) => {
                console.error("FFmpeg Error:", err);
                res.status(500).json({ error: "Spajanje neuspešno" });
            })
            .save(mergedPath);

    } catch (err) {
        console.error("Greška:", err.message);
        res.status(500).json({ error: "Import failed", details: err.message });
    }
});

// --- RENDER DUET (Bez izmena) ---
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;
    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(uploadsDir, `final-${Date.now()}.mp4`);

    try {
        const resp = await axios({ url: originalUrl, method: 'GET', responseType: 'stream' });
        const writer = fs.createWriteStream(localOriginal);
        resp.data.pipe(writer);
        await new Promise((res, rej) => { writer.on('finish', res); writer.on('error', rej); });

        ffmpeg()
            .input(localOriginal).input(reactionFile.path).duration(parseFloat(duration) || 10)
            .complexFilter([
                `[0:v]fps=20,scale=480:360:force_original_aspect_ratio=increase,crop=480:360[v0]`,
                `[1:v]fps=20,scale=480:360:force_original_aspect_ratio=increase,crop=480:360[v1]`,
                `[v0][v1]vstack=inputs=2[v_final]`,
                `[0:a]volume=0.1[a0]`, `[1:a]volume=4.0[a1]`, `[a0][a1]amix=inputs=2:duration=first[a_final]`
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
            .on("error", (err) => res.status(500).json({ error: "Render failed" }))
            .save(outputPath);
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.listen(PORT, () => console.log(`Backend V58 - Adaptive Merger Ready`));