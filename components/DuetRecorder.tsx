"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";

type Props = { originalVideo: string; title: string; artist: string; };

export default function DuetRecorder({ originalVideo, title, artist }: Props) {
  const cameraRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function setupCamera() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(media);
        if (cameraRef.current) cameraRef.current.srcObject = media;
      } catch (err) { console.error("Camera error", err); }
    }
    setupCamera();
  }, []);

  const startRecording = async () => {
    if (!stream) return;
    chunksRef.current = [];
    const songVideo = document.getElementById("song-video") as HTMLVideoElement;

    if (songVideo) {
      songVideo.currentTime = 0;
      await songVideo.play();
    }

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
      const file = new File([blob], `reaction-${Date.now()}.webm`, { type: "video/webm" });

      const formData = new FormData();
      formData.append("reaction", file);
      formData.append("originalUrl", originalVideo);
      formData.append("duration", duration.toString());

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/render-duet`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.videoUrl) throw new Error("Render failed");

      const { data: { user } } = await supabase.auth.getUser();
      const profile = await getProfile();

      await supabase.from("reactions").insert({
        song: title, artist, user_id: user?.id,
        username: profile?.username, video_url: data.videoUrl
      });

      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <div className="w-full max-w-[300px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-zinc-800">
        <video ref={cameraRef} autoPlay muted playsInline className="w-full h-full object-cover" />
      </div>
      
      <div className="mt-8 w-full max-w-[300px]">
        {!recording && !loading && (
          <button onClick={startRecording} className="w-full bg-red-600 text-white py-4 rounded-full font-bold text-xl shadow-lg active:scale-95 transition">
            START DUET
          </button>
        )}
        {recording && (
          <button onClick={stopRecording} className="w-full bg-white text-black py-4 rounded-full font-bold text-xl shadow-lg active:scale-95 transition">
            STOP & RENDER
          </button>
        )}
        {loading && (
          <div className="text-center animate-pulse font-bold text-zinc-400">
            Mixing TikTok Duet...
          </div>
        )}
      </div>
    </div>
  );
}