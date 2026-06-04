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
    console.log("\n--- RENDER START (BRUTE FORCE MODE) ---");
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;

    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(rendersDir, `final-${Date.now()}.mp4`);
    const finalDuration = parseFloat(duration) || 10;

    try {
        await downloadFile(originalUrl, localOriginal);

        console.log("Pokrećem FFmpeg sa pojačanom stabilnošću...");
        
        ffmpeg()
            .input(localOriginal)
            .input(reactionFile.path)
            .inputOptions([
                "-analyzeduration 10M", // Dajemo više vremena za analizu fajla
                "-probesize 10M"
            ])
            .duration(finalDuration)
            .complexFilter([
                // ORIGINAL: Forsiramo tačno 360x320 bez kompleksne matematike
                // scale=360:320:force_original_aspect_ratio=increase,crop=360:320 je "Cover" metod
                `[0:v]fps=25,scale=360:320:force_original_aspect_ratio=increase,crop=360:320,setsar=1[v0]`,
                
                // REAKCIJA (Kamera): Isto kao original
                `[1:v]fps=25,scale=360:320:force_original_aspect_ratio=increase,crop=360:320,setsar=1[v1]`,
                
                // AUDIO: Forsiramo resample na 44100 i stereo da bi se amix lakše snašao
                `[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.3[a0]`,
                `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=1.2[a1]`,
                
                // SPAJANJE: vstack i amix
                `[v0][v1]vstack=inputs=2[v_final]`,
                `[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[a_final]`
            ])
            .outputOptions([
                "-map [v_final]",
                "-map [a_final]",
                "-c:v libx264",
                "-preset ultrafast",
                "-crf 30",
                "-threads 1",
                "-pix_fmt yuv420p",
                "-movflags +faststart"
            ])
            .on("start", (cmd) => console.log("Komanda pokrenuta."))
            .on("progress", (p) => process.stdout.write(`Vreme: ${p.timemark} \r`))
            .on("error", (err) => {
                console.error("\nFFmpeg Error:", err.message);
                // FINALNI FALLBACK: Ako amix i dalje pravi problem, uzimamo samo zvuk originala
                fallbackRenderSimple(localOriginal, reactionFile.path, outputPath, finalDuration, res);
            })
            .on("end", async () => {
                console.log("\nRender uspešan!");
                await uploadToSupabase(outputPath, res);
            })
            .save(outputPath);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }

    // --- POMOĆNE FUNKCIJE ---

    async function uploadToSupabase(filePath, response) {
        try {
            const stream = fs.createReadStream(filePath);
            const name = `duets/duet-${Date.now()}.mp4`;
            const { error } = await supabase.storage.from("videos").upload(name, stream);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(name);
            cleanup();
            response.json({ success: true, videoUrl: publicUrl });
        } catch (err) {
            cleanup();
            response.status(500).json({ error: "Upload failed" });
        }
    }

    function fallbackRenderSimple(orig, react, out, dur, response) {
        console.log("Pokrećem fallback (Bez miksanja audia)...");
        ffmpeg()
            .input(orig)
            .input(react)
            .duration(dur)
            .complexFilter([
                `[0:v]fps=25,scale=360:320:force_original_aspect_ratio=increase,crop=360:320,setsar=1[v0]`,
                `[1:v]fps=25,scale=360:320:force_original_aspect_ratio=increase,crop=360:320,setsar=1[v1]`,
                `[v0][v1]vstack=inputs=2[v]`
            ])
            .outputOptions(["-map [v]", "-map 0:a", "-c:v libx264", "-preset ultrafast", "-threads 1"])
            .on("end", () => uploadToSupabase(out, response))
            .on("error", (e) => { cleanup(); response.status(500).send("Total failure"); })
            .save(out);
    }

    function cleanup() {
        [localOriginal, reactionFile.path, outputPath].forEach(p => { if (p && fs.existsSync(p)) fs.unlink(p, () => {}); });
    }
});

app.get("/", (req, res) => res.send("No-Stretch Render Server Online"));
app.listen(PORT, () => console.log(`Server na portu ${PORT}`));