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

  useEffect(() => {
    async function setup() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { width: 720, height: 1280 },
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        setStream(media);
        if (cameraRef.current) cameraRef.current.srcObject = media;
      } catch (err) {
        console.error("Camera error:", err);
      }
    }
    setup();
    return () => stream?.getTracks().forEach(track => track.stop());
  }, []);

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

    recorder.onstop = async () => {
      await handleUpload(songVideo?.currentTime || 0);
    };

    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      const songVideo = document.getElementById("song-video") as HTMLVideoElement;
      if (songVideo) songVideo.pause();
      setRecording(false);
    }
  }

  async function handleUpload(duration: number) {
    setLoading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const file = new File([blob], `reaction-${Date.now()}.webm`, { type: "video/webm" });

      const formData = new FormData();
      formData.append("originalUrl", originalVideo);
      formData.append("reaction", file);
      formData.append("duration", duration.toString());

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/render-duet`, {
        method: "POST",
        body: formData,
      });

      const renderData = await res.json();
      if (!renderData.videoUrl) throw new Error("Render failed");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const profile = await getProfile();
      
      const { error: insertError } = await supabase.from("reactions").insert({
        song: title,
        artist,
        user_id: user.id,
        username: profile?.username,
        video_url: renderData.videoUrl,
      });

      if (insertError) throw insertError;

      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("Something went wrong during upload/render.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 flex flex-col items-center">
      <div className="rounded-2xl overflow-hidden bg-black mb-4 h-[160px] w-[110px] border border-zinc-800 shadow-2xl">
        <video ref={cameraRef} autoPlay muted playsInline className="w-full h-full object-cover" />
      </div>

      {!recording && !loading && (
        <button onClick={startRecording} className="w-full max-w-xs bg-red-600 hover:bg-red-500 py-3 rounded-2xl font-black text-lg text-white">
          Start Duet
        </button>
      )}

      {recording && (
        <button onClick={stopRecording} className="w-full max-w-xs bg-white text-black py-3 rounded-2xl font-black text-lg">
          Stop Recording
        </button>
      )}

      {loading && <div className="text-center text-zinc-400 font-black mt-4 animate-pulse">Mixing your duet...</div>}
    </div>
  );
}