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

// --- MOĆNA FUNKCIJA ZA DOWNLOAD (Sa Tunnel Auth) ---
async function downloadFromUrl(url, targetPath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers: {
            // Šaljemo ključeve i tunelu, jer on to često traži da bi propustio saobraćaj
            'x-rapidapi-key': '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea',
            'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Referer': 'https://social-media-video-downloader.p.rapidapi.com/'
        }
    });

    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(targetPath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

function getYTID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
}

app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const videoId = getYTID(url);
    
    console.log("\n--- YOUTUBE IMPORT (TUNNEL AUTH BYPASS) ---");

    try {
        const options = {
            method: 'GET',
            url: 'https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details',
            params: {
                videoId: videoId,
                urlAccess: 'proxy', // PROMENA: Tražimo proxy pristup ako API to nudi
                renderableFormats: '720p,1080p',
                getTranscript: 'false'
            },
            headers: {
                'x-rapidapi-key': '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea',
                'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com'
            }
        };

        const apiRes = await axios.request(options);
        const data = apiRes.data;

        let mp4Url = null;
        if (data.contents && data.contents[0]?.videos) {
            const videos = data.contents[0].videos;
            // Biramo onaj koji u URL-u ima "tunnel" ili "api-v3"
            const best = videos.find(v => v.url.includes('tunnel')) || 
                         videos.find(v => v.label === "720p") || 
                         videos[0];
            mp4Url = best?.url;
        }

        if (!mp4Url) throw new Error("API nije vratio link.");

        const videoName = `yt-${Date.now()}.mp4`;
        const tempPath = path.join(uploadsDir, videoName);

        console.log("Skidanje preko Tunela...");
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
        console.error("Greška:", err.message);
        res.status(500).json({ error: "YouTube blokira Render server. Pokušajte manuelni upload.", details: err.message });
    }
});

// ... (render-duet ruta ostaje ista) ...

app.listen(PORT, () => console.log(`Server Online - Tunnel Auth Bypass Enabled`));