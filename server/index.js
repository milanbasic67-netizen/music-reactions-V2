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

// 1. CORS PODEŠAVANJA za
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
app.post(
  "/import-youtube",
  async (req, res) => {

    console.log(
      "IMPORT YOUTUBE:",
      req.body
    );

    res.json({

      ok: true,

      url:
        req.body.url,

    });

  }
);
app.post("/render-duet", upload.single("reaction"), async (req, res) => {
    // FORSIRANI LOGOVI ZA RENDER.COM DASHBOARD
    process.stdout.write("\n=== STIGAO NOVI ZAHTEV ZA RENDER ===\n");

    console.log("CONTENT TYPE:",req.headers["content-type"]
);
    const { originalUrl, duration } = req.body;
    console.log("BODY:", req.body);
    console.log("DURATION:", duration);
    const reactionFile = req.file;

    if (!originalUrl || !reactionFile) {
        console.error("GREŠKA: Nedostaju fajlovi ili URL");
        return res.status(400).json({ error: "Missing originalUrl or reaction file" });
    }

    console.log(`Original: ${originalUrl}`);
    console.log(`Reaction path: ${reactionFile.path}`);
    console.log(`Trajanje: ${duration}s`);

    const outputPath = path.join(rendersDir, `duet-${Date.now()}.mp4`);
    const finalDuration = parseFloat(duration) || 15;

    // FFmpeg PROCES
    console.log("Pokrećem FFmpeg...");
    
    ffmpeg()
        .input(originalUrl)
        .input(reactionFile.path)
        .duration(finalDuration + 0.5) // Mala margina
        .complexFilter([
            // 1. Skaliranje reakcije (Pozadina - 720x1280)
            {
                filter: "scale",
                options: "540:960:force_original_aspect_ratio=increase,crop=540:576",
                inputs: "1:v", outputs: "reaction"
            },
            // 2. Skaliranje originalnog videa (Overlay prozor - npr. širina 320)
            {
                filter: "scale",
                options: "540:384:force_original_aspect_ratio=increase,crop=540:384",
                inputs: "0:v", outputs: "original"
            },
            // 3. Postavljanje originala preko reakcije (x=40, y=40 od gornjeg levog ugla)
            {
    filter: "vstack",
    inputs: ["original", "reaction"],
    outputs: "vfinal"
},
            // 4. Audio miks (Original tiši 20%, Mikrofon jači 150%)
            { filter: "volume", options: "0.15", inputs: "0:a", outputs: "a0" },
            { filter: "volume", options: "1.8", inputs: "1:a", outputs: "a1" },
            { 
                filter: "amix", 
                options: { inputs: 2, duration: "first", dropout_transition: 2 }, 
                inputs: ["a0", "a1"], outputs: "afinal" 
            }
        ])
        .outputOptions([
            "-map [vfinal]",
            "-map [afinal]",
            "-c:v libx264",
            "-preset ultrafast", // Najbrže enkodovanje, bitno za slabije servere
            "-crf 32",           // Solidan kvalitet uz manji fajl
            "-pix_fmt yuv420p",
            "-threads 2",
            "-movflags +faststart"
        ])
        .on("start", (cmd) => {
            console.log("FFmpeg komanda pokrenuta!");
        })
        .on("progress", (p) => {
  console.log("FPS:",
    p.currentFps,
    "PERCENT:",
    p.percent);
        })
        .on("error", (err) => {
            console.error("FFmpeg Error:", err.message);
            // Čišćenje u slučaju greške
            if (fs.existsSync(reactionFile.path)) fs.unlinkSync(reactionFile.path);
            res.status(500).json({ error: "Render failed during processing" });
        })
        .on("end", async () => {
            console.log("Render završen lokalno. Krećem upload na Supabase...");

            try {
                const storageName = `duets/${path.basename(outputPath)}`;
                const fileStream = fs.createReadStream(outputPath);

                // Upload na Supabase korišćenjem Stream-a (štedi RAM)
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

                console.log("SVE ZAVRŠENO! URL:", publicUrl);

                // ČIŠĆENJE: Obavezno brišemo privremene fajlove da ne prepunimo disk na Renderu
                fs.unlink(reactionFile.path, (err) => { if (err) console.error("Greška pri brisanju raw fajla"); });
                fs.unlink(outputPath, (err) => { if (err) console.error("Greška pri brisanju rendera"); });

                res.json({
                    success: true,
                    videoUrl: publicUrl
                });

            } catch (err) {
                console.error("Storage Error:", err.message);
                res.status(500).json({ error: "Upload to Supabase failed" });
            }
        })
        .save(outputPath);
});

// HEALTH CHECK ZA RENDER
app.get("/", (req, res) => res.send("Duet Render Server is Running"));

app.listen(PORT, () => {
    console.log(`---`);
    console.log(`Server je aktivan na portu ${PORT}`);
    console.log(`Backend URL: ${process.env.APP_URL || 'Lokalno'}`);
    console.log(`---`);
});