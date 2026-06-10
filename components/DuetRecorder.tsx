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
  const isTemporary = searchParams.get("temp") === "true"; // Whether to delete the original after duet

  const cameraRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // 1. Camera setup
  useEffect(() => {
    async function setup() {
      stream?.getTracks().forEach(track => track.stop());
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        setStream(media);
        if (cameraRef.current) cameraRef.current.srcObject = media;
      } catch (err) {
        alert("Camera not available. Check permissions.");
      }
    }
    setup();
    return () => stream?.getTracks().forEach(track => track.stop());
  }, [facingMode]);

  // 2. Start recording
  async function startRecording() {
    if (!stream) return;
    chunksRef.current = [];
    
    const songVideo = document.getElementById("song-video") as HTMLVideoElement;
    if (songVideo) { 
        songVideo.currentTime = 0; 
        await songVideo.play(); 
    }

    const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(
      (t) => MediaRecorder.isTypeSupported(t)
    ) || "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;
    
    recorder.ondataavailable = (e) => { 
        if (e.data.size > 0) chunksRef.current.push(e.data); 
    };

    recorder.onstop = () => handleUpload(songVideo?.currentTime || 10);
    
    recorder.start();
    setRecording(true);
  }

  // 3. Rendering and Cleanup
  async function handleUpload(duration: number) {
    setLoading(true);
    try {
      const reactionBlob = new Blob(chunksRef.current, { type: "video/webm" });
      const reactionFile = new File([reactionBlob], `react-${Date.now()}.webm`, { type: "video/webm" });

      const formData = new FormData();
      formData.append("reaction", reactionFile);
      formData.append("originalUrl", originalVideo);
      formData.append("duration", duration.toString());

      // Send to Render backend
      const { data: { session } } = await supabase.auth.getSession();
      const renderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/render-duet`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });

      const renderData = await renderRes.json();
      if (!renderData.videoUrl) throw new Error("Render failed");

      const { data: { user } } = await supabase.auth.getUser();
      const profile = await getProfile();

      // INSERT REACTION INTO TABLE
      const { error: insertError } = await supabase.from("reactions").insert({
        song: title,
        artist: artist,
        user_id: user?.id,
        username: profile?.username || "anonymous",
        video_url: renderData.videoUrl,
      });

      if (!insertError) {
        // --- CLEANUP LOGIC (ONLY IF TEMP) ---
        if (isTemporary) {
          // Extract filename from full URL
          const fileName = originalVideo.split('/').pop();

          if (fileName) {
            // A) Delete from Storage (songs bucket)
            await supabase.storage.from("songs").remove([fileName]);

            // B) Delete from 'songs' table
            await supabase.from("songs").delete().eq("video_url", originalVideo);
          }
        }

        alert("Published! Your duet is ready.");
        window.location.href = "/";
      }

    } catch (err: any) {
      alert("Processing error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center p-4">
      {/* PREVIEW KAMERE */}
      <div className="w-full max-w-[400px] aspect-video bg-black rounded-[2.5rem] overflow-hidden border-4 border-white/10 relative shadow-2xl">
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
        {!recording && (
          <button
            onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")}
            className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-full text-white text-xl"
          >
            🔄
          </button>
        )}
      </div>

      {/* KONTROLE */}
      <div className="mt-10 w-full max-w-[400px]">
        {!recording && !loading && (
          <button 
            onClick={startRecording} 
            className="w-full bg-violet-600 hover:bg-violet-500 text-white py-6 rounded-[2rem] font-black text-2xl shadow-xl shadow-violet-900/30 transition active:scale-95"
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
            <p className="text-slate-500 font-black text-lg animate-pulse tracking-tighter uppercase">
              Video processing...
            </p>
            <p className="text-slate-600 text-xs mt-1">Merging your voice with the song</p>
          </div>
        )}
      </div>
    </div>
  );
}