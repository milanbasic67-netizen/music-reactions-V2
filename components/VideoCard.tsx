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
  const [likesCount, setLikesCount] = useState(0);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!reaction) return;
    setLikesCount(reaction.likes_count || 0);
    async function load() {
      const p = await getProfile();
      setProfile(p);
      if (p && reaction.id) {
        const { data } = await supabase.from("likes").select("*").eq("reaction_id", reaction.id).eq("user_id", p.id).single();
        if (data) setLiked(true);
      }
    }
    load();
  }, [reaction]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const p = (video.currentTime / video.duration) * 100;
      setProgress(p);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.6 });

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  async function toggleLike() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Login required");
    if (liked) {
      await supabase.from("likes").delete().eq("reaction_id", reaction.id).eq("user_id", user.id);
      setLiked(false);
      setLikesCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from("likes").insert({ reaction_id: reaction.id, user_id: user.id });
      setLiked(true);
      setLikesCount(prev => prev + 1);
    }
  }

  if (!reaction) return null;

  return (
    <div className="relative h-[100dvh] w-full bg-zinc-950 snap-start flex justify-center overflow-hidden">
      
      {/* KONTEJNER (Širina telefona na desktopu) */}
      <div className="relative h-full aspect-[9/16] w-full max-w-[480px] bg-black shadow-2xl overflow-hidden border-x border-zinc-900">
        
        <video
          ref={videoRef}
          src={reaction.video_url}
          loop
          playsInline
          muted={muted}
          className="absolute inset-0 w-full h-full object-cover z-0"
          onClick={() => setMuted(!muted)}
        />

        {/* PROGRESS BAR (Dodato) */}
        <div className="absolute bottom-0 left-0 h-1 bg-red-600 z-50 transition-all duration-100" style={{ width: `${progress}%` }} />

        <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none z-10" />

        {/* INFO BOX */}
        <div className="absolute bottom-10 left-5 z-20 w-[75%] pointer-events-none text-left">
          <Link href={`/u/${reaction.username}`} className="pointer-events-auto inline-block">
            <span className="font-black text-white text-xl drop-shadow-md hover:underline decoration-red-600 underline-offset-4">
                @{reaction.username || "user"}
            </span>
          </Link>
          <h2 className="text-white text-sm mt-3 font-medium drop-shadow-md line-clamp-2 leading-relaxed">
            {reaction.song}
          </h2>
          <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest mt-1">{reaction.artist}</p>
        </div>

        {/* IKONICE */}
        <div className="absolute right-4 bottom-24 z-30 flex flex-col items-center gap-7">
          
          <button onClick={toggleLike} className="flex flex-col items-center group">
            <div className={`p-3.5 rounded-full bg-black/40 backdrop-blur-md transition-all group-active:scale-125 ${liked ? 'text-red-500' : 'text-white'}`}>
              <Heart className={`w-7 h-7 ${liked ? 'fill-current' : ''}`} />
            </div>
            <span className="text-white text-[11px] font-bold mt-1.5 drop-shadow-lg">{likesCount}</span>
          </button>

          <button onClick={() => setShowComments(true)} className="flex flex-col items-center group">
            <div className="p-3.5 rounded-full bg-black/40 backdrop-blur-md text-white transition-all group-active:scale-110">
              <MessageCircle className="w-7 h-7" />
            </div>
            <span className="text-white text-[11px] font-bold mt-1.5 drop-shadow-lg">0</span>
          </button>

          <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Kopirano!"); }}>
            <div className="p-3.5 rounded-full bg-black/40 backdrop-blur-md text-white transition-all">
              <Share className="w-7 h-7" />
            </div>
          </button>

          <button onClick={() => setMuted(!muted)}>
            <div className="p-3.5 rounded-full bg-black/40 backdrop-blur-md text-white">
              {muted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="