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
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.6 });
    observer.observe(video);
    return () => observer.disconnect();
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
      
      {/* GLAVNI KONTEJNER (Širina telefona na desktopu) */}
      <div className="relative h-full aspect-[9/16] w-full max-w-[480px] bg-black shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden border-x border-zinc-900">
        
        <video
          ref={videoRef}
          src={reaction.video_url}
          loop
          playsInline
          muted={muted}
          className="absolute inset-0 w-full h-full object-cover z-0"
          onClick={() => setMuted(!muted)}
        />

        {/* GRADIENT SENKA ZA BOLJU VIDLJIVOST TEKSTA */}
        <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none z-10" />

        {/* INFO INFO BOX */}
        <div className