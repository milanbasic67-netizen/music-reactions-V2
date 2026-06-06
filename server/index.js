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
[uploadsDir, rendersDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const upload = multer({ dest: uploadsDir });

// POMOĆNA FUNKCIJA: Čišćenje YouTube URL-a (Uzimanje samo Video ID-a)
function getYouTubeID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
}

async function downloadFromUrl(url, targetPath) {
    const writer = fs.createWriteStream(targetPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// 1. RUTA: IMPORT YOUTUBE (Poboljšana verzija)
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    console.log("\n--- YOUTUBE IMPORT ZAPOČET ---", url);

    const videoId = getYouTubeID(url);
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    try {
        // KORISTIMO STABILNIJI API (Social Media Video Downloader)
        // Napomena: Proveri na RapidAPI dashboardu da li je ovo tvoj 'Host'
        const options = {
            method: 'GET',
            url: 'https://social-media-video-downloader.p.rapidapi.com/smvd/get/all',
            params: { url: `https://www.youtube.com/watch?v=${videoId}` },
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'social-media-video-downloader.p.rapidapi.com'
            }
        };

        const apiRes = await axios.request(options);
        const data = apiRes.data;

        // API obično vraća listu linkova. Tražimo onaj koji je MP4 i ima najbolji kvalitet.
        const mp4Url = data.links?.find(l => l.extension === 'mp4' || l.quality.includes('720'))?.link || data.links?.[0]?.link;

        if (!mp4Url) throw new Error("API nije pronašao MP4 link");

        const videoName = `yt-${Date.now()}.mp4`;
        const tempPath = path.join(uploadsDir, videoName);

        console.log("Skidam MP4 sa API servera...");
        await downloadFromUrl(mp4Url, tempPath);

        console.log("Slanje na Supabase...");
        const fileBuffer = fs.readFileSync(tempPath);
        const { error: upErr } = await supabase.storage
            .from("songs")
            .upload(videoName, fileBuffer, { contentType: 'video/mp4' });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("songs").getPublicUrl(videoName);

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        res.json({ success: true, videoUrl: publicUrl });

    } catch (err) {
        console.error("YouTube Error:", err.response?.data || err.message);
        res.status(500).json({ error: "RapidAPI Error or YouTube blocked. Use manual upload." });
    }
});

// 2. RUTA: RENDER DUET (Bez promena)
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    // ... tvoj postojeći render-duet kod ...
    // (Zadrži sve isto kao u prošloj ispravci)
});

app.listen(PORT, () => console.log(`Server Online na portu ${PORT}`));