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
const rendersDir = path.join(__dirname, "renders");
[uploadsDir, rendersDir].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

const upload = multer({ dest: uploadsDir });

// --- RUTA: IMPORT YOUTUBE (VERZIJA 42 - ULTRA-LIGHT FETCH) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const RAPID_KEY = '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea';
    
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[7].length == 11) ? match[7] : null;

    console.log("\n--- YOUTUBE IMPORT (ULTRA-LIGHT FETCH MODE) ---");

    try {
        // 1. Dobijanje linka
        const apiRes = await axios.get('https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details', {
            params: { videoId, urlAccess: 'proxied', renderableFormats: '360p' },
            headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com' }
        });

        const mp4Url = apiRes.data?.contents?.[0]?.videos?.[0]?.url;
        if (!mp4Url) throw new Error("Link nije pronađen.");

        // 2. Pokretanje download-a
        const response = await axios({ url: mp4Url, method: 'GET', responseType: 'stream' });

        const videoName = `yt-${Date.now()}.mp4`;
        
        // 3. DIREKTAN UPLOAD PREKO FETCH API (Najmanja potrošnja RAM-a)
        console.log("Prenos strima direktno na Supabase API...");
        
        const supabaseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/songs/${videoName}`;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const uploadRes = await fetch(supabaseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'API-Key': supabaseKey,
                'Content-Type': 'video/mp4',
                'x-upsert': 'true'
            },
            body: response.data, // Prosleđujemo axios strim direktno u fetch body
            duplex: 'half'
        });

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            throw new Error(`Supabase Upload Greška: ${errText}`);
        }

        const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/render/image/public/songs/${videoName}`.replace('/render/image', '');
        
        console.log("Import uspešan!");
        res.json({ success: true, videoUrl: publicUrl, title: apiRes.data.metadata?.title });

    } catch (err) {
        console.error("Greška:", err.message);
        if (!res.headersSent) res.status(500).json({ error: "Import failed", details: err.message });
    }
});

// --- RUTA: RENDER DUET (Korišćenje slične striming logike) ---
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;
    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(rendersDir, `final-${Date.now()}.mp4`);

    try {
        // Skidamo original na disk jer FFmpeg zahteva nasumičan pristup fajlu (ne može strim)
        const resp = await axios({ url: originalUrl, method: 'GET', responseType: 'stream' });
        const writer = fs.createWriteStream(localOriginal);
        resp.data.pipe(writer);
        await new Promise((res, rej) => { writer.on('finish', res); writer.on('error', rej); });

        ffmpeg()
            .input(localOriginal).input(reactionFile.path).duration(parseFloat(duration) || 10)
            .complexFilter([
                `[0:v]fps=24,scale=720:640:force_original_aspect_ratio=increase,crop=720:640[v0]`,
                `[1:v]fps=24,scale=720:640:force_original_aspect_ratio=increase,crop=720:640[v1]`,
                `[v0][v1]vstack=inputs=2[v_final]`,
                `[0:a]volume=0.4[a0]`,
                `[1:a]volume=1.2[a1]`,
                `[a0][a1]amix=inputs=2:duration=first[a_final]`
            ])
            .outputOptions(["-map [v_final]", "-map [a_final]", "-c:v libx264", "-preset superfast", "-crf 28", "-pix_fmt yuv420p"])
            .on("end", async () => {
                const storageName = `duets/tiktok-${Date.now()}.mp4`;
                const fileStream = fs.createReadStream(outputPath);
                
                // Upload rendera preko fetch-a
                const supUrl = `${process.env.SUPABASE_URL}/storage/v1/object/videos/${storageName}`;
                await fetch(supUrl, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'API-Key': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'video/mp4' },
                    body: fileStream,
                    duplex: 'half'
                });

                const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/videos/${storageName}`;
                [localOriginal, reactionFile.path, outputPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
                res.json({ success: true, videoUrl: publicUrl });
            })
            .on("error", (err) => { console.error(err); res.status(500).json({ error: "Render failed" }); })
            .save(outputPath);
    } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

app.listen(PORT, () => console.log(`Backend V42 - Ultra Light`));