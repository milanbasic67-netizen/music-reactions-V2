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
  const isTemporary = searchParams.get("temp") === "true"; // Provera da li brišemo

  const cameraRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: 1.77 },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        setStream(media);
        if (cameraRef.current) cameraRef.current.srcObject = media;
      } catch (err) { alert("Kamera nije dostupna."); }
    }
    setup();
    return () => stream?.getTracks().forEach(track => track.stop());
  }, []);

  async function startRecording() {
    if (!stream) return;
    chunksRef.current = [];
    const songVideo = document.getElementById("song-video") as HTMLVideoElement;
    if (songVideo) { songVideo.currentTime = 0; await songVideo.play(); }

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => handleUpload(songVideo?.currentTime || 10);
    recorder.start();
    setRecording(true);
  }

  async function handleUpload(duration: number) {
    setLoading(true);
    try {
      const reactionBlob = new Blob(chunksRef.current, { type: "video/webm" });
      const reactionFile = new File([reactionBlob], `react-${Date.now()}.webm`, { type: "video/webm" });

      const formData = new FormData();
      formData.append("reaction", reactionFile);
      formData.append("originalUrl", originalVideo);
      formData.append("duration", duration.toString());

      const renderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/render-duet`, {
        method: "POST",
        body: formData,
      });

      const renderData = await renderRes.json();
      if (!renderData.videoUrl) throw new Error("Render failed");

      const { data: { user } } = await supabase.auth.getUser();
      const profile = await getProfile();

      // 1. UPIS REAKCIJE
      const { error: insertError } = await supabase.from("reactions").insert({
        song: title,
        artist: artist,
        user_id: user?.id,
        username: profile?.username || "anonymous",
        video_url: renderData.videoUrl,
      });

      if (!insertError) {
        // 2. ČIŠĆENJE ORIGINALA (Ako je TEMP)
        if (isTemporary) {
          const fileName = originalVideo.split('/').pop();
          if (fileName) {
            await supabase.storage.from("songs").remove([fileName]);
            await supabase.from("songs").delete().eq("video_url", originalVideo);
          }
        }
        alert("Objavljeno!");
        window.location.href = "/";
      }

    } catch (err: any) {
      alert("Greška: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center p-4">
      <div className="w-full max-w-[400px] aspect-video bg-black rounded-3xl overflow-hidden border-4 border-zinc-800 relative">
        <video ref={cameraRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        {recording && <div className="absolute top-4 right-4 w-3 h-3 bg-red-600 rounded-full animate-pulse" />}
      </div>

      <div className="mt-8 w-full max-w-[400px]">
        {!recording && !loading && (
          <button onClick={startRecording} className="w-full bg-red-600 py-5 rounded-2xl font-black text-xl">RECORD</button>
        )}
        {recording && (
          <button onClick={() => mediaRecorderRef.current?.stop()} className="w-full bg-white text-black py-5 rounded-2xl font-black text-xl">PUBLISH</button>
        )}
        {loading && <p className="text-center animate-pulse font-bold text-zinc-500">OBRADA VIDEA...</p>}
      </div>
    </div>
  );
}