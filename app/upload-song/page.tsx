"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UserUploadPage() {
  const [loading, setLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [error, setError] = useState("");

  async function startDuetImport() {
    if (!youtubeUrl) return;
    setError("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import-youtube`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed");
        return;
      }

      const duetUrl = `/create?video=${encodeURIComponent(data.videoUrl)}&title=${encodeURIComponent(data.title)}&artist=${encodeURIComponent(data.artist)}&temp=true`;
      window.location.href = duetUrl;

    } catch (err: any) {
      setError("Import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0D0D14] text-white p-5 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white/5 p-8 rounded-[2.5rem] border border-white/8 text-center">
        <h1 className="text-3xl font-black mb-6">NEW DUET</h1>
        <input
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="Paste YouTube link..."
          className="w-full bg-black border border-white/8 rounded-2xl p-5 mb-6 text-center outline-none focus:border-violet-500 transition-all"
        />
        <button
          onClick={startDuetImport}
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-500 py-5 rounded-2xl font-black text-xl active:scale-95 transition"
        >
          {loading ? "CHECKING..." : "START"}
        </button>

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </main>
  );
}