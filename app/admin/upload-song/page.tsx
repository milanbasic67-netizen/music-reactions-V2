"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";

export default function AdminUploadPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  useEffect(() => {
    async function load() {
      const p = await getProfile();
      if (p?.role !== "admin") {
        window.location.href = "/";
        return;
      }
      setProfile(p);
    }
    load();
  }, []);

  async function importYoutube() {
    try {
      if (!youtubeUrl) return alert("Unesite YouTube link");
      setLoading(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.details || "Import failed");

      const { data: { user } } = await supabase.auth.getUser();
      
      // UPIS U TABELU 'songs' (Trajno)
      const { error: insertError } = await supabase.from("songs").insert({
        title: data.title || "YouTube Song",
        artist: data.artist || "Unknown",
        video_url: data.videoUrl,
        thumbnail_url: data.thumbnailUrl,
        uploaded_by: profile?.username || "Admin",
        user_id: user?.id,
      });

      if (insertError) throw insertError;

      alert("Pesma trajno dodata u biblioteku!");
      window.location.href = "/songs";

    } catch (err: any) {
      alert("Greška: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return <main className="min-h-screen bg-black text-white flex items-center justify-center">Loading Admin...</main>;

  return (
    <main className="min-h-screen bg-black text-white p-5 max-w-xl mx-auto">
      <h1 className="text-4xl font-black mb-10">Admin: Add to Library</h1>
      <div className="p-6 bg-zinc-900 rounded-3xl border border-zinc-800">
        <label className="block mb-2 text-zinc-400 font-bold">YouTube URL (Permanent)</label>
        <input
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full bg-black border border-zinc-800 rounded-2xl p-4 outline-none mb-4"
        />
        <button
          onClick={importYoutube}
          disabled={loading}
          className="w-full bg-white text-black py-4 rounded-2xl font-black hover:bg-zinc-200 transition"
        >
          {loading ? "Dodavanje u bazu..." : "SAČUVAJ TRAJNO"}
        </button>
      </div>
    </main>
  );
}