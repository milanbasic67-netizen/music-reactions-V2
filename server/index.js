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

// POMOĆNA FUNKCIJA: Uzima samo Video ID da izbegne 404 greške sa listama
function cleanYoutubeUrl(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    const id = (match && match[7].length == 11) ? match[7] : null;
    return id ? `https://www.youtube.com/watch?v=${id}` : url;
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

// 1. RUTA: IMPORT YOUTUBE (Koristi tvoj RapidAPI ključ)
app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const cleanUrl = cleanYoutubeUrl(url);
    
    console.log("\n--- YOUTUBE IMPORT ZAPOČET ---");
    console.log("Original URL:", url);
    console.log("Clean URL:", cleanUrl);

    try {
        const options = {
            method: 'GET',
            url: 'https://youtube-video-downloader-cli.p.rapidapi.com/video',
            params: { url: cleanUrl },
            headers: {
                'X-RapidAPI-Key': '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea',
                'X-RapidAPI-Host': 'youtube-video-downloader-cli.p.rapidapi.com'
            }
        };

        const apiRes = await axios.request(options);
        const videoData = apiRes.data;

        // API obično vraća listu formata. Tražimo najbolji MP4.
        let mp4Url = null;
        if (videoData.formats && Array.isArray(videoData.formats)) {
            const bestFormat = videoData.formats.find(f => (f.ext === 'mp4' || f.container === 'mp4') && f.url);
            mp4Url = bestFormat ? bestFormat.url : null;
        }
        
        // Fallback ako je URL direktno u korenu objekta
        if (!mp4Url) mp4Url = videoData.url;

        if (!mp4Url) throw new Error("Nije pronađen direktan link do MP4 fajla.");

        const videoName = `yt-${Date.now()}.mp4`;
        const tempPath = path.join(uploadsDir, videoName);

        console.log("Skidam MP4 na server...");
        await downloadFromUrl(mp4Url, tempPath);

        console.log("Slanje na Supabase Storage...");
        const fileBuffer = fs.readFileSync(tempPath);
        const { error: upErr } = await supabase.storage
            .from("songs")
            .upload(videoName, fileBuffer, { contentType: 'video/mp4' });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from("songs").getPublicUrl(videoName);

        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        console.log("Uspeh! Video URL:", publicUrl);
        res.json({ success: true, videoUrl: publicUrl });

    } catch (err) {
        console.error("YouTube Error:", err.response?.data || err.message);
        res.status(500).json({ 
            error: "Greška pri uvozu.",
            details: err.message 
        });
    }
});

// 2. RUTA: RENDER DUET (TikTok 1080x1920)
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
                // Original - Top
                `[0:v]fps=30,setsar=1,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[v0]`,
                // Reakcija - Bottom
                `[1:v]fps=30,format=yuv420p,setsar=1,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[v1]`,
                // Vertikalni spoj
                `[v0][v1]vstack=inputs=2,setsar=1[v_final]`,
                // Audio mix
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
                
                [localOriginal, reactionFile.path, outputPath].forEach(p => {
                    if (p && fs.existsSync(p)) fs.unlink(p, () => {});
                });

                res.json({ success: true, videoUrl: publicUrl });
            })
            .on("error", (err) => {
                console.error("FFmpeg Error:", err);
                res.status(500).json({ error: "Render failed" });
            })
            .save(outputPath);

    } catch (err) {
        console.error("Server Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/", (req, res) => res.send("TikTok Duet Server Aktivan"));

app.listen(PORT, () => console.log(`Server radi na portu ${PORT}`));