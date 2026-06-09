"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import TopBar from "@/components/TopBar";
import { Music, Video, CheckCircle, Loader2, Plus, Settings2 } from "lucide-react";

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

      const result = await res.json();
      if (res.ok && result.success) {
        await supabase.from("songs").insert({
          title: result.title,
          artist: "YouTube Import",
          video_url: result.videoUrl,
          thumbnail_url: result.thumbnailUrl
        });
        alert("Song added successfully!");
        setYoutubeUrl("");
        window.location.reload();
      } else {
        alert("Server returned an error. Try restarting Render or use Manual mode.");
      }
    } catch (err) {
      alert("Connection error. Server might be down.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualInsert = async () => {
    if (!manualData.title || !manualData.videoUrl) return alert("Title and Video URL are required!");
    setLoading(true);
    const { error } = await supabase.from("songs").insert({
      title: manualData.title,
      artist: manualData.artist || "Unknown",
      video_url: manualData.videoUrl,
      thumbnail_url: manualData.thumbUrl || `https://img.youtube.com/vi/default/maxresdefault.jpg`
    });
    if (!error) {
      alert("Manual entry successful!");
      window.location.reload();
    }
    setLoading(false);
  };

  

  return (
    <main className="min-h-screen bg-[#0D0D14] text-white">
      <TopBar />
      
      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* LEVA STRANA - IMPORT */}
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl font-black tracking-tighter uppercase italic">
                Manage <span className="text-violet-400">Songs</span>
              </h1>
              <p className="text-slate-500 mt-2 font-medium">Add new tracks to the DUET library.</p>
            </div>

            {/* MODE SWITCHER */}
            <div className="inline-flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
              <button 
                onClick={() => setIsManual(false)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${!isManual ? "bg-white text-black shadow-xl" : "text-slate-500 hover:text-white"}`}
              >
                AUTOMATIC
              </button>
              <button 
                onClick={() => setIsManual(true)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${isManual ? "bg-white text-black shadow-xl" : "text-slate-500 hover:text-white"}`}
              >
                MANUAL
              </button>
            </div>

            <div className="bg-white/4 p-8 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl shadow-2xl">
              {!isManual ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">YouTube URL</label>
                    <div className="flex items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/5 focus-within:border-violet-500/50 transition-all">
                      <Video className="text-violet-400" size={24} />
                      <input 
                        type="text" 
                        placeholder="Paste link here..." 
                        className="bg-transparent border-none outline-none w-full text-white font-bold placeholder:text-zinc-700"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleImport}
                    disabled={loading || !youtubeUrl}
                    className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white py-5 rounded-2xl font-black text-lg transition-all shadow-lg shadow-violet-900/20 flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Plus size={24} />}
                    {loading ? "PROCESSING..." : "IMPORT SONG"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input placeholder="Title" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-sm font-bold" onChange={(e) => setManualData({...manualData, title: e.target.value})} />
                  <input placeholder="Artist" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-sm font-bold" onChange={(e) => setManualData({...manualData, artist: e.target.value})} />
                  <input placeholder="Video Direct URL (.mp4)" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-sm font-bold" onChange={(e) => setManualData({...manualData, videoUrl: e.target.value})} />
                  <input placeholder="Thumbnail URL" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-sm font-bold" onChange={(e) => setManualData({...manualData, thumbUrl: e.target.value})} />
                  <button onClick={handleManualInsert} disabled={loading} className="w-full bg-white text-black py-4 rounded-xl font-black mt-4 hover:bg-zinc-200 transition-colors">
                    ADD MANUALLY
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DESNA STRANA - BIBLIOTEKA */}
          <div className="bg-white/3 p-8 rounded-[2.5rem] border border-white/5 flex flex-col h-[650px] shadow-inner">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-tighter">
                <Settings2 className="text-violet-400" /> Library Status
              </h2>
              <span className="text-[10px] bg-white/8 px-3 py-1 rounded-full font-black text-slate-400">{songs.length} TOTAL</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {songs.map((song) => (
                <div key={song.id} className="flex items-center gap-4 bg-white/4 p-3 rounded-2xl border border-white/5 group hover:border-violet-500/30 transition-all duration-300">
                  <div className="w-16 h-12 bg-slate-800 rounded-xl overflow-hidden shrink-0 shadow-lg">
                    {song.thumbnail_url ? (
                      <img src={song.thumbnail_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music size={16} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-xs truncate uppercase tracking-tight group-hover:text-violet-400 transition-colors">{song.title}</h3>
                    <p className="text-slate-500 text-[10px] font-bold mt-0.5">{song.artist}</p>
                  </div>
                  <CheckCircle size={16} className="text-green-500/30" />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}