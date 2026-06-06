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

type Props = {
  reaction: any;
};

export default function VideoCard({ reaction }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [muted, setMuted] = useState(true);

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
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-black snap-start">
      
      {/* 1. VIDEO - object-cover je ključan za mobilni */}
      <video
        ref={videoRef}
        src={reaction.video_url}
        loop
        playsInline
        muted={muted}
        className="absolute inset-0 w-full h-full object-cover z-0"
        onClick={() => setMuted(!muted)}
      />

      {/* 2. GRADIENT (Bolja čitljivost teksta) */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />

      {/* 3. INFO O PESMI (Dole levo) */}
      <div className="absolute bottom-8 left-4 z-20 w-[70%] pointer-events-none">
        <Link href={`/u/${reaction.username}`} className="pointer-events-auto inline-block">
          <span className="font-black text-white text-lg drop-shadow-lg">@{reaction.username || "user"}</span>
        </Link>
        <h2 className="text-white text-sm mt-2 font-medium drop-shadow-md line-clamp-2">
          {reaction.song}
        </h2>
        <p className="text-zinc-400 text-xs mt-1">{reaction.artist}</p>
      </div>

      {/* 4. IKONICE - APSOLUTNO POZICIONIRANE ZA MOBILNI (z-30) */}
      <div className="absolute right-4 bottom-24 z-30 flex flex-col items-center gap-6">
        
        {/* LIKE */}
        <button onClick={toggleLike} className="flex flex-col items-center">
          <div className={`p-3 rounded-full bg-black/40 backdrop-blur-md transition-transform active:scale-125 ${liked ? 'text-red-500' : 'text-white'}`}>
            <Heart className={`w-7 h-7 ${liked ? 'fill-current' : ''}`} />
          </div>
          <span className="text-white text-[11px] font-bold mt-1 drop-shadow-lg">{likesCount}</span>
        </button>

        {/* COMMENT */}
        <button onClick={() => alert("Komentari uskoro")} className="flex flex-col items-center">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white">
            <MessageCircle className="w-7 h-7" />
          </div>
          <span className="text-white text-[11px] font-bold mt-1 drop-shadow-lg">0</span>
        </button>

        {/* SHARE */}
        <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Kopirano!"); }}>
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white">
            <Share className="w-7 h-7" />
          </div>
        </button>

        {/* SOUND */}
        <button onClick={() => setMuted(!muted)}>
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white">
            {muted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
          </div>
        </button>

        {/* DELETE (Samo za admine) */}
        {profile?.role === "admin" && (
            <button onClick={async () => {
                if(confirm("Obriši?")) {
                    await supabase.from("reactions").delete().eq("id", reaction.id);
                    window.location.reload();
                }
            }} className="p-3 rounded-full bg-red-600/40 text-white">
                <Trash2 className="w-7 h-7" />
            </button>
        )}
      </div>

    </div>
  );
}