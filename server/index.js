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

// Funkcija za izvlačenje Video ID-a iz YouTube linka
function getYTID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
}

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

// --- RUTA: IMPORT YOUTUBE (VERZIJA 23 - V3 DETAILS) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const videoId = getYTID(url);
    
    console.log("\n--- YOUTUBE IMPORT (V3 VIDEO DETAILS) ---");
    console.log("Video ID:", videoId);

    if (!videoId) {
        return res.status(400).json({ error: "Nevažeći YouTube URL" });
    }

    try {
        const options = {
            method: 'GET',
            url: 'https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details',
            params: {
                videoId: videoId,
                urlAccess: 'normal',
                renderableFormats: '720p,highres',
                getTranscript: 'false'
            },
            headers: {
                'x-rapidapi-key': '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea',
                'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com'
            }
        };

        const apiRes = await axios.request(options);
        const data = apiRes.data;

        // Kod ovog API-ja linkovi su obično u formatu: data.formats.video
        let mp4Url = null;
        
        if (data.formats && data.formats.video) {
            // Tražimo najbolji format koji ima i video i audio
            const bestFormat = data.formats.video.find(f => f.quality === '720p' && f.hasAudio) || 
                             data.formats.video.find(f => f.hasAudio) ||
                             data.formats.video[0];
            mp4Url = bestFormat.url || bestFormat.link;
        }

        if (!mp4Url) {
            console.log("Struktura odgovora API-ja:", JSON.stringify(data).substring(0, 500));
            throw new Error("Nije pronađen direktan MP4 link u v3 odgovoru.");
        }

        const videoName = `yt-${Date.now()}.mp4`;
        const tempPath = path.join(uploadsDir, videoName);

        console.log("Preuzimanje fajla...");
        await downloadFromUrl(mp4Url, tempPath);

        console.log("Upload na Supabase...");
        const fileBuffer = fs.readFileSync(tempPath);
        const { error: upErr } = await supabase.storage
            .from("songs")
            .upload(videoName, fileBuffer, { contentType: 'video/mp4' });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("songs").getPublicUrl(videoName);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        res.json({ success: true, videoUrl: publicUrl });

    } catch (err) {
        console.error("Greška:", err.response?.data || err.message);
        res.status(500).json({ error: "Import failed", details: err.message });
    }
});

// --- RUTA: RENDER DUET (Standard) ---
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

app.listen(PORT, () => console.log(`Backend spreman - Verzija 23`));