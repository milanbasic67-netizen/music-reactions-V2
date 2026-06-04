"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";

export default function DuetRecorder({ originalVideo, title, artist }: { originalVideo: string, title: string, artist: string }) {
  const cameraRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function setupCamera() {
      try {
        // FORSIRAMO 16:9 ASPECT RATIO
        const media = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: 1.7777777778 
          }, 
          audio: true 
        });
        setStream(media);
        if (cameraRef.current) cameraRef.current.srcObject = media;
      } catch (err) {
        console.error("Camera error", err);
      }
    }
    setupCamera();
  }, []);

  const startRecording = async () => {
    if (!stream) return;
    chunksRef.current = [];
    const songVideo = document.getElementById("song-video") as HTMLVideoElement;
    if (songVideo) { songVideo.currentTime = 0; await songVideo.play(); }

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => handleUpload(songVideo?.currentTime || 0);
    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      const songVideo = document.getElementById("song-video") as HTMLVideoElement;
      if (songVideo) songVideo.pause();
    }
  };

  const handleUpload = async (duration: number) => {
    setLoading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const file = new File([blob], `reaction.webm`, { type: "video/webm" });
      const formData = new FormData();
      formData.append("reaction", file);
      formData.append("originalUrl", originalVideo);
      formData.append("duration", duration.toString());

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/render-duet`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.videoUrl) window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("Render failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col items-center p-4">
      {/* 16:9 PREVIEW BOX */}
      <div className="w-full max-w-[400px] aspect-video bg-black rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-xl">
        <video ref={cameraRef} autoPlay muted playsInline className="w-full h-full object-cover" />
      </div>
      
      <div className="mt-6 w-full max-w-[400px]">
        {!recording && !loading && (
          <button onClick={startRecording} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold">START 16:9 DUET</button>
        )}
        {recording && (
          <button onClick={stopRecording} className="w-full bg-zinc-800 text-white py-4 rounded-2xl font-bold">STOP</button>
        )}
        {loading && <div className="text-center text-zinc-500 animate-pulse">Rendering 16:9 Side-by-Side...</div>}
      </div>
    </div>
  );
}