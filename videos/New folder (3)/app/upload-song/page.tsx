"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function UserUploadPage() {
  const [loading, setLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    async function loadCredits() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
      setCredits(data?.credits ?? 0);
    }
    loadCredits();
  }, []);

  async function startDuetImport() {
    if (!youtubeUrl) return alert("Please enter a YouTube link");
    if (credits !== null && credits <= 0) { window.location.href = "/credits"; return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      if (res.status === 402) { window.location.href = "/credits"; return; }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.details || "Import failed");
      window.location.href = `/create?video=${encodeURIComponent(data.videoUrl)}&title=${encodeURIComponent(data.title)}&artist=${encodeURIComponent(data.artist)}&temp=true`;
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0D0D14] text-white p-5 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white/5 p-8 rounded-[2.5rem] border border-white/8 text-center">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black">NEW DUET</h1>
          <Link href="/credits" className="flex items-center gap-1 bg-violet-600/20 border border-violet-500/30 px-3 py-1.5 rounded-full text-sm font-bold text-violet-400 hover:bg-violet-600/30 transition">
            {credits === null ? "..." : credits} kredita
          </Link>
        </div>
        {credits !== null && credits <= 0 && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4 mb-6 text-red-400 text-sm font-bold">
            Nemaš kredita. <Link href="/credits" className="underline">Kupi kredite →</Link>
          </div>
        )}
        <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="Paste YouTube link..."
          className="w-full bg-black border border-white/8 rounded-2xl p-5 mb-6 text-center outline-none focus:border-violet-500 transition-all" />
        <button onClick={startDuetImport} disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-500 py-5 rounded-2xl font-black text-xl active:scale-95 transition">
          {loading ? "CHECKING..." : "START"}
        </button>
      </div>
    </main>
  );
}