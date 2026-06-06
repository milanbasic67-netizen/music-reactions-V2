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

function getYTID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
}

async function downloadFromUrl(url, targetPath) {
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(targetPath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// --- RUTA: IMPORT YOUTUBE (Ovaj API koristi /get) ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const videoId = getYTID(url);
    
    console.log("\n--- [FINAL FIX] POKUŠAJ SA /get ENDPOINTOM ---");

    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    try {
        const options = {
            method: 'GET',
            url: 'https://youtube-media-downloader.p.rapidapi.com/v2/video/details',
            params: { videoId: videoId },
            headers: {
                'X-RapidAPI-Key': '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea',
                'X-RapidAPI-Host': 'youtube-media-downloader.p.rapidapi.com'
            }
        };

        const apiRes = await axios.request(options);
        const data = apiRes.data;

        // API obično vraća listu formata u 'formats' ili 'videos'
        let mp4Url = null;
        
        // Tražimo najbolji MP4 video
        if (data.videos && data.videos.items) {
            const best = data.videos.items.find(v => v.extension === "mp4" && v.hasAudio) || data.videos.items[0];
            mp4Url = best?.url;
        }

        if (!mp4Url) {
            console.log("DEBUG API RESPONSE:", JSON.stringify(data));
            throw new Error("API nije vratio direktan MP4 link.");
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
        console.error("ERROR:", err.response?.data || err.message);
        res.status(500).json({ error: "Import failed", details: err.message });
    }
});

// ... (render-duet ostaje isti) ...

app.listen(PORT, () => console.log(`Server Online - Cekam YouTube import`));