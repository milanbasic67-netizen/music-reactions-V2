"use client";

import {
  Heart,
  MessageCircle,
  Share,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import CommentSection from "./CommentSection";

type Props = {
  reaction: any;
};

export default function VideoCard({ reaction }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reaction.likes_count || 0);
  const [isMuted, setIsMuted] = useState(true); // Globalni state zvuka
  const [showComments, setShowComments] = useState(false);
  const [progress, setProgress] = useState(0);

  // 1. SINHRONIZACIJA ZVUKA KROZ CEO FEED
  useEffect(() => {
    const syncMute = (e: any) => {
      setIsMuted(e.detail.muted);
      if (videoRef.current) videoRef.current.muted = e.detail.muted;
    };
    window.addEventListener("videoVolumeToggle", syncMute);
    return () => window.removeEventListener("videoVolumeToggle", syncMute);
  }, []);

  // 2. LOAD PROFILE & LIKE STATUS
  useEffect(() => {
    async function init() {
      const p = await getProfile();
      setProfile(p);
      if (p && reaction.id) {
        const { data } = await supabase
          .from("likes")
          .select("*")
          .eq("reaction_id", reaction.id)
          .eq("user_id", p.id)
          .single();
        if (data) setLiked(true);
      }
    }
    init();
  }, [reaction.id]);

  // 3. AUTOPLAY & PROGRESS LOGIKA
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener("timeupdate", updateProgress);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.muted = isMuted; // Primenjuje globalno stanje pri ulasku u kadar
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      video.removeEventListener("timeupdate", updateProgress);
    };
  }, [isMuted]);

  // HANDLERI
  const toggleMute = () => {
    const newMutedState = !isMuted;
    window.dispatchEvent(new CustomEvent("videoVolumeToggle", { detail: { muted: newMutedState } }));
  };

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Moraš se prijaviti!");

    if (liked) {
      await supabase.from("likes").delete().eq("reaction_id", reaction.id).eq("user_id", user.id);
      setLiked(false);
      setLikesCount((prev: number) => Math.max(0, prev - 1));
    } else {
      await supabase.from("likes").insert({ reaction_id: reaction.id, user_id: user.id });
      setLiked(true);
      setLikesCount((prev: number) => prev + 1);
    }
  };

  if (!reaction) return null;

  return (
    <div className="relative h-[100dvh] w-full bg-zinc-950 snap-start flex justify-center overflow-hidden">
      <div className="relative h-full aspect-[9/16] w-full max-w-[480px] bg-black shadow-2xl border-x border-zinc-900">
        
        {/* VIDEO ELEMENT */}
        <video
          ref={videoRef}
          src={reaction.video_url}
          loop
          playsInline
          muted={isMuted}
          className="absolute inset-0 w-full h-full object-cover z-0 cursor-pointer"
          onClick={toggleMute}
        />

        {/* PROGRESS BAR */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-red-600 z-50 transition-all duration-100" 
          style={{ width: `${progress}%` }} 
        />

        {/* OVERLAY GRADIENT */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-10" />

        {/* INFO SEKCIJA */}
        <div className="absolute bottom-10 left-5 z-20 w-[75%] pointer-events-none">
          <Link href={`/u/${reaction.username}`} className="pointer-events-auto">
            <span className="font-black text-white text-xl drop-shadow-md hover:text-red-500 transition-colors">
              @{reaction.username || "user"}
            </span>
          </Link>
          <h2 className="text-white text-sm mt-2 font-medium drop-shadow-md line-clamp-2">
            {reaction.song}
          </h2>
          <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest">{reaction.artist}</p>
        </div>

        {/* AKCIJE (DESNO) */}
        <div className="absolute right-4 bottom-24 z-30 flex flex-col items-center gap-6">
          <button onClick={handleLike} className="flex flex-col items-center group">
            <div className={`p-3 rounded-full bg-black/40 backdrop-blur-md transition-transform group-active:scale-125 ${liked ? "text-red-500" : "text-white"}`}>
              <Heart className={`w-7 h-7 ${liked ? "fill-current" : ""}`} />
            </div>
            <span className="text-white text-[11px] font-bold mt-1 drop-shadow-lg">{likesCount}</span>
          </button>

          <button onClick={() => setShowComments(true)} className="flex flex-col items-center group">
            <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white group-active:scale-110 transition-transform">
              <MessageCircle className="w-7 h-7" />
            </div>
            <span className="text-white text-[11px] font-bold mt-1 drop-shadow-lg">0</span>
          </button>

          <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link kopiran!"); }}>
            <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white active:scale-90 transition-transform">
              <Share className="w-7 h-7" />
            </div>
          </button>

          <button onClick={toggleMute}>
            <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white active:scale-90 transition-transform">
              {isMuted ? <VolumeX className="w-7 h-7 text-red-500" /> : <Volume2 className="w-7 h-7" />}
            </div>
          </button>

          {profile?.role === "admin" && (
            <button 
              onClick={async () => {
                if(confirm("Obrisati video trajno?")) {
                  const { error } = await supabase.from("reactions").delete().eq("id", reaction.id);
                  if (!error) window.location.reload();
                }
              }} 
              className="p-3 rounded-full bg-red-600/40 text-white hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-7 h-7" />
            </button>
          )}
        </div>

        {showComments && (
          <CommentSection 
            reactionId={reaction.id} 
            onClose={() => setShowComments(false)} 
          />
        )}
      </div>
    </div>
  );
}