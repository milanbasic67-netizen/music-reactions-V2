const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");

// Funkcija za čišćenje SVIH starih fajlova pri startu (da oslobodimo Render disk)
const cleanAllUploads = () => {
    if (fs.existsSync(uploadsDir)) {
        fs.readdirSync(uploadsDir).forEach(file => {
            try { fs.unlinkSync(path.join(uploadsDir, file)); } catch(e) {}
        });
    } else {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
};
cleanAllUploads();

const upload = multer({ dest: uploadsDir });

function getYTID(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length == 11) ? match[7] : null;
}

app.post("/import-youtube", async (req, res) => {
    const { url } = req.body;
    const videoId = getYTID(url);
    const RAPID_KEY = '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea';

    const timestamp = Date.now();
    const videoPath = path.join(uploadsDir, `v-${timestamp}.mp4`);
    const audioPath = path.join(uploadsDir, `a-${timestamp}.mp3`);
    const mergedPath = path.join(uploadsDir, `m-${timestamp}.mp4`);

    let ffmpegProcess = null;

    const cleanup = () => {
        if (ffmpegProcess) { try { ffmpegProcess.kill(); } catch(e) {} }
        [videoPath, audioPath, mergedPath].forEach(p => {
            if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch(e) {} }
        });
    };

    try {
        const apiRes = await axios.get('https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details', {
            params: { videoId, urlAccess: 'proxied' },
            headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com' }
        });

        const contents = apiRes.data?.contents?.[0];
        const vList = contents?.videos || [];
        const aList = contents?.audios || [];
        const videoObj = vList.find(v => v.label === "360p") || vList[vList.length - 1];
        const audioObj = aList[0];

        // Download sa timeout-om
        const download = async (url, dest) => {
            const writer = fs.createWriteStream(dest);
            const response = await axios({ url, method: 'GET', responseType: 'stream', timeout: 30000 });
            response.data.pipe(writer);
            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        };

        await Promise.all([download(videoObj.url, videoPath), download(audioObj.url, audioPath)]);

        // FFmpeg proces
        ffmpegProcess = ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions(["-c:v copy", "-c:a aac", "-shortest"])
            .on("error", (err) => {
                console.log("FFmpeg error or killed");
                cleanup();
                if (!res.headersSent) res.status(500).json({ error: "Merge failed" });
            })
            .on("end", async () => {
                try {
                    const stats = fs.statSync(mergedPath);
                    const videoName = `yt-${timestamp}.mp4`;
                    
                    await axios.post(`${process.env.SUPABASE_URL}/storage/v1/object/songs/${videoName}`, fs.createReadStream(mergedPath), {
                        headers: {
                            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                            'API-Key': process.env.SUPABASE_SERVICE_ROLE_KEY,
                            'Content-Type': 'video/mp4',
                            'Content-Length': stats.size
                        }
                    });

                    res.json({ 
                        success: true, 
                        videoUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/songs/${videoName}`,
                        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                        title: apiRes.data.metadata?.title || "YouTube Song"
                    });
                } catch (e) {
                    if (!res.headersSent) res.status(500).json({ error: "Upload failed" });
                } finally {
                    cleanup();
                }
            });
        
        ffmpegProcess.save(mergedPath);

        // SIGURNOSNI TAJMAUT: Ako se ne završi za 60 sekundi, ugasi ga
        setTimeout(() => {
            if (!res.headersSent) {
                cleanup();
                res.status(500).json({ error: "Server timeout - process killed to save memory" });
            }
        }, 65000);

    } catch (err) {
        cleanup();
        if (!res.headersSent) res.status(500).json({ error: "Process failed" });
    }
});

// Duet ruta sa istom logikom čišćenja
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    const reactionFile = req.file;
    if(!reactionFile) return res.status(400).json({error: "No file"});

    const localOriginal = path.join(uploadsDir, `o-${Date.now()}.mp4`);
    const outputPath = path.join(uploadsDir, `f-${Date.now()}.mp4`);

    try {
        const resp = await axios({ url: req.body.originalUrl, method: 'GET', responseType: 'stream' });
        const writer = fs.createWriteStream(localOriginal);
        resp.data.pipe(writer);
        await new Promise((res) => { writer.on('finish', res); });

        ffmpeg()
            .input(localOriginal).input(reactionFile.path).duration(parseFloat(req.body.duration) || 10)
            .complexFilter([
                `[0:v]fps=20,scale=480:360:force_original_aspect_ratio=increase,crop=480:360[v0]`,
                `[1:v]fps=20,scale=480:360:force_original_aspect_ratio=increase,crop=480:360[v1]`,
                `[v0][v1]vstack=inputs=2[v_final]`,
                `[0:a]volume=0.6[a0]`, `[1:a]highpass=f=200,volume=3.0[a1]`, `[a0][a1]amix=inputs=2:duration=first[a_final]`
            ])
            .outputOptions(["-map [v_final]", "-map [a_final]", "-c:v libx264", "-preset ultrafast", "-crf 32"])
            .on("end", async () => {
                const storageName = `duets/t-${Date.now()}.mp4`;
                await axios.post(`${process.env.SUPABASE_URL}/storage/v1/object/videos/${storageName}`, fs.createReadStream(outputPath), {
                    headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'API-Key': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'video/mp4' }
                });
                [localOriginal, reactionFile.path, outputPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
                res.json({ success: true, videoUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/videos/${storageName}` });
            })
            .on("error", () => {
                [localOriginal, reactionFile.path, outputPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
                res.status(500).json({ error: "Fail" });
            })
            .save(outputPath);
    } catch (err) { res.status(500).json({ error: "Error" }); }
});

app.listen(PORT, () => console.log(`Safe-Mode Server Running`));