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

// 1. Osnovna podešavanja
app.use(cors({ origin: "*" }));
app.use(express.json());

// 2. Supabase klijent
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 3. Folderi za privremene fajlove
const uploadsDir = path.join(__dirname, "uploads");
const rendersDir = path.join(__dirname, "renders");

[uploadsDir, rendersDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 4. Multer konfiguracija (prihvata WebM snimak sa kamere)
const upload = multer({ 
    dest: uploadsDir,
    limits: { fileSize: 50 * 1024 * 1024 } // Limit 50MB
});

// Pomoćna funkcija za preuzimanje originalnog videa
async function downloadFile(url, targetPath) {
    console.log(`Preuzimam original: ${url}`);
    const writer = fs.createWriteStream(targetPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// 5. Glavna ruta za renderovanje
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    console.log("\n--- NOVI ZAHTEV ZA RENDER ---");
    
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;

    if (!originalUrl || !reactionFile) {
        console.error("Greška: Nedostaju parametri");
        return res.status(400).json({ error: "Missing originalUrl or reaction file" });
    }

    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(rendersDir, `final-${Date.now()}.mp4`);
    const finalDuration = parseFloat(duration) || 10;

    try {
        // KORAK 1: Download originala lokalno
        const startDown = Date.now();
        await downloadFile(originalUrl, localOriginal);
        console.log(`Download završen za: ${(Date.now() - startDown)/1000}s`);

        // KORAK 2: FFmpeg ultra-optimizovana obrada
        console.log("Pokrećem FFmpeg (Starter Plan Mode)...");
        
        ffmpeg()
            .input(localOriginal)
            .input(reactionFile.path)
            .duration(finalDuration)
            .complexFilter([
                // [0:v] je original, [1:v] je reakcija
                // Forsiramo 25 FPS i 360p širinu (visina 320 za svaki prozor)
                // setsar=1 fiksira probleme sa deformacijom slike
                `[0:v]fps=25,scale=360:320:force_original_aspect_ratio=increase,crop=360:320,setsar=1[v0]`,
                `[1:v]fps=25,scale=360:320:force_original_aspect_ratio=increase,crop=360:320,setsar=1[v1]`,
                
                // Vertikalno spajanje (vstack)
                `[v0][v1]vstack=inputs=2[v_stacked]`,
                
                // Audio miks (Smanjen original, pojačan mikrofon)
                `[0:a]volume=0.3[a0]`,
                `[1:a]volume=1.2[a1]`,
                `[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[afinal]`
            ])
            .outputOptions([
                "-map [v_stacked]",
                "-map [afinal]",
                "-c:v libx264",
                "-preset ultrafast", // Maksimalna brzina enkodovanja
                "-crf 32",           // Balans kvaliteta za brži render
                "-threads 1",         // Ograničenje na 1 nit čuva Shared CPU od blokade
                "-pix_fmt yuv420p",
                "-movflags +faststart"
            ])
            .on("start", (cmd) => {
                console.log("FFmpeg proces aktivan.");
            })
            .on("progress", (p) => {
                // Logujemo timemark (vreme) jer percent često ne radi kod strimova
                process.stdout.write(`Obrađeno: ${p.timemark} \r`);
            })
            .on("error", (err) => {
                console.error("\nFFmpeg Greška:", err.message);
                cleanup();
                res.status(500).json({ error: "Render failed" });
            })
            .on("end", async () => {
                console.log("\nRender završen! Krećem upload na Supabase...");

                try {
                    const storageName = `duets/final-${Date.now()}.mp4`;
                    const fileStream = fs.createReadStream(outputPath);

                    const { error: uploadError } = await supabase.storage
                        .from("videos")
                        .upload(storageName, fileStream, {
                            contentType: "video/mp4",
                            upsert: true
                        });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from("videos")
                        .getPublicUrl(storageName);

                    console.log("Uspeh! Video dostupan na:", publicUrl);
                    
                    cleanup();
                    res.json({ success: true, videoUrl: publicUrl });

                } catch (err) {
                    console.error("Upload Greška:", err.message);
                    cleanup();
                    res.status(500).json({ error: "Upload failed" });
                }
            })
            .save(outputPath);

    } catch (err) {
        console.error("Serverska Greška:", err.message);
        cleanup();
        res.status(500).json({ error: "Processing error" });
    }

    // Funkcija za čišćenje privremenih fajlova sa diska
    function cleanup() {
        const files = [localOriginal, reactionFile.path, outputPath];
        files.forEach(p => {
            if (p && fs.existsSync(p)) {
                fs.unlink(p, (err) => {});
            }
        });
    }
});

// Health check za Render.com
app.get("/", (req, res) => res.send("Duet Render Server Online"));

app.listen(PORT, () => {
    console.log(`Server pokrenut na portu ${PORT}`);
});