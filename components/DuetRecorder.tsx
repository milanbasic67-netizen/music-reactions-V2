"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";

type Props = {
  originalVideo: string;
  title: string;
  artist: string;
};

export default function DuetRecorder({ originalVideo, title, artist }: Props) {
  const cameraRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. PODEŠAVANJE KAMERE (16:9 FORMAT)
  useEffect(() => {
    async function setup() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: 1.7777777778, // 16:9
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        setStream(media);
        if (cameraRef.current) {
          cameraRef.current.srcObject = media;
        }
      } catch (err) {
        console.error("Greška sa kamerom:", err);
        alert("Nije moguće pristupiti kameri.");
      }
    }
    setup();

    // Čišćenje kamere pri odlasku sa stranice
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // 2. POČETAK SNIMANJA
  async function startRecording() {
    try {
      if (!stream) return;
      chunksRef.current = [];

      const songVideo = document.getElementById("song-video") as HTMLVideoElement;
      if (songVideo) {
        songVideo.currentTime = 0;
        await songVideo.play();
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8,opus",
      });

      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Kada se snimanje završi, automatski pokrećemo upload
      recorder.onstop = () => {
        const finalDur = songVideo?.currentTime || 0;
        handleUpload(finalDur);
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Greška pri pokretanju snimanja:", err);
    }
  }

  // 3. STOPIRANJE SNIMANJA
  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      
      const songVideo = document.getElementById("song-video") as HTMLVideoElement;
      if (songVideo) songVideo.pause();
    }
  }

  // 4. OBRADA, RENDER I UPIS U BAZU
  async function handleUpload(duration: number) {
    setLoading(true);
    console.log("Proces započet. Trajanje:", duration);

    try {
      // Kreiramo fajl od snimaka
      const reactionBlob = new Blob(chunksRef.current, { type: "video/webm" });
      const reactionFile = new File([reactionBlob], `react-${Date.now()}.webm`, { type: "video/webm" });

      const formData = new FormData();
      formData.append("reaction", reactionFile);
      formData.append("originalUrl", originalVideo);
      formData.append("duration", duration.toString());

      // Šaljemo na naš backend za renderovanje
      console.log("Šaljem na render...");
      const renderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/render-duet`, {
        method: "POST",
        body: formData,
      });

      const renderData = await renderRes.json();
      
      if (!renderData.videoUrl) {
        throw new Error("Render server nije vratio video URL");
      }

      console.log("Render uspešan. Video URL:", renderData.videoUrl);

      // DOBIJAMO PODATKE O KORISNIKU
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Korisnik nije ulogovan.");

      const profile = await getProfile();

      // UPIS U TABELU REACTIONS (Ključni momenat)
      console.log("Upisujem u tabelu 'reactions'...");
      const { error: insertError } = await supabase.from("reactions").insert({
        song: title,
        artist: artist,
        user_id: user.id,
        username: profile?.username || "anonymous",
        video_url: renderData.videoUrl, // URL sa Supabase Storage-a koji je vratio backend
      });

      if (insertError) {
        console.error("Greška pri upisu u bazu:", insertError.message);
        alert("Greška pri čuvanju podataka: " + insertError.message);
        return;
      }

      console.log("Sve je uspešno obavljeno!");
      alert("Reakcija je uspešno objavljena!");
      
      // Redirect na home
      window.location.href = "/";

    } catch (err: any) {
      console.error("Greška u handleUpload:", err);
      alert("Došlo je do greške: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center p-4">
      
      {/* KAMERA PREVIEW (16:9) */}
      <div className="w-full max-w-[400px] aspect-video bg-black rounded-3xl overflow-hidden border-4 border-zinc-800 shadow-2xl relative">
        <video
          ref={cameraRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {recording && (
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold uppercase tracking-widest">REC</span>
          </div>
        )}
      </div>

      <div className="mt-8 w-full max-w-[400px]">
        {!recording && !loading && (
          <button
            onClick={startRecording}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-5 rounded-2xl font-black text-xl shadow-lg transition active:scale-95"
          >
            RECORD
          </button>
        )}

        {recording && (
          <button
            onClick={stopRecording}
            className="w-full bg-white hover:bg-zinc-200 text-black py-5 rounded-2xl font-black text-xl shadow-lg transition active:scale-95"
          >
            PUBLISH
          </button>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
            <p className="text-zinc-400 font-bold animate-pulse text-sm">
              WORKING...
            </p>
          </div>
        )}
      </div>

      {/* Info o pesmi */}
      <div className="mt-10 text-center">
        <p className="text-zinc-500 text-xs uppercase tracking-widest">Snimate reakciju na:</p>
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <p className="text-zinc-400 text-sm">{artist}</p>
      </div>
    </div>
  );
}