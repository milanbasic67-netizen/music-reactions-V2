const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Admin client — bypasses RLS, used for storage deletes and ownership checks
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

async function verifyAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const { data } = await axios.get(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY }
    });
    if (!data?.id) return res.status(401).json({ error: "Invalid session" });
    req.userId = data.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
}

const uploadsDir = path.join(__dirname, "uploads");
[uploadsDir].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

const upload = multer({ dest: uploadsDir });

function getYTID(url) {
    try {
        const parsed = new URL(url);
        if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('?')[0];
        if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
        const segments = parsed.pathname.split('/');
        const idx = segments.findIndex(s => ['shorts', 'embed', 'v', 'live'].includes(s));
        if (idx !== -1) return segments[idx + 1]?.split('?')[0] || null;
    } catch {}
    return null;
}

// --- RUTA: IMPORT YOUTUBE (VERZIJA 58 - FIXED) ---
app.post("/import-youtube", verifyAuth, async (req, res) => {
    const { url } = req.body;
    const RAPID_KEY = '01f396de62msh53c99a3cb08ea27p1908ecjsnc9856c6b2fea';
    const videoId = getYTID(url);

    const videoPath = path.join(uploadsDir, `v-${Date.now()}.mp4`);
    const audioPath = path.join(uploadsDir, `a-${Date.now()}.mp3`);
    const mergedPath = path.join(uploadsDir, `merged-${Date.now()}.mp4`);

    // FUNKCIJA KOJA SIGURNO BRIŠE FAJLOVE
    const cleanup = () => {
        [videoPath, audioPath, mergedPath].forEach(p => { 
            if (fs.existsSync(p)) {
                try { fs.unlinkSync(p); } catch(e) {}
            }
        });
    };

    try {
        if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL." });

        const apiRes = await axios.get('https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details', {
            params: { videoId, urlAccess: 'proxied', fields: 'contents,metadata' },
            headers: { 'x-rapidapi-key': RAPID_KEY, 'x-rapidapi-host': 'social-media-video-downloader.p.rapidapi.com' }
        });

        const meta = apiRes.data?.metadata;
        const isVerifiedArtist = meta?.author?.is_verified_artist === true;
        const keywords = (meta?.additionalData?.keywords || []).map(k => k.toLowerCase());
        const title = (meta?.title || '').toLowerCase();
        console.log("MUSIC_CHECK title:", title, "| isVerifiedArtist:", isVerifiedArtist, "| keywords:", keywords.slice(0, 10));

        const NON_MUSIC_KEYWORDS = ['gaming', 'gameplay', "let's play", 'tutorial', 'how to', 'howto', 'news', 'sports', 'vlog', 'podcast', 'documentary', 'review', 'unboxing', 'cooking', 'recipe', 'lecture', 'lesson', 'course'];

        const hasNonMusic = NON_MUSIC_KEYWORDS.some(k => keywords.some(kw => kw.includes(k)) || title.includes(k));

        if (!isVerifiedArtist && hasNonMusic) {
            return res.status(400).json({ error: "Only music videos can be imported." });
        }

        const contents = apiRes.data?.contents?.[0];
        const vList = contents?.videos || [];
        const aList = contents?.audios || [];

        const videoObj = vList.find(v => v.label === "360p") || vList.find(v => v.label === "480p") || vList[vList.length - 1];
        const audioObj = aList.find(a => a.label.includes("medium")) || aList[0];

        if (!videoObj?.url || !audioObj?.url) throw new Error("Nisu pronađeni linkovi.");

        const download = async (url, dest) => {
            const writer = fs.createWriteStream(dest);
            const response = await axios({ url, method: 'GET', responseType: 'stream' });
            response.data.pipe(writer);
            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', (err) => { cleanup(); reject(err); });
            });
        };

        await Promise.all([download(videoObj.url, videoPath), download(audioObj.url, audioPath)]);

        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions("-c:v copy")
            .outputOptions("-c:a aac")
            .on("end", async () => {
                try {
                    const videoName = `yt-${Date.now()}.mp4`;
                    const stats = fs.statSync(mergedPath);
                    const supabaseUrl = `${process.env.SUPABASE_URL}/storage/v1/object/songs/${videoName}`;
                    
                    await axios.post(supabaseUrl, fs.createReadStream(mergedPath), {
                        headers: {
                            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                            'API-Key': process.env.SUPABASE_SERVICE_ROLE_KEY,
                            'Content-Type': 'video/mp4',
                            'Content-Length': stats.size,
                            'x-upsert': 'true'
                        }
                    });

                    res.json({ 
                        success: true, 
                        videoUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/songs/${videoName}`,
                        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                        title: apiRes.data.metadata?.title || "YouTube Song"
                    });
                } catch (err) {
                    if (!res.headersSent) res.status(500).json({ error: "Upload failed" });
                } finally {
                    cleanup(); // BRIŠE FAJLOVE ČIM SE ZAVRŠI (USPEŠNO ILI NE)
                }
            })
            .on("error", (err) => {
                cleanup(); // BRIŠE FAJLOVE AKO FFmpeg PUKNE
                if (!res.headersSent) res.status(500).json({ error: "Spajanje neuspešno" });
            })
            .save(mergedPath);

    } catch (err) {
        cleanup();
        const details = err.response?.data || err.message;
        console.error("Import error:", JSON.stringify(details));
        if (!res.headersSent) res.status(500).json({ error: "Import failed", details });
    }
});

// --- RENDER DUET (Bez izmena, dodat cleanup) ---
app.post("/render-duet", verifyAuth, upload.single("reaction"), async (req, res) => {
    const { originalUrl, duration } = req.body;
    const reactionFile = req.file;
    const localOriginal = path.join(uploadsDir, `orig-${Date.now()}.mp4`);
    const outputPath = path.join(uploadsDir, `final-${Date.now()}.mp4`);

    try {
        const resp = await axios({ url: originalUrl, method: 'GET', responseType: 'stream' });
        const writer = fs.createWriteStream(localOriginal);
        resp.data.pipe(writer);
        await new Promise((res, rej) => { writer.on('finish', res); writer.on('error', rej); });

        ffmpeg()
            .input(localOriginal).input(reactionFile.path).duration(parseFloat(duration) || 10)
            .complexFilter([
                `[0:v]fps=20,scale=480:360:force_original_aspect_ratio=increase,crop=480:360[v0]`,
                `[1:v]fps=20,scale=480:360:force_original_aspect_ratio=increase,crop=480:360[v1]`,
                `[v0][v1]vstack=inputs=2[v_final]`,
                `[0:a]volume=0.3[a0]`, `[1:a]highpass=f=200,volume=3.5[a1]`, `[a0][a1]amix=inputs=2:duration=first[a_final]`
            ])
            .outputOptions(["-map [v_final]", "-map [a_final]", "-c:v libx264", "-preset ultrafast", "-crf 32"])
            .on("end", async () => {
                const storageName = `duets/tiktok-${Date.now()}.mp4`;
                await axios.post(`${process.env.SUPABASE_URL}/storage/v1/object/videos/${storageName}`, fs.createReadStream(outputPath), {
                    headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'API-Key': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'video/mp4' }
                });
                [localOriginal, reactionFile.path, outputPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
                res.json({ success: true, videoUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/videos/${storageName}` });
            })
            .on("error", (err) => {
                [localOriginal, reactionFile.path, outputPath].forEach(p => { if (fs.existsSync(p)) fs.unlinkSync(p); });
                res.status(500).json({ error: "Render failed" });
            })
            .save(outputPath);
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// --- DELETE VIDEO (storage + DB, uses service role) ---
app.post("/delete-video", verifyAuth, async (req, res) => {
  const { reactionId, storagePath } = req.body;

  try {
    // Check ownership or admin
    const { data: reaction } = await supabaseAdmin
      .from("reactions")
      .select("user_id")
      .eq("id", reactionId)
      .single();

    if (!reaction) return res.status(404).json({ error: "Not found" });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", req.userId)
      .single();

    const isAdmin = profile?.role === "admin";

    if (reaction.user_id !== req.userId && !isAdmin) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Delete file from storage using service role (bypasses RLS)
    let storageWarning = null;
    if (storagePath) {
      const { data: storageData, error: storageError } = await supabaseAdmin.storage
        .from("videos")
        .remove([storagePath]);
      if (storageError) {
        return res.status(500).json({ error: "Storage delete failed", details: storageError.message });
      }
      // storageData is array of deleted objects — empty means path not found
      if (!storageData || storageData.length === 0) {
        storageWarning = `File not found at path: ${storagePath}`;
      }
    } else {
      storageWarning = "No storagePath provided";
    }

    // Delete row from reactions
    const { error: dbError } = await supabaseAdmin
      .from("reactions")
      .delete()
      .eq("id", reactionId);

    if (dbError) return res.status(500).json({ error: "DB delete failed", details: dbError.message });

    res.json({ success: true, storageError: storageWarning });
  } catch (err) {
    res.status(500).json({ error: "Delete failed", details: err.message });
  }
});

app.listen(PORT, () => console.log(`Backend V58 - Fixed Cleanup Ready`));