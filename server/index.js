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

// 1. CORS & Middleware
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

// 4. Multer za reakciju
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `reaction-${Date.now()}.webm`)
});
const upload = multer({ storage });

// POMOĆNA FUNKCIJA ZA DOWNLOAD ORIGINALA
async function downloadFile(url, targetPath) {
    const writer = fs.createWriteStream(targetPath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// 5. RENDER RUTA
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    process.stdout.write("\n=== NOVI ZAHTEV (OPTIMIZOVAN) ===\n");
    
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;

    if (!originalUrl || !reactionFile) {
        return res.status(400).json({ error: "Nedostaju fajlovi" });
    }

    const localOriginalPath = path.join(uploadsDir, `original-${Date.now()}.mp4`);
    const outputPath = path.join(rendersDir, `final-${Date.now()}.mp4`);
    const finalDuration = parseFloat(duration) || 10;

    try {
        // KORAK 1: Download originala (ovo drastično ubrzava FFmpeg)
        console.log("Preuzimam originalni video...");
        await downloadFile(originalUrl, localOriginalPath);

        // KORAK 2: FFmpeg obrada
        console.log("Pokrećem ultra-brzi render (480p)...");
        
        ffmpeg()
            .input(localOriginalPath)
            .input(reactionFile.path)
            .duration(finalDuration + 0.5)
            .complexFilter([
                // Skaliranje oba videa na 480x426 (ukupno 480x852 vertikalno)
                // Force_original_aspect_ratio+crop sprečava razvlačenje slike
                {
                    filter: "scale",
                    options: "480:426:force_original_aspect_ratio=increase,crop=480:426",
                    inputs: "0:v", outputs: "v0"
                },
                {
                    filter: "scale",
                    options: "480:426:force_original_aspect_ratio=increase,crop=480:426",
                    inputs: "1:v", outputs: "v1"
                },
                // Spajanje jedan iznad drugog
                {
                    filter: "vstack",
                    options: { inputs: 2 },
                    inputs: ["v0", "v1"], outputs: "vfinal"
                },
                // Audio miks
                { filter: "volume", options: "0.3", inputs: "0:a", outputs: "a0" },
                { filter: "volume", options: "1.2", inputs: "1:a", outputs: "a1" },
                { 
                    filter: "amix", 
                    options: { inputs: 2, duration: "first" }, 
                    inputs: ["a0", "a1"], outputs: "afinal" 
                }
            ])
            .outputOptions([
                "-map [vfinal]",
                "-map [afinal]",
                "-c:v libx264",
                "-preset superfast", // Ključno za brzinu na Render.com
                "-crf 30",           // Balans kvaliteta i brzine
                "-threads 2",        // Da ne uguši CPU besplatnog servera
                "-pix_fmt yuv420p",
                "-movflags +faststart"
            ])
            .on("progress", (p) => {
                if (p.percent) console.log(`Progres: ${Math.round(p.percent)}%`);
            })
            .on("error", (err) => {
                console.error("FFmpeg Error:", err.message);
                cleanup();
                res.status(500).json({ error: "Render neuspešan" });
            })
            .on("end", async () => {
                console.log("Render gotov. Šaljem na Supabase...");
                try {
                    const storageName = `duets/${path.basename(outputPath)}`;
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

                    console.log("Sve završeno uspešno!");
                    cleanup();
                    res.json({ success: true, videoUrl: publicUrl });

                } catch (err) {
                    console.error("Upload Error:", err);
                    cleanup();
                    res.status(500).json({ error: "Upload neuspešan" });
                }
            })
            .save(outputPath);

    } catch (err) {
        console.error("Glavna greška:", err);
        cleanup();
        res.status(500).json({ error: "Greška u pripremi fajlova" });
    }

    // Funkcija za čišćenje diska
    function cleanup() {
        [localOriginalPath, reactionFile.path, outputPath].forEach(p => {
            if (p && fs.existsSync(p)) fs.unlink(p, () => {});
        });
    }
});

app.get("/", (req, res) => res.send("Render Server Online"));

app.listen(PORT, () => console.log(`Server na portu ${PORT}`));