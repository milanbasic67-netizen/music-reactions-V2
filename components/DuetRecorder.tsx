"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import { useSearchParams } from "next/navigation";

type Props = {
  originalVideo: string;
  title: string;
  artist: string;
};

export default function DuetRecorder({ originalVideo, title, artist }: Props) {
  const searchParams = useSearchParams();
  const isTemporary = searchParams.get("temp") === "true"; // Provera da li brišemo original

  const cameraRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Postavljanje kamere
  useEffect(() => {
    async function setup() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: 1.77 },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        setStream(media);
        if (cameraRef.current) cameraRef.current.srcObject = media;
      } catch (err) { 
        alert("Kamera nije dostupna. Proverite dozvole."); 
      }
    }
    setup();
    return () => stream?.getTracks().forEach(track => track.stop());
  }, []);

  // 2. Start snimanja
  async function startRecording() {
    if (!stream) return;
    chunksRef.current = [];
    
    const songVideo = document.getElementById("song-video") as HTMLVideoElement;
    if (songVideo) { 
        songVideo.currentTime = 0; 
        await songVideo.play(); 
    }

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
    mediaRecorderRef.current = recorder;
    
    recorder.ondataavailable = (e) => { 
        if (e.data.size > 0) chunksRef.current.push(e.data); 
    };

    recorder.onstop = () => handleUpload(songVideo?.currentTime || 10);
    
    recorder.start();
    setRecording(true);
  }

  // 3. Renderovanje i Čišćenje
  async function handleUpload(duration: number) {
    setLoading(true);
    try {
      const reactionBlob = new Blob(chunksRef.current, { type: "video/webm" });
      const reactionFile = new File([reactionBlob], `react-${Date.now()}.webm`, { type: "video/webm" });

      const formData = new FormData();
      formData.append("reaction", reactionFile);
      formData.append("originalUrl", originalVideo);
      formData.append("duration", duration.toString());

      // Slanje na tvoj Render backend
      const renderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/render-duet`, {
        method: "POST",
        body: formData,
      });

      const renderData = await renderRes.json();
      if (!renderData.videoUrl) throw new Error("Render failed");

      const { data: { user } } = await supabase.auth.getUser();
      const profile = await getProfile();

      // UPIS REAKCIJE U TABELU
      const { error: insertError } = await supabase.from("reactions").insert({
        song: title,
        artist: artist,
        user_id: user?.id,
        username: profile?.username || "anonymous",
        video_url: renderData.videoUrl,
      });

      if (!insertError) {
        // --- LOGIKA ČIŠĆENJA (SAMO AKO JE TEMP) ---
        if (isTemporary) {
          console.log("Korisnički duet završen - počinjem brisanje originala...");
          
          // Izvlačenje imena fajla iz punog URL-a
          const fileName = originalVideo.split('/').pop();

          if (fileName) {
            // A) Brisanje iz Storage-a (songs bucket)
            const { error: storageErr } = await supabase.storage
                .from("songs")
                .remove([fileName]);
            
            if (storageErr) console.error("Storage delete error:", storageErr.message);

            // B) Brisanje iz tabele 'songs'
            const { error: dbErr } = await supabase
                .from("songs")
                .delete()
                .eq("video_url", originalVideo);
            
            if (dbErr) console.error("Database delete error:", dbErr.message);
            
            console.log("Originalni video je uspešno uklonjen.");
          }
        }

        alert("Objavljeno! Vaš duet je spreman.");
        window.location.href = "/";
      }

    } catch (err: any) {
      alert("Greška pri obradi: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center p-4">
      {/* PREVIEW KAMERE */}
      <div className="w-full max-w-[400px] aspect-video bg-black rounded-[2.5rem] overflow-hidden border-4 border-zinc-800 relative shadow-2xl">
        <video 
            ref={cameraRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover" 
        />
        {recording && (
            <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full">
                <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
                <span className="text-white text-[10px] font-black tracking-widest uppercase">Recording</span>
            </div>
        )}
      </div>

      {/* KONTROLE */}
      <div className="mt-10 w-full max-w-[400px]">
        {!recording && !loading && (
          <button 
            onClick={startRecording} 
            className="w-full bg-red-600 hover:bg-red-500 text-white py-6 rounded-[2rem] font-black text-2xl shadow-xl shadow-red-900/30 transition active:scale-95"
          >
            RECORD
          </button>
        )}
        
        {recording && (
          <button 
            onClick={() => mediaRecorderRef.current?.stop()} 
            className="w-full bg-white text-black py-6 rounded-[2rem] font-black text-2xl shadow-xl transition active:scale-95"
          >
            PUBLISH
          </button>
        )}

        {loading && (
          <div className="text-center py-6">
            <p className="text-zinc-500 font-black text-lg animate-pulse tracking-tighter uppercase">
              Obrada videa...
            </p>
            <p className="text-zinc-700 text-xs mt-1">Spajamo tvoj glas sa pesmom</p>
          </div>
        )}
      </div>
    </div>
  );
}