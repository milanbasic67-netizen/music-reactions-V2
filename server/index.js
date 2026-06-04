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
        // KORAK 1: Download originala lokal