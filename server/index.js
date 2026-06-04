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

// 1. Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// 2. Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 3. Folderi
const uploadsDir = path.join(__dirname, "uploads");
const rendersDir = path.join(__dirname, "renders");
[uploadsDir, rendersDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const upload = multer({ dest: uploadsDir });

// Pomoćna funkcija za download
async function downloadFile(url, targetPath) {
    const writer = fs.createWriteStream(targetPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// 4. Glavna ruta
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    console.log("\n--- TIKTOK DUET RENDER (16:9 Camera Input) ---");
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;

    if (!originalUrl || !reactionFile) {
        return res.status(400).json({ error: "Missing files" });
    }

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
                // ORIGINAL (Gore): Skaliraj na 540x480, kropuj centar
                `[0:v]fps=25,scale=540:480:force_original_aspect_ratio=increase,crop=540:480,setsar=1[v0]`,
                
                // REAKCIJA (Dole): Tvoj 16:9 snimak se skalira da popuni 540x480.
                // Pošto je tvoj snimak širok (16:9), FFmpeg će odseći levu i desnu stranu
                // tako da ti ostaneš u sredini vertikalnog TikTok prozora.
                `[1:v]fps=25,scale=540:480:force_original_aspect_ratio=increase,crop=540:480,setsar=1[v1]`,
                
                // Spajanje u vertikalni TikTok 9:16 (540x960)
                `[v0][v1]vstack=inputs=2[v_final]`,
                
                // Audio mix
                `[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.4[a0]`,
                `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=1.2[a1]`,
                `[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[a_final]`
            ])
            .outputOptions([
                "-map [v_final]",
                "-map [a_final]",
                "-c:v libx264",
                "-preset ultrafast",
                "-crf 28",
                "-threads 1",
                "-pix_fmt yuv420p",
                "-movflags +faststart"
            ])
            .on("progress", (p) => process.stdout.write(`Status: ${p.timemark} \r`))
            .on("error", (err) => {
                console.error("FFmpeg Error:", err.message);
                cleanup();
                res.status(500).json({ error: "Render failed" });
            })
            .on("end", async () => {
                console.log("\nRender uspešan. Upload na Supabase...");
                try {
                    const storageName = `duets/tiktok-${Date.now()}.mp4`;
                    const { error: upErr } = await supabase.storage
                        .from("videos")
                        .upload(storageName, fs.createReadStream(outputPath));
                    
                    if (upErr) throw upErr;

                    const { data: { publicUrl } } = supabase.storage
                        .from("videos")
                        .getPublicUrl(storageName);

                    cleanup();
                    res.json({ success: true, videoUrl: publicUrl });
                } catch (err) {
                    console.error("Upload Error:", err.message);
                    cleanup();
                    res.status(500).json({ error: "Upload failed" });
                }
            })
            .save(outputPath);

    } catch (err) {
        console.error("Server Error:", err);
        cleanup();
        res.status(500).json({ error: "Internal server error" });
    }

    function cleanup() {
        [localOriginal, reactionFile.path, outputPath].forEach(p => {
            if (p && fs.existsSync(p)) fs.unlink(p, () => {});
        });
    }
});

// Health check za Render
app.get("/", (req, res) => res.send("TikTok Duet Server is Online"));

app.listen(PORT, () => {
    console.log(`Backend spreman na portu ${PORT}`);
});