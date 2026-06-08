"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UserUploadPage() {
  const [loading, setLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  async function startDuetImport() {
    if (!youtubeUrl) return alert("Unesite YouTube link");
    setLoading(true);

    try {
      // 1. Uzimamo aktivnu sesiju (token)
      const { data: { session } } = await supabase.auth.getSession();

      // 2. Šaljemo zahtev sa SVIM zaglavljima koja bi admin poslao
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import-youtube`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Šaljemo token ako ga backend traži za proveru
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      if (res.status === 403) {
        throw new Error("Server i dalje ne dozvoljava pristup običnim korisnicima (403).");
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.details || "Import failed");

      // 3. Ako prođe, ide na snimanje uz brisanje (temp=true)
      const duetUrl = `/create?video=${encodeURIComponent(data.videoUrl)}&title=${encodeURIComponent(data.title)}&artist=${encodeURIComponent(data.artist)}&temp=true`;
      window.location.href = duetUrl;

    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-5 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 text-center">
        <h1 className="text-3xl font-black mb-6">NOVI DUET</h1>
        <input
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="Paste YouTube link..."
          className="w-full bg-black border border-zinc-800 rounded-2xl p-5 mb-6 text-center outline-none focus:border-red-600 transition-all"
        />
        <button
          onClick={startDuetImport}
          disabled={loading}
          className="w-full bg-red-600 py-5 rounded-2xl font-black text-xl active:scale-95 transition"
        >
          {loading ? "PROVERA..." : "ZAPOČNI"}
        </button>
      </div>
    </main>
  );
}