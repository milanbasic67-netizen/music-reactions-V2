"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import TopBar from "@/components/TopBar";
import { Music, Youtube, CheckCircle } from "lucide-react";

export default function UploadSongPage() {
  const [profile, setProfile] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const p = await getProfile();
      setProfile(p);
      
      // Učitaj postojeće pesme da se vide na desktopu
      const { data } = await supabase.from("songs").select("*").order("created_at", { ascending: false });
      if (data) setSongs(data);
    }
    loadData();
  }, []);

  if (profile && profile.role !== "admin") return <div className="text-white p-20">Not authorized</div>;

  return (
    <main className="min-h-screen bg-black text-white">
      <TopBar />

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* LEVA STRANA: Upload forma */}
          <div>
            <h1 className="text-4xl font-black mb-2">IMPORT <span className="text-red-600">SONG</span></h1>
            <p className="text-zinc-500 mb-8">Paste a YouTube link to add a new song to the library.</p>

            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 shadow-2xl">
              <div className="flex items-center gap-4 mb-6 bg-black/50 p-4 rounded-2xl border border-white/5">
                <Youtube className="text-red-600" size={32} />
                <input 
                  type="text" 
                  placeholder="https://www.youtube.com/watch?v=..." 
                  className="bg-transparent border-none outline-none w-full text-white font-medium"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
              </div>

              <button 
                className="w-full bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 py-4 rounded-2xl font-black text-lg transition-all"
                disabled={loading || !youtubeUrl}
              >
                {loading ? "Processing..." : "Add to Library"}
              </button>
            </div>
          </div>

          {/* DESNA STRANA: Ponuđene pesme (Vidljivo odmah na desktopu) */}
          <div className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5 h-[600px] flex flex-col">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
              <Music className="text-red-500" /> Current Library ({songs.length})
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {songs.map((song) => (
                <div key={song.id} className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5 hover:border-red-600/30 transition">
                  <div className="w-16 h-12 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                    {song.thumbnail_url && <img src={song.thumbnail_url} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{song.title}</h3>
                    <p className="text-zinc-500 text-xs truncate">{song.artist}</p>
                  </div>
                  <CheckCircle size={18} className="text-green-500 mr-2" />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}