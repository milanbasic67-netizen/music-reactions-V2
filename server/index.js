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

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const uploadsDir = path.join(__dirname, "uploads");
const rendersDir = path.join(__dirname, "renders");
[uploadsDir, rendersDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const upload = multer({ dest: uploadsDir });

// POMOĆNA FUNKCIJA: Download bilo kog fajla sa URL-a na disk
async function downloadFromUrl(url, targetPath) {
    const writer = fs.createWriteStream(targetPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// 1. RUTA: IMPORT YOUTUBE (Preko RapidAPI)
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    console.log("\n--- YOUTUBE IMPORT (RAPID API) ---", url);

    if (!url) return res.status(400).json({ error: "Missing YouTube URL" });

    try {
        // POZIV RAPID API-JU (Koristimo stabilan downloader API)
        const options = {
            method: 'GET',
            url: 'https://youtube-video-downloader-cli.p.rapidapi.com/video',
            params: { url: url },
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, // Tvoj ključ iz .env
                'X-RapidAPI-Host': 'youtube-video-downloader-cli.p.rapidapi.com'
            }
        };

        const apiRes = await response = await axios.request(options);
        
        // Uzimamo link za MP4 format (obično najveći kvalitet)
        // Napomena: Struktura data zavisi od specifičnog API-ja koji izabereš
        const videoData = apiRes.data;
        const mp4Url = videoData.formats.find(f => f.ext === 'mp4' || f.container === 'mp4')?.url || videoData.url;

        if (!mp4Url) throw new Error("Could not find direct MP4 link");

        const videoName = `yt-${Date.now()}.mp4`;
        const tempPath = path.join(uploadsDir, videoName);

        // Download videa na naš server
        console.log("Skidam video sa YouTube servera...");
        await downloadFromUrl(mp4Url, tempPath);

        // Upload na Supabase Storage (bucket 'songs')
        console.log("Slanje na Supabase...");
        const fileBuffer = fs.readFileSync(tempPath);
        const { error: upErr } = await supabase.storage
            .from("songs")
            .upload(videoName, fileBuffer, { contentType: 'video/mp4' });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("songs").getPublicUrl(videoName);

        // Čišćenje
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        res.json({ success: true, videoUrl: publicUrl });

    } catch (err) {
        console.error("YouTube Error:", err.message);
        res.status(500).json({ error: "YouTube is blocking this server. Use manual upload." });
    }
});

// 2. RUTA: RENDER DUET (TikTok 1080x1920 Fix)
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    console.log("\n--- TIKTOK DUET RENDER ---");
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;

    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(rendersDir, `final-${Date.now()}.mp4`);
    const finalDuration = parseFloat(duration) || 10;

    try {
        await downloadFromUrl(originalUrl, localOriginal);

        ffmpeg()
            .input(localOriginal)
            .input(reactionFile.path)
            .duration(finalDuration)
            .complexFilter([
                // ORIGINAL (Top)
                `[0:v]fps=30,setsar=1,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[v0]`,
                // REAKCIJA (Bottom) - iPhone fix bez transpose-a
                `[1:v]fps=30,format=yuv420p,setsar=1,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[v1]`,
                // VSTACK
                `[v0][v1]vstack=inputs=2,setsar=1[v_final]`,
                // AUDIO
                `[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.5[a0]`,
                `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=1.2[a1]`,
                `[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[a_final]`
            ])
            .outputOptions([
                "-map [v_final]", "-map [a_final]",
                "-c:v libx264", "-preset ultrafast", "-crf 24",
                "-pix_fmt yuv420p", "-movflags +faststart"
            ])
            .on("end", async () => {
                const storageName = `duets/tiktok-${Date.now()}.mp4`;
                const { error: upErr } = await supabase.storage
                    .from("videos")
                    .upload(storageName, fs.createReadStream(outputPath));
                
                if (upErr) throw upErr;

                const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(storageName);
                
                // Cleanup
                [localOriginal, reactionFile.path, outputPath].forEach(p => {
                    if (p && fs.existsSync(p)) fs.unlink(p, () => {});
                });

                res.json({ success: true, videoUrl: publicUrl });
            })
            .on("error", (err) => {
                console.error(err);
                res.status(500).json({ error: "Render failed" });
            })
            .save(outputPath);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/", (req, res) => res.send("TikTok Duet Server Online (RapidAPI)"));

app.listen(PORT, () => console.log(`Server spreman na portu ${PORT}`));