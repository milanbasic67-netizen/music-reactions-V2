"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";

export default function UserUploadPage() {
  const [loading, setLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  async function startDuetImport() {
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

      // REDIRECT na snimanje sa oznakom TEMP=TRUE
      const duetUrl = `/duet/new?video=${encodeURIComponent(data.videoUrl)}&title=${encodeURIComponent(data.title)}&artist=${encodeURIComponent(data.artist)}&temp=true`;
      window.location.href = duetUrl;

    } catch (err: any) {
      alert("Greška: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-5 max-w-xl mx-auto flex flex-col justify-center">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black">Novi Duet</h1>
        <p className="text-zinc-500 mt-2">Nalepi YouTube link i kreni sa snimanjem</p>
      </div>

      <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800 backdrop-blur-md">
        <input
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="Paste YouTube link here..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none mb-6 text-center text-lg"
        />
        <button
          onClick={startDuetImport}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 text-white py-5 rounded-2xl font-black text-xl transition active:scale-95"
        >
          {loading ? "Priprema videa..." : "START DUET"}
        </button>
      </div>
    </main>
  );
}