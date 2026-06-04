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
    console.log("\n--- RENDER START (STABLE MODE) ---");
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;

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
                // ORIGINAL: Skaliraj na 360 širinu, osiguraj parnu visinu, kropuj centar 360x320
                `[0:v]fps=25,scale=360:trunc(ow/a/2)*2,crop=360:320:0:(ih-320)/2,setsar=1[v0]`,
                // REAKCIJA: Ista logika
                `[1:v]fps=25,scale=360:trunc(ow/a/2)*2,crop=360:320:0:(ih-320)/2,setsar=1[v1]`,
                
                // Spajanje videa
                `[v0][v1]vstack=inputs=2[v_stacked]`,

                // AUDIO: amix može da pukne ako ulazi nisu isti. 
                // Dodajemo aresample=44100 da ih izjednačimo pre miksa.
                `[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.3[a0]`,
                `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=1.2[a1]`,
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
            .on("start", (cmd) => console.log("FFmpeg započeo..."))
            .on("progress", (p) => process.stdout.write(`Progres: ${p.timemark} \r`))
            .on("error", (err) => {
                console.error("\nFFmpeg Error:", err.message);
                // Ako amix pukne, pokušavamo render BEZ audio miksa (samo sa originalnim zvukom)
                console.log("Pokušavam fallback render (samo originalni audio)...");
                fallbackRender(localOriginal, reactionFile.path, outputPath, finalDuration, res);
            })
            .on("end", async () => {
                console.log("\nRender uspešan.");
                await handleSupabaseUpload(outputPath, res);
            })
            .save(outputPath);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }

    // --- POMOĆNE FUNKCIJE UNUTAR RUTE ---

    async function handleSupabaseUpload(filePath, response) {
        try {
            const storageName = `duets/final-${Date.now()}.mp4`;
            const fileStream = fs.createReadStream(filePath);
            const { error: upErr } = await supabase.storage.from("videos").upload(storageName, fileStream);
            if (upErr) throw upErr;
            const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(storageName);
            cleanup();
            response.json({ success: true, videoUrl: publicUrl });
        } catch (err) {
            cleanup();
            response.status(500).json({ error: "Upload failed" });
        }
    }

    function fallbackRender(orig, react, out, dur, response) {
        // Ovaj render se pokreće ako prvi pukne zbog audia (npr. mikrofon nije radio)
        ffmpeg()
            .input(orig)
            .input(react)
            .duration(dur)
            .complexFilter([
                `[0:v]fps=25,scale=360:trunc(ow/a/2)*2,crop=360:320:0:(ih-320)/2,setsar=1[v0]`,
                `[1:v]fps=25,scale=360:trunc(ow/a/2)*2,crop=360:320:0:(ih-320)/2,setsar=1[v1]`,
                `[v0][v1]vstack=inputs=2[v_stacked]`
            ])
            .outputOptions(["-map [v_stacked]", "-map 0:a", "-c:v libx264", "-preset ultrafast", "-threads 1"])
            .on("end", () => handleSupabaseUpload(out, response))
            .on("error", (e) => { cleanup(); response.status(500).send("Double failure"); })
            .save(out);
    }

    function cleanup() {
        [localOriginal, reactionFile.path, outputPath].forEach(p => { if (p && fs.existsSync(p)) fs.unlink(p, () => {}); });
    }
});

app.get("/", (req, res) => res.send("No-Stretch Render Server Online"));
app.listen(PORT, () => console.log(`Server na portu ${PORT}`));