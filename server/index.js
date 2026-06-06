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
    const writer = fs.createWriteStream(targetPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// --- RUTA: IMPORT YOUTUBE ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const videoId = getYTID(url);
    const cleanUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
    
    console.log("\n--- [VERZIJA 4] PROBA ENDPOINTA /all ---");
    console.log("Cilj:", cleanUrl);

    try {
        const options = {
            method: 'GET',
            // POKUŠAVAMO SA /all (Bez /smvd/get/)
            url: 'https://social-media-video-downloader.p.rapidapi.com/all',
            params: { url: cleanUrl },
            headers: {
                'X-RapidAPI-Key': '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea',
                'X-RapidAPI-Host': 'social-media-video-downloader.p.rapidapi.com'
            }
        };

        const apiRes = await axios.request(options);
        const data = apiRes.data;

        let mp4Url = null;

        // Provera formata iz tvog API odgovora
        if (data.contents && data.contents[0]?.videos) {
            const videos = data.contents[0].videos;
            const best = videos.find(v => v.label === "720p" && v.metadata.mime_type.includes("mp4")) ||
                         videos.find(v => v.metadata.mime_type.includes("mp4"));
            mp4Url = best?.url;
        } else if (data.links) {
            mp4Url = data.links.find(l => l.extension === 'mp4')?.link;
        }

        if (!mp4Url) {
            console.log("DEBUG - API Response:", JSON.stringify(data));
            throw new Error("API nije vratio MP4 link.");
        }

        const videoName = `yt-${Date.now()}.mp4`;
        const tempPath = path.join(uploadsDir, videoName);

        console.log("Skidanje...");
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
        console.error("GREŠKA U VERZIJI 4:", err.response?.data || err.message);
        res.status(500).json({ error: "Import failed", details: err.message });
    }
});

// --- RUTA: RENDER DUET ---
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    // ... (ovaj deo koda je isti kao pre, ne menjaj ga) ...
});

app.listen(PORT, () => console.log(`Server V4 spreman na portu ${PORT}`));