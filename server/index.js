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

async function downloadFile(url, targetPath) {
    const writer = fs.createWriteStream(targetPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    console.log("\n--- IPHONE WEBM FIX RENDER ---");
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;

    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(rendersDir, `final-${Date.now()}.mp4`);
    const finalDuration = parseFloat(duration) || 10;

    try {
        await downloadFile(originalUrl, localOriginal);

        ffmpeg()
            .input(localOriginal)
            .input(reactionFile.path)
            .duration(finalDuration)
            .complexFilter([
                // 1. ORIGINAL (Gornji deo)
                `[0:v]fps=30,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[v0]`,
                
                // 2. REAKCIJA (Donji deo - IPHONE FIX):
                // Koristimo 'scale=1080:960' ali BEZ ručnog transpose-a.
                // Ključ je 'setsar=1' koji resetuje iPhone-ovu deformaciju piksela.
                // format=yuv420p rešava probleme sa bojama i kompatibilnošću.
                `[1:v]fps=30,format=yuv420p,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[v1]`,
                
                // 3. Spajanje u vertikalni TikTok 9:16 (1080x1920)
                `[v0][v1]vstack=inputs=2,setsar=1[v_final]`,
                
                // 4. Audio mix
                `[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.4[a0]`,
                `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=1.2[a1]`,
                `[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[a_final]`
            ])
            .outputOptions([
                "-map [v_final]",
                "-map [a_final]",
                "-c:v libx264",
                "-preset ultrafast",
                "-crf 24",
                "-threads 1",
                "-pix_fmt yuv420p",
                "-movflags +faststart"
            ])
            .on("end", async () => {
                try {
                    const storageName = `duets/tiktok-${Date.now()}.mp4`;
                    const { error: upErr } = await supabase.storage.from("videos").upload(storageName, fs.createReadStream(outputPath));
                    if (upErr) throw upErr;
                    const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(storageName);
                    cleanup();
                    res.json({ success: true, videoUrl: publicUrl });
                } catch (err) {
                    cleanup();
                    res.status(500).json({ error: "Upload failed" });
                }
            })
            .save(outputPath);

    } catch (err) {
        console.error(err);
        cleanup();
        res.status(500).json({ error: "Server error" });
    }

    function cleanup() {
        [localOriginal, reactionFile.path, outputPath].forEach(p => { if (p && fs.existsSync(p)) fs.unlink(p, () => {}); });
    }
});

app.listen(PORT, () => console.log(`iPhone-Ready Server Online na portu ${PORT}`));