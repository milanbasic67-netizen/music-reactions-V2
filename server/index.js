const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const https = require("https"); // Koristimo ugrađeni modul za nultu potrošnju RAM-a
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

// --- RUTA: IMPORT YOUTUBE (VERZIJA 43 - ZERO RAM OVERHEAD) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const RAPID_KEY = '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea';
    
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[7].length == 11) ? match[7] : null;

    console.log("\n--- YOUTUBE IMPORT (NUCLEAR MEMORY MODE) ---");

    try {
        // 1. Dobijanje linka (Axios je ovde OK jer je mali JSON)
        const apiRes = await axios.get('https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details', {
            params: { videoId, urlAccess: 'proxied', renderableFormats: '360p' },
            headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com' }
        });

        const mp4Url = apiRes.data?.contents?.[0]?.videos?.[0]?.url;
        if (!mp4Url) throw new Error("Link nije pronađen.");

        const videoName = `yt-${Date.now()}.mp4`;
        const supabaseUrl = new URL(`${process.env.SUPABASE_URL}/storage/v1/object/songs/${videoName}`);
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        console.log("Pokrećem High-Speed Low-RAM prenos...");

        // 2. OTAVRAMO HTTPS ZAHTEV KA SUPABASE-U (PUT Metoda)
        const supabaseRequest = https.request({
            hostname: supabaseUrl.hostname,
            path: supabaseUrl.pathname,
            method: 'POST', // Supabase podržava POST za nove fajlove
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'API-Key': supabaseKey,
                'Content-Type': 'video/mp4',
                'x-upsert': 'true'
            }
        }, (supRes) => {
            let resData = "";
            supRes.on("data", (chunk) => resData += chunk);
            supRes.on("end", () => {
                if (supRes.statusCode >= 200 && supRes.statusCode < 300) {
                    console.log("Upload završen uspešno!");
                    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/songs/${videoName}`;
                    res.json({ success: true, videoUrl: publicUrl, title: apiRes.data.metadata?.title });
                } else {
                    console.error("Supabase Error:", resData);
                    res.status(500).json({ error: "Supabase upload failed" });
                }
            });
        });

        supabaseRequest.on("error", (e) => {
            console.error("Supabase Request Error:", e);
            if (!res.headersSent) res.status(500).json({ error: "Upload connection error" });
        });

        // 3. OTVARAMO HTTPS ZAHTEV KA YOUTUBE PROKSIJU I SPAJAMO CEVI
        https.get(mp4Url, (ytRes) => {
            if (ytRes.statusCode !== 200) {
                console.error("YouTube Proxy Error:", ytRes.statusCode);
                return res.status(500).json({ error: "YouTube stream error" });
            }

            // KLJUČ: Postavljamo minimalni bafer (highWaterMark)
            ytRes.pipe(supabaseRequest);
            
            ytRes.on("end", () => {
                console.log("Strim sa YouTube-a završen, zatvaram upload...");
                supabaseRequest.end();
            });
        }).on("error", (e) => {
            console.error("YouTube Get Error:", e);
            supabaseRequest.destroy();
            if (!res.headersSent) res.status(500).json({ error: "YouTube connection error" });
        });

    } catch (err) {
        console.error("Greška:", err.message);
        if (!res.headersSent) res.status(500).json({ error: "Import failed", details: err.message });
    }
});

// --- RUTA: RENDER DUET (Minimiziran RAM) ---
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
                        `[0:v]fps=20,scale=640:480:force_original_aspect_ratio=increase,crop=640:480[v0]`,
                        `[1:v]fps=20,scale=640:480:force_original_aspect_ratio=increase,crop=640:480[v1]`,
                        `[v0][v1]vstack=inputs=2[v_final]`,
                        `[0:a]volume=0.4[a0]`,
                        `[1:a]volume=1.2[a1]`,
                        `[a0][a1]amix=inputs=2:duration=first[a_final]`
                    ])
                    .outputOptions(["-map [v_final]", "-map [a_final]", "-c:v libx264", "-preset ultrafast", "-crf 30", "-pix_fmt yuv420p"])
                    .on("end", async () => {
                        const storageName = `duets/tiktok-${Date.now()}.mp4`;
                        // Upload rendera sa nultim RAM-om bi zahtevao sličnu https logiku, ali FFmpeg već piše na disk
                        const fileStream = fs.createReadStream(outputPath);
                        const { data } = await axios.post(`${process.env.SUPABASE_URL}/storage/v1/object/videos/${storageName}`, fileStream, {
                            headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'API-Key': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'video/mp4' }
                        });
                        
                        [localOriginal, reactionFile.path, outputPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
                        res.json({ success: true, videoUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/videos/${storageName}` });
                    })
                    .on("error", (err) => { console.error(err); res.status(500).json({ error: "Render failed" }); })
                    .save(outputPath);
            });
        });
    } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

app.listen(PORT, () => console.log(`Backend V43 - Raw Stream Mode`));