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

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const uploadsDir = path.join(__dirname, "uploads");
const rendersDir = path.join(__dirname, "renders");
[uploadsDir, rendersDir].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir); });

const upload = multer({ dest: uploadsDir });

// DETALJAN DOWNLOAD LOG
async function downloadFile(url, targetPath) {
    console.log(`Započinjem download: ${url}`);
    const writer = fs.createWriteStream(targetPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', () => {
            console.log("Download završen uspešno.");
            resolve();
        });
        writer.on('error', reject);
    });
}

app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    console.log("--- NOVI ZAHTEV ---");
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;

    if (!originalUrl || !reactionFile) return res.status(400).send("Fale podaci");

    const localOrig = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(rendersDir, `final-${Date.now()}.mp4`);
    const finalDuration = parseFloat(duration) || 10;

    try {
        // 1. DOWNLOAD (Logujemo vreme)
        const startDown = Date.now();
        await downloadFile(originalUrl, localOrig);
        console.log(`Download trajao: ${(Date.now() - startDown)/1000}s`);

        // 2. FFmpeg (Max optimizacija za Starter plan)
        console.log("Pokrećem FFmpeg (Ultrafast mode)...");
        
        ffmpeg()
            .input(localOrig)
            .input(reactionFile.path)
            .duration(finalDuration)
            .complexFilter([
                // Smanjujemo na 360p (širina) jer Shared CPU ne može da nosi 720p brzo
                // setsar=1 popravlja aspect ratio probleme koji koče procesor
                `[0:v]scale=360:640:force_original_aspect_ratio=increase,crop=360:640,setsar=1[v0]`,
                `[1:v]scale=360:640:force_original_aspect_ratio=increase,crop=360:640,setsar=1[v1]`,
                `[v0][v1]vstack=inputs=2[vfinal]`
            ])
            .outputOptions([
                "-map [vfinal]",
                "-c:v libx264",
                "-preset ultrafast", // NAJBITNIJE: žrtvujemo veličinu fajla za brzinu
                "-crf 28",
                "-tune fastdecode",   // Optimizuje za brže dekodiranje frejmova
                "-threads 1",         // OGRANIČAVAMO na 1 nit da Shared CPU ne "poludi"
                "-pix_fmt yuv420p"
            ])
            .on("start", (cmd) => console.log("FFmpeg komanda pokrenuta."))
            .on("progress", (p) => {
                // Ako p.percent nije definisan, logujemo bar timestampe
                console.log(`Render progres: ${p.percent ? Math.round(p.percent) + '%' : p.timemark}`);
            })
            .on("error", (err) => {
                console.error("FFmpeg Error:", err.message);
                cleanup();
                res.status(500).json({ error: err.message });
            })
            .on("end", async () => {
                console.log("Render gotov. Krećem upload...");
                try {
                    const fileStream = fs.createReadStream(outputPath);
                    const storageName = `duets/final-${Date.now()}.mp4`;
                    
                    const { error: upErr } = await supabase.storage
                        .from("videos")
                        .upload(storageName, fileStream, { contentType: "video/mp4" });

                    if (upErr) throw upErr;

                    const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(storageName);
                    
                    console.log("Gotovo! URL:", publicUrl);
                    cleanup();
                    res.json({ success: true, videoUrl: publicUrl });
                } catch (e) {
                    console.error("Upload Error:", e);
                    cleanup();
                    res.status(500).send("Upload failed");
                }
            })
            .save(outputPath);

    } catch (err) {
        console.error("Glavna greška:", err);
        cleanup();
        res.status(500).send(err.message);
    }

    function cleanup() {
        [localOrig, reactionFile.path, outputPath].forEach(p => {
            if (p && fs.existsSync(p)) fs.unlink(p, () => {});
        });
    }
});

app.listen(PORT, () => console.log(`Starter Server na ${PORT}`));