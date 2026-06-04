const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. CORS PODEŠAVANJA
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// 2. SUPABASE KLIJENT
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 3. PROVERA I KREIRANJE FOLDERA
const uploadsDir = path.join(__dirname, "uploads");
const rendersDir = path.join(__dirname, "renders");

[uploadsDir, rendersDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Folder kreiran: ${dir}`);
    }
});

// 4. MULTER KONFIGURACIJA
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `raw-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// 5. RUTA ZA RENDER
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    process.stdout.write("\n=== STIGAO NOVI ZAHTEV ZA RENDER ===\n");
    
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;

    if (!originalUrl || !reactionFile) {
        console.error("GREŠKA: Nedostaju fajlovi ili URL");
        return res.status(400).json({ error: "Missing originalUrl or reaction file" });
    }

    const outputPath = path.join(rendersDir, `duet-${Date.now()}.mp4`);
    const finalDuration = parseFloat(duration) || 15;

    console.log("Pokrećem FFmpeg za vertikalni split-screen...");
    
    ffmpeg()
        .input(originalUrl)
        .input(reactionFile.path)
        .duration(finalDuration + 0.5)
        .complexFilter([
            // 1. Gornji video (Original) - Skaliraj na 720x640 i kropuj centar
            {
                filter: "scale",
                options: "720:640:force_original_aspect_ratio=increase,crop=720:640",
                inputs: "0:v",
                outputs: "v0_scaled"
            },
            // 2. Donji video (Reakcija) - Skaliraj na 720x640 i kropuj centar
            {
                filter: "scale",
                options: "720:640:force_original_aspect_ratio=increase,crop=720:640",
                inputs: "1:v",
                outputs: "v1_scaled"
            },
            // 3. Vertikalno spajanje (vstack) - v0 iznad v1
            {
                filter: "vstack",
                options: { inputs: 2 },
                inputs: ["v0_scaled", "v1_scaled"],
                outputs: "vfinal"
            },
            // 4. Audio obrada (Original 20%, Mikrofon 150%)
            { filter: "volume", options: "0.2", inputs: "0:a", outputs: "a0" },
            { filter: "volume", options: "1.5", inputs: "1:a", outputs: "a1" },
            { 
                filter: "amix", 
                options: { inputs: 2, duration: "first", dropout_transition: 2 }, 
                inputs: ["a0", "a1"], 
                outputs: "afinal" 
            }
        ])
        .outputOptions([
            "-map [vfinal]",
            "-map [afinal]",
            "-c:v libx264",
            "-preset ultrafast", 
            "-crf 28",           
            "-pix_fmt yuv420p",
            "-movflags +faststart"
        ])
        .on("start", (cmd) => {
            console.log("FFmpeg proces započet.");
        })
        .on("progress", (progress) => {
            if (progress.percent) {
                console.log(`Progress: ${Math.round(progress.percent)}%`);
            }
        })
        .on("error", (err) => {
            console.error("FFmpeg Error:", err.message);
            if (fs.existsSync(reactionFile.path)) fs.unlinkSync(reactionFile.path);
            res.status(500).json({ error: "Render failed" });
        })
        .on("end", async () => {
            console.log("Render završen. Upload na Supabase...");

            try {
                const storageName = `duets/${path.basename(outputPath)}`;
                const fileStream = fs.createReadStream(outputPath);

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("videos")
                    .upload(storageName, fileStream, {
                        contentType: "video/mp4",
                        duplex: 'half',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from("videos")
                    .getPublicUrl(storageName);

                // Brisanje fajlova
                fs.unlink(reactionFile.path, (err) => {});
                fs.unlink(outputPath, (err) => {});

                res.json({ success: true, videoUrl: publicUrl });

            } catch (err) {
                console.error("Storage Error:", err.message);
                res.status(500).json({ error: "Upload failed" });
            }
        })
        .save(outputPath);
});

app.get("/", (req, res) => res.send("Render Server Online"));

app.listen(PORT, () => {
    console.log(`Server aktivan na portu ${PORT}`);
});