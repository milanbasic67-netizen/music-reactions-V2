"use client";

import { useState } from "react";

export default function UserUploadPage() {
  const [loading, setLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  async function startDuetImport() {
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

      // ISPRAVLJEN URL NA /create
      const duetUrl = `/create?video=${encodeURIComponent(data.videoUrl)}&title=${encodeURIComponent(data.title)}&artist=${encodeURIComponent(data.artist)}&temp=true`;
      
      window.location.href = duetUrl;

    } catch (err: any) {
      alert("Greška: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-5 flex flex-col items-center justify-center">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-black mb-10">NOVI DUET</h1>
        <input
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="Paste YouTube link..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-5 outline-none mb-4 text-center"
        />
        <button
          onClick={startDuetImport}
          disabled={loading}
          className="w-full bg-red-600 py-5 rounded-3xl font-black text-xl active:scale-95 transition"
        >
          {loading ? "PRIREMA..." : "KRENI SNIMANJE"}
        </button>
      </div>
    </main>
  );
}