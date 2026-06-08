"use client";

import { useState } from "react";

export default function UserUploadPage() {
  const [loading, setLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  async function startDuetImport() {
    if (!youtubeUrl) return alert("Unesite YouTube link");
    
    setLoading(true);

    try {
      // Pozivamo tvoj backend - identično kao što to radi admin
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.details || "Import failed");
      }

      // Ako je backend uspešno obradio video, šaljemo korisnika na snimanje
      // Dodajemo temp=true parametar
      const duetUrl = `/duet/new?video=${encodeURIComponent(data.videoUrl)}&title=${encodeURIComponent(data.title)}&artist=${encodeURIComponent(data.artist)}&temp=true`;
      
      window.location.href = duetUrl;

    } catch (err: any) {
      console.error(err);
      alert("Greška: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-5 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black uppercase tracking-tighter">Novi Duet</h1>
          <p className="text-zinc-500 mt-2">Nalepi YouTube link i počni da pevaš</p>
        </div>

        <div className="bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl">
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            className="w-full bg-black border border-zinc-800 rounded-2xl p-5 outline-none mb-4 text-center focus:border-red-600 transition-all"
          />
          
          <button
            onClick={startDuetImport}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white py-5 rounded-2xl font-black text-xl transition active:scale-95 shadow-lg shadow-red-900/20"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>PRIPREMA...</span>
              </div>
            ) : (
              "START DUET"
            )}
          </button>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-8 px-10">
          Video će biti automatski obrisan nakon što objaviš svoj duet.
        </p>
      </div>
    </main>
  );
}