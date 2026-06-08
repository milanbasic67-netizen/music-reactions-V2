"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminUploadPage() {
  const [loading, setLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  async function handleAdminImport() {
    if (!youtubeUrl) return alert("Unesite YouTube link");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.details || "Import failed");

      // ADMIN UPISUJE U BAZU TRAJNO
      const { error: dbError } = await supabase.from("songs").insert({
        title: data.title,
        artist: data.artist,
        video_url: data.videoUrl,
        thumbnail_url: data.thumbnailUrl
      });

      if (dbError) throw dbError;

      alert("Pesma uspešno dodata u biblioteku!");
      
      // Šaljemo na /create BEZ temp=true (znači ostaje u bazi)
      window.location.href = `/create?video=${encodeURIComponent(data.videoUrl)}&title=${encodeURIComponent(data.title)}&artist=${encodeURIComponent(data.artist)}`;

    } catch (err: any) {
      alert("Greška: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-5 flex flex-col items-center justify-center">
      <h1 className="text-2xl font-black mb-8">ADMIN: DODAJ PESMU</h1>
      <input
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.target.value)}
        placeholder="YouTube link..."
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4"
      />
      <button 
        onClick={handleAdminImport}
        disabled={loading}
        className="w-full max-w-md bg-white text-black py-4 rounded-2xl font-bold"
      >
        {loading ? "UVOZ..." : "DODAJ TRAJNO U KATALOG"}
      </button>
    </main>
  );
}