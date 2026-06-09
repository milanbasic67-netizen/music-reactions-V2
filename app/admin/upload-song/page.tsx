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
      const { data } = await supabase.from("songs").select("*").order("created_at", { ascending: false });
      if (data) setSongs(data);
    }
    loadData();
  }, []);

  const handleImport = async () => {
    if (!youtubeUrl) return;
    setLoading(true);

    try {
      // 1. Pozivamo tvoj postojeći server da obradi video
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/import-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        // 2. KLJUČNI KORAK: Ručno upisujemo u bazu jer server to ne radi!
        const { error: dbError } = await supabase
          .from("songs")
          .insert({
            title: result.title || "YouTube Song",
            artist: "YouTube Import",
            video_url: result.videoUrl,
            thumbnail_url: result.thumbnailUrl
          });

        if (dbError) throw dbError;

        alert("SUCCESS: Song is now in the library!");
        setYoutubeUrl("");
        window.location.reload();
      } else {
        alert("Server failed: " + (result.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (profile && profile.role !== "admin") return <div className="text-white p-20 text-center">NOT AUTHORIZED</div>;

  return (
    <main className="min-h-screen bg-black text-white">
      <TopBar />
      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-black mb-3 italic tracking-tighter">IMPORT <span className="text-red-600">SONG</span></h1>
              <p className="text-zinc-500 font-medium">Add a YouTube track to the public library.</p>
            </div>

            <div className="bg-zinc-900/50 p-8 rounded-[2rem] border border-white/5 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-6 bg-black/50 p-5 rounded-2xl border border-white/5">
                <Video className="text-red-600" size={28} />
                <input 
                  type="text" 
                  placeholder="Paste YouTube Link..." 
                  className="bg-transparent border-none outline-none w-full text-white font-bold"
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

          <div className="bg-zinc-900/20 p-8 rounded-[2rem] border border-white/5 flex flex-col h-[600px]">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
              <Music className="text-red-500" /> ACTIVE LIBRARY
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
              {songs.map((song) => (
                <div key={song.id} className="flex items-center gap-4 bg-zinc-900/80 p-3 rounded-2xl border border-white/5 transition">
                  <div className="w-16 h-12 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0">
                    {song.thumbnail_url && <img src={song.thumbnail_url} className="w-full h-full object-cover" />}
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