"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import TopBar from "@/components/TopBar";
import { Music, Video, CheckCircle, Loader2 } from "lucide-react";

export default function UploadSongPage() {
  const [profile, setProfile] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const p = await getProfile();
      setProfile(p);
      
      const { data } = await supabase
        .from("songs")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setSongs(data);
    }
    loadData();
  }, []);

  // Funkcija za import (poveži sa svojim backendom)
  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      if (res.ok) {
        alert("Song imported successfully!");
        window.location.reload();
      }
    } catch (err) {
      alert("Error importing song.");
    } finally {
      setLoading(false);
    }
  };

  if (profile && profile.role !== "admin") {
    return <div className="text-white p-20 font-black text-center">NOT AUTHORIZED</div>;
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* 
          KLJUČNO: TopBar mora biti ovde da bi navigacija bila vidljiva na desktopu 
      */}
      <TopBar />

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* LEVA STRANA: Upload forma */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-black mb-3 italic tracking-tighter">
                IMPORT <span className="text-red-600">SONG</span>
              </h1>
              <p className="text-zinc-500 font-medium">Add a YouTube track to the public library.</p>
            </div>

            <div className="bg-zinc-900/50 p-8 rounded-[2rem] border border-white/5 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-6 bg-black/50 p-5 rounded-2xl border border-white/5 focus-within:border-red-600/50 transition-colors">
                <Video className="text-red-600" size={28} />
                <input 
                  type="text" 
                  placeholder="Paste YouTube Link..." 
                  className="bg-transparent border-none outline-none w-full text-white font-bold placeholder:text-zinc-700"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
              </div>

              <button 
                onClick={handleImport}
                disabled={loading || !youtubeUrl}
                className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-800 text-black py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : "START IMPORT"}
              </button>
            </div>
          </div>

          {/* DESNA STRANA: Biblioteka (Pregled za Admina) */}
          <div className="bg-zinc-900/20 p-8 rounded-[2rem] border border-white/5 flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Music className="text-red-500" /> ACTIVE LIBRARY
              </h2>
              <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-1 rounded-md font-bold">
                {songs.length} TRACKS
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
              {songs.map((song) => (
                <div key={song.id} className="flex items-center gap-4 bg-zinc-900/80 p-3 rounded-2xl border border-white/5 group hover:border-red-600/20 transition">
                  <div className="w-16 h-12 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0">
                    {song.thumbnail_url ? (
                      <img src={song.thumbnail_url} className="w-full h-full object-cover group-hover:scale-110 transition" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music size={16} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate uppercase tracking-tight">{song.title}</h3>
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