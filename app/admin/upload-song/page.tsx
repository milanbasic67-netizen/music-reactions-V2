"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import TopBar from "@/components/TopBar";
import { Music, Video, CheckCircle, Loader2, Plus, Info } from "lucide-react";

export default function UploadSongPage() {
  const [profile, setProfile] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [manualData, setManualData] = useState({ title: "", artist: "", videoUrl: "", thumbUrl: "" });

  useEffect(() => {
    async function loadData() {
      const p = await getProfile();
      setProfile(p);
      const { data } = await supabase.from("songs").select("*").order("created_at", { ascending: false });
      if (data) setSongs(data);
    }
    loadData();
  }, []);

  const handleImport = async () => {
    if (!youtubeUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });

      if (!res.ok) {
        if (res.status === 502) throw new Error("Render server crashed (OOM/Timeout). Use Manual Mode.");
        throw new Error(`Server error: ${res.status}`);
      }

      const result = await res.json();
      if (result.success) {
        await supabase.from("songs").insert({
          title: result.title,
          artist: "YouTube Import",
          video_url: result.videoUrl,
          thumbnail_url: result.thumbnailUrl
        });
        alert("Success!");
        window.location.reload();
      }
    } catch (err: any) {
      alert("SERVER OVERLOAD: " + err.message);
      setIsManual(true); // Automatski prebaci na manual ako server pukne
    } finally {
      setLoading(false);
    }
  };

  const handleManualInsert = async () => {
    if (!manualData.title || !manualData.videoUrl) return alert("Title and Video URL are required!");
    setLoading(true);
    const { error } = await supabase.from("songs").insert({
      title: manualData.title,
      artist: manualData.artist || "Unknown Artist",
      video_url: manualData.videoUrl,
      thumbnail_url: manualData.thumbUrl || `https://img.youtube.com/vi/default/maxresdefault.jpg`
    });

    if (!error) {
      alert("Song added manually!");
      window.location.reload();
    } else {
      alert("Database error: " + error.message);
    }
    setLoading(false);
  };

  if (profile && profile.role !== "admin") return <div className="text-white p-20 text-center">NOT AUTHORIZED</div>;

  return (
    <main className="min-h-screen bg-black text-white">
      <TopBar />
      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          <div className="space-y-8">
            <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-2xl flex gap-3">
              <Info className="text-red-500 shrink-0" />
              <p className="text-xs text-red-200 leading-relaxed">
                <strong>NOTE:</strong> Render's free server often crashes during YouTube processing (502 error). 
                If it fails, use <strong>Manual Mode</strong> to paste direct links.
              </p>
            </div>

            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
              <button onClick={() => setIsManual(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${!isManual ? "bg-red-600" : "text-zinc-500"}`}>AUTOMATIC</button>
              <button onClick={() => setIsManual(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${isManual ? "bg-red-600" : "text-zinc-500"}`}>MANUAL</button>
            </div>

            <div className="bg-zinc-900/50 p-8 rounded-[2rem] border border-white/5 backdrop-blur-xl">
              {!isManual ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-black/50 p-5 rounded-2xl border border-white/5">
                    <Video className="text-red-600" size={28} />
                    <input type="text" placeholder="YouTube Link..." className="bg-transparent border-none outline-none w-full text-white font-bold" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
                  </div>
                  <button onClick={handleImport} disabled={loading} className="w-full bg-white text-black py-4 rounded-2xl font-black flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : "IMPORT VIA SERVER"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input placeholder="Title" className="w-full bg-black/50 p-4 rounded-xl border border-white/5" onChange={(e) => setManualData({...manualData, title: e.target.value})} />
                  <input placeholder="Artist" className="w-full bg-black/50 p-4 rounded-xl border border-white/5" onChange={(e) => setManualData({...manualData, artist: e.target.value})} />
                  <input placeholder="Direct MP4 URL" className="w-full bg-black/50 p-4 rounded-xl border border-white/5" onChange={(e) => setManualData({...manualData, videoUrl: e.target.value})} />
                  <input placeholder="Thumbnail URL" className="w-full bg-black/50 p-4 rounded-xl border border-white/5" onChange={(e) => setManualData({...manualData, thumbUrl: e.target.value})} />
                  <button onClick={handleManualInsert} disabled={loading} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2">
                    <Plus size={20} /> ADD TO LIBRARY
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BIBLIOTEKA */}
          <div className="bg-zinc-900/20 p-8 rounded-[2rem] border border-white/5 flex flex-col h-[600px]">
             <h2 className="text-xl font-black mb-6 flex items-center gap-2"><Music className="text-red-500" /> ACTIVE LIBRARY</h2>
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
              {songs.map((song) => (
                <div key={song.id} className="flex items-center gap-4 bg-zinc-900/80 p-3 rounded-2xl border border-white/5">
                  <div className="w-16 h-12 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0">
                    {song.thumbnail_url && <img src={song.thumbnail_url} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate uppercase">{song.title}</h3>
                    <p className="text-zinc-500 text-[10px] truncate font-bold">{song.artist}</p>
                  </div>
                  <CheckCircle size={18} className="text-green-500 opacity-50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}