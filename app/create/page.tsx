"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DuetRecorder from "@/components/DuetRecorder";

function CreateContent() {
  const searchParams = useSearchParams();
  const videoUrl = searchParams.get("video") || "";
  const title = decodeURIComponent(searchParams.get("title") || "");
  const artist = decodeURIComponent(searchParams.get("artist") || "");

  if (!videoUrl) {
    return (
      <main className="min-h-screen bg-[#0D0D14] text-white flex items-center justify-center text-2xl font-black">
        Missing video
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0D0D14] text-white flex flex-col items-center">
      
      {/* MODERAN HEADER */}
      <div className="sticky top-0 z-50 w-full bg-[#0D0D14]/80 backdrop-blur-xl border-b border-white/8">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center px-8 py-5">
          <h1 className="font-black text-2xl tracking-tighter uppercase italic text-violet-400">Studio</h1>
          <div className="hidden lg:flex gap-8 text-sm font-bold uppercase tracking-widest">
            <button className="text-white">Snimanje</button>
            <button className="text-slate-500 hover:text-white transition">Pomoć</button>
          </div>
        </div>
      </div>

      {/* STUDIO AREA - Side by Side na desktopu */}
      <div className="flex-1 w-full max-w-[1300px] flex flex-col lg:flex-row items-center justify-center gap-10 p-6 lg:p-16">
        
        {/* LEVO: ORIGINAL PLAYER */}
        <div className="w-full max-w-[420px] aspect-[9/16] bg-black rounded-[3rem] overflow-hidden border-8 border-white/8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative">
          <video
            id="song-video"
            src={videoUrl}
            controls
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute top-6 left-6 z-10 bg-violet-600 px-4 py-1.5 rounded-full shadow-lg">
            <p className="text-[10px] font-black tracking-widest uppercase text-white">Original</p>
          </div>
          
          <div className="absolute bottom-10 left-8 right-8 z-10 pointer-events-none">
            <h3 className="font-black text-xl drop-shadow-lg">{title}</h3>
            <p className="text-slate-400 text-sm font-medium">{artist}</p>
          </div>
        </div>

        {/* DESNO: TVOJ RECORDER */}
        <div className="w-full max-w-[420px] flex flex-col">
          <div className="hidden lg:block mb-10">
            <h2 className="text-5xl font-black tracking-tighter leading-none">SPREMAN ZA DUET?</h2>
            <p className="text-slate-500 mt-4 text-lg font-medium leading-relaxed">
                Kamera je spremna. Pesma se pušta automatski kada pritisneš dugme.
            </p>
          </div>
          
          <div className="bg-white/4 p-2 rounded-[3.5rem] border border-white/8 backdrop-blur-sm">
            <DuetRecorder
                originalVideo={videoUrl}
                title={title}
                artist={artist}
            />
          </div>
        </div>

      </div>
    </main>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0D14] flex items-center justify-center text-white font-black">UČITAVANJE STUDIJA...</div>}>
      <CreateContent />
    </Suspense>
  );
}