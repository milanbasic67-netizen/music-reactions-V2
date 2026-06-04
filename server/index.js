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

// 2. Supabase Setup
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 3. Folderi za privremene fajlove
const uploadsDir = path.join(__dirname, "uploads");
const rendersDir = path.join(__dirname, "renders");
[uploadsDir, rendersDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const upload = multer({ dest: uploadsDir });

// Pomoćna funkcija za download originalnog videa
async function downloadFile(url, targetPath) {
    const writer = fs.createWriteStream(targetPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// 4. Glavna ruta za renderovanje
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    console.log("\n--- TIKTOK FULL HD (1080x1920) RENDER ---");
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;

    if (!originalUrl || !reactionFile) {
        return res.status(400).json({ error: "Missing files" });
    }

    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(rendersDir, `final-${Date.now()}.mp4`);
    const finalDuration = parseFloat(duration) || 10;

    try {
        // Preuzmi originalni video na server
        await downloadFile(originalUrl, localOriginal);

        ffmpeg()
            .input(localOriginal)
            .input(reactionFile.path)
            .duration(finalDuration)
            .complexFilter([
                // ORIGINAL (Gornja polovina - 1080x960):
                // force_original_aspect_ratio=increase + crop osigurava da nema rastezanja
                // setsar=1 popravlja deformaciju oblika lica
                `[0:v]fps=30,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1[v0]`,
                
                // REAKCIJA (Donja polovina - 1080x960):
                // transpose=1: RUČNO OKREĆE VIDEO ZA 90 STEPENI (Fix za mobilnu kameru)
                // format=yuv420p: Garantuje kompatibilnost boja
                // setsar=1: Sprečava deformaciju snimka sa kamere
                `[1:v]fps=30,transpose=1,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960,setsar=1,format=yuv420p[v1]`,
                
                // Spajanje u vertikalni 9:16 (1080x1920)
                `[v0][v1]vstack=inputs=2,setsar=1[v_final]`,
                
                // Audio mix: Original tiši (0.4), Reakcija jača (1.2)
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

// Health check ruta
app.get("/", (req, res) => res.send("TikTok Duet Server is Online"));

app.listen(PORT, () => {
    console.log(`Backend spreman na portu ${PORT}`);
});