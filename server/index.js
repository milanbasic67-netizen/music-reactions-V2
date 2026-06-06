const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const ytdl = require("@distube/ytdl-core"); // DODATO ZA YOUTUBE
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

// --- POMOĆNA FUNKCIJA ZA YOUTUBE DOWNLOAD ---
async function downloadYoutube(url, targetPath) {
    return new Promise((resolve, reject) => {
        const stream = ytdl(url, { 
            quality: 'highestvideo',
            filter: format => format.container === 'mp4' && format.hasAudio && format.hasVideo
        });

        const fileStream = fs.createWriteStream(targetPath);
        stream.pipe(fileStream);

        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
        stream.on('error', reject);
    });
}

// --- NOVA RUTA: IMPORT YOUTUBE ---
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    console.log("\n--- YOUTUBE IMPORT ZAPOČET ---", url);

    if (!url) return res.status(400).json({ error: "Missing YouTube URL" });

    const videoName = `yt-${Date.now()}.mp4`;
    const tempPath = path.join(uploadsDir, videoName);

    try {
        // 1. Skidanje sa YouTube-a
        console.log("Skidam video sa YT...");
        await downloadYoutube(url, tempPath);

        // 2. Upload na Supabase Storage (bucket 'songs')
        console.log("Uploadujem na Supabase...");
        const fileBuffer = fs.readFileSync(tempPath);
        
        const { error: upErr } = await supabase.storage
            .from("songs")
            .upload(videoName, fileBuffer, {
                contentType: 'video/mp4'
            });

        if (upErr) throw upErr;

        // 3. Dobijanje Public URL-a
        const { data: { publicUrl } } = supabase.storage
            .from("songs")
            .getPublicUrl(videoName);

        // Brisanje temp fajla
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        console.log("Uspešno uvezen YouTube video:", publicUrl);
        res.json({ success: true, videoUrl: publicUrl });

    } catch (err) {
        console.error("YouTube Import Error:", err.message);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        res.status(500).json({ error: "Failed to import YouTube video" });
    }
});

// ... (ostatak koda za /render-duet ostaje isti) ...

app.listen(PORT, () => {
    console.log(`Backend Online na portu ${PORT} sa YouTube podrškom`);
});