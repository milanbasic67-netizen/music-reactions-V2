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

// POMOĆNA FUNKCIJA ZA VIDEO ID
function getYTID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
}

// --- RUTA: IMPORT YOUTUBE (VERZIJA 47 - PUT BYPASS) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const RAPID_KEY = '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea';
    const videoId = getYTID(url);

    console.log("\n--- YOUTUBE IMPORT (PUT STREAMING MODE) ---");

    if (!videoId) return res.status(400).json({ error: "Nevažeći YouTube link." });

    try {
        // 1. Dobijanje proksi linka (360p)
        const apiRes = await axios.get('https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details', {
            params: { 
                videoId: videoId, 
                urlAccess: 'proxied', 
                renderableFormats: '360p',
                getTranscript: 'false'
            },
            headers: { 
                'x-rapidapi-key': RAPID_KEY, 
                'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com' 
            }
        });

        const mp4Url = apiRes.data?.contents?.[0]?.videos?.[0]?.url;
        if (!mp4Url) throw new Error("Link nije pronađen u API odgovoru.");

        const videoName = `yt-${Date.now()}.mp4`;
        const supabaseUrl = new URL(`${process.env.SUPABASE_URL}/storage/v1/object/songs/${videoName}`);
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        console.log(`Započinjem PUT prenos: ${videoName}`);

        // 2. OTAVRAMO HTTPS ZAHTEV KA SUPABASE-U KORISTEĆI PUT METODU
        const supabaseRequest = https.request({
            hostname: supabaseUrl.hostname,
            path: supabaseUrl.pathname,
            method: 'PUT', // KLJUČNA PROMENA
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'API-Key': supabaseKey,
                'Content-Type': 'video/mp4',
                'x-upsert': 'true'
            }
        }, (supRes) => {
            let resData = "";
            supRes.on("data", (d) => resData += d);
            supRes.on("end", () => {
                // Supabase PUT vraća 200 ili 201 za uspeh
                if (supRes.statusCode >= 200 && supRes.statusCode < 300) {
                    console.log("Upload uspešan (PUT Method)!");
                    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/songs/${videoName}`;
                    const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                    
                    res.json({ 
                        success: true, 
                        videoUrl: publicUrl, 
                        thumbnailUrl: thumbUrl,
                        title: apiRes.data.metadata?.title || "YouTube Song",
                        artist: apiRes.data.metadata?.author?.name || "YouTube Artist"
                    });
                } else {
                    console.error("Supabase PUT Error:", supRes.statusCode, resData);
                    res.status(supRes.statusCode).json({ error: "Supabase error", details: resData });
                }
            });
        });

        supabaseRequest.on("error", (e) => {
            console.error("Supabase Request Error:", e);
            res.status(500).json({ error: "Connection to Supabase failed" });
        });

        // 3. SPAJANJE CEVI (YouTube -> Supabase)
        https.get(mp4Url, (ytRes) => {
            if (ytRes.statusCode !== 200) {
                supabaseRequest.destroy();
                return res.status(500).json({ error: "YouTube Proxy Connection Error" });
            }
            ytRes.pipe(supabaseRequest);
        }).on("error", (e) => {
            console.error("YouTube GET Error:", e);
            supabaseRequest.destroy();
        });

    } catch (err) {
        console.error("Greška pri uvozu:", err.message);
        if (!res.headersSent) res.status(500).json({ error: "Import failed", details: err.message });
    }
});

// --- RUTA: RENDER DUET (Standardna optimizovana verzija) ---
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
                        `[0:a]volume=0.5[a0]`,
                        `[1:a]volume=1.2[a1]`,
                        `[a0][a1]amix=inputs=2:duration=first[a_final]`
                    ])
                    .outputOptions(["-map [v_final]", "-map [a_final]", "-c:v libx264", "-preset ultrafast", "-crf 30", "-pix_fmt yuv420p"])
                    .on("end", async () => {
                        const storageName = `duets/tiktok-${Date.now()}.mp4`;
                        const fileStream = fs.createReadStream(outputPath);
                        
                        const supUrl = `${process.env.SUPABASE_URL}/storage/v1/object/videos/${storageName}`;
                        await axios.post(supUrl, fileStream, {
                            headers: { 
                                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 
                                'API-Key': process.env.SUPABASE_SERVICE_ROLE_KEY, 
                                'Content-Type': 'video/mp4' 
                            }
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

app.listen(PORT, () => console.log(`Backend V47 Online (PUT Streaming Mode)`));