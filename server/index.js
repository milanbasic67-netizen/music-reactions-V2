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
    console.log(`Download: ${url}`);
    const writer = fs.createWriteStream(targetPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    console.log("\n--- RENDER START (NO-STRETCH MODE) ---");
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;

    if (!originalUrl || !reactionFile) return res.status(400).json({ error: "Missing files" });

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
                // [0:v] ORIGINAL VIDEO:
                // 1. Skaliraj na širinu 360, visinu izračunaj proporcionalno
                // 2. Odseci (crop) tačno 360x320 iz samog centra (0:320:0:(ih-320)/2)
                // 3. setsar=1 osigurava kvadratne piksele (nema izduživanja)
                `[0:v]fps=25,scale=360:-1,crop=360:320:0:(ih-320)/2,setsar=1[v0]`,

                // [1:v] REAKCIJA (KAMERA):
                // Ista logika: širina 360, proporcionalna visina, pa krop centra
                `[1:v]fps=25,scale=360:-1,crop=360:320:0:(ih-320)/2,setsar=1[v1]`,

                // Vertikalno spajanje
                `[v0][v1]vstack=inputs=2[v_stacked]`,

                // Audio miks
                `[0:a]volume=0.3[a0]`,
                `[1:a]volume=1.2[a1]`,
                `[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[afinal]`
            ])
            .outputOptions([
                "-map [v_stacked]",
                "-map [afinal]",
                "-c:v libx264",
                "-preset ultrafast",
                "-crf 28",
                "-threads 1",
                "-pix_fmt yuv420p",
                "-movflags +faststart"
            ])
            .on("progress", (p) => process.stdout.write(`Vreme: ${p.timemark} \r`))
            .on("error", (err) => {
                console.error("FFmpeg Error:", err.message);
                cleanup();
                res.status(500).json({ error: "Render failed" });
            })
            .on("end", async () => {
                console.log("\nRender završen bez izduživanja slike.");
                try {
                    const storageName = `duets/final-${Date.now()}.mp4`;
                    const fileStream = fs.createReadStream(outputPath);
                    const { error: upErr } = await supabase.storage.from("videos").upload(storageName, fileStream);
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

app.get("/", (req, res) => res.send("No-Stretch Render Server Online"));
app.listen(PORT, () => console.log(`Server na portu ${PORT}`));