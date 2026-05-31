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

app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const uploadsDir = path.join(__dirname, "uploads");
const rendersDir = path.join(__dirname, "renders");
[uploadsDir, rendersDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const upload = multer({ storage: multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})});

app.post("/render-duet", upload.single("reaction"), async (req, res) => {
  const { originalUrl, duration } = req.body;
  const reactionFile = req.file;

  if (!originalUrl || !reactionFile) {
    return res.status(400).json({ error: "Missing required files" });
  }

  const outputPath = path.join(rendersDir, `duet-${Date.now()}.mp4`);
  const finalDuration = parseFloat(duration) || 15;

  ffmpeg()
    .input(originalUrl)
    .input(reactionFile.path)
    .duration(finalDuration)
    .complexFilter([
      // Skaliranje reakcije (720x1280) - Main Background
      {
        filter: "scale",
        options: "720:1280:force_original_aspect_ratio=increase,crop=720:1280",
        inputs: "1:v", outputs: "v1"
      },
      // Skaliranje originala (Overlay) - Manji prozor
      {
        filter: "scale",
        options: "300:-1",
        inputs: "0:v", outputs: "v0"
      },
      // Overlay pozicija
      {
        filter: "overlay",
        options: { x: 30, y: 30 },
        inputs: ["v1", "v0"], outputs: "vfinal"
      },
      // Audio miks (Smanjen original, pojačan mikrofon)
      { filter: "volume", options: "0.2", inputs: "0:a", outputs: "a0" },
      { filter: "volume", options: "1.5", inputs: "1:a", outputs: "a1" },
      { filter: "amix", options: { inputs: 2, duration: "first" }, inputs: ["a0", "a1"], outputs: "afinal" }
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
    .on("error", (err) => {
      console.error(err);
      res.status(500).json({ error: "FFmpeg error" });
    })
    .on("end", async () => {
      try {
        const storageName = `duets/${path.basename(outputPath)}`;
        const fileStream = fs.createReadStream(outputPath);

        const { error: uploadError } = await supabase.storage
          .from("videos")
          .upload(storageName, fileStream, {
            contentType: "video/mp4",
            duplex: 'half'
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(storageName);

        // Brisanje privremenih fajlova
        fs.unlink(reactionFile.path, () => {});
        fs.unlink(outputPath, () => {});

        res.json({ success: true, videoUrl: publicUrl });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Storage upload failed" });
      }
    })
    .save(outputPath);
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));