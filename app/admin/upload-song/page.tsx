"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";

export default function UploadSongPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  // 1. UČITAVANJE PROFILA
  useEffect(() => {
    async function load() {
      const p = await getProfile();
      setProfile(p);
    }
    load();
  }, []);

  // 2. IMPORT SA YOUTUBE-A
  async function importYoutube() {
    try {
      if (!youtubeUrl) return alert("Unesite YouTube link");
      
      setLoading(true);

      // Pozivamo tvoj optimizovani backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.details || "Import failed");
      }

      // Podaci o korisniku za bazu
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");

      // UPIS U BAZU (TABELA 'songs')
      const { error: insertError } = await supabase
        .from("songs")
        .insert({
          title: data.title || "YouTube Song",
          artist: data.artist || "Unknown",
          video_url: data.videoUrl,
          thumbnail_url: data.thumbnailUrl,
          uploaded_by: profile?.username || "Admin",
          user_id: user.id,
        });

      if (insertError) throw insertError;

      alert("Pesma uspešno uvezena!");
      window.location.href = "/songs";

    } catch (err: any) {
      console.error(err);
      alert("Greška: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // 3. RUČNI UPLOAD (STARI KOD)
  async function uploadSong() {
    try {
      if (!videoFile) return alert("Izaberite video");
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("Login required");

      const videoName = `${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;

      const { error: videoError } = await supabase.storage
        .from("songs")
        .upload(videoName, videoFile, { contentType: "video/mp4" });

      if (videoError) throw videoError;

      const { data: videoPublic } = supabase.storage.from("songs").getPublicUrl(videoName);

      const { error: insertError } = await supabase.from("songs").insert({
        title: title || "Untitled",
        artist: artist || "Unknown",
        video_url: videoPublic.publicUrl,
        thumbnail_url: "https://placehold.co/600x400/000000/FFFFFF/png?text=No+Thumb",
        uploaded_by: profile.username,
        user_id: user.id,
      });

      if (insertError) throw insertError;

      alert("Uploaded!");
      window.location.href = "/songs";
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return <main className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</main>;
  if (profile.role !== "admin") return <main className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">Not authorized</main>;

  return (
    <main className="min-h-screen bg-black text-white p-5 max-w-xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-black">Upload Song</h1>
        <p className="text-zinc-500 mt-2">Import from YouTube or upload MP4</p>
      </div>

      {/* YOUTUBE SEKCIJA */}
      <div className="mb-10 p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800">
        <label className="block mb-2 text-zinc-400 font-bold">YouTube Import</label>
        <input
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none mb-4"
        />
        <button
          onClick={importYoutube}
          disabled={loading}
          className="w-full bg-white text-black py-4 rounded-2xl font-black hover:bg-zinc-200 transition"
        >
          {loading ? "Importing..." : "Import YouTube"}
        </button>
      </div>

      <div className="flex items-center gap-4 mb-10 text-zinc-600">
        <div className="h-[1px] bg-zinc-800 flex-1"></div>
        <span>OR MANUAL UPLOAD</span>
        <div className="h-[1px] bg-zinc-800 flex-1"></div>
      </div>

      <div className="mb-5">
        <label className="block mb-2 text-zinc-400">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none" />
      </div>

      <div className="mb-5">
        <label className="block mb-2 text-zinc-400">Artist</label>
        <input value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none" />
      </div>

      <div className="mb-8">
        <label className="block mb-2 text-zinc-400">MP4 Video</label>
        <input type="file" accept="video/mp4" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4" />
      </div>

      <button
        onClick={uploadSong}
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-500 transition py-5 rounded-3xl font-black text-xl"
      >
        {loading ? "Uploading..." : "Upload Song"}
      </button>
    </main>
  );
}