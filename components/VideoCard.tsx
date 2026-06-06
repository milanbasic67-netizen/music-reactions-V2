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
  const [likesCount, setLikesCount] = useState(reaction.likes_count || 0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    async function load() {
      const p = await getProfile();
      setProfile(p);
      if (p) {
        const { data: existing } = await supabase
          .from("likes")
          .select("*")
          .eq("reaction_id", reaction.id)
          .eq("user_id", p.id)
          .single();
        if (existing) setLiked(true);
      }
    }
    load();
  }, [reaction.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.7 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function toggleSound() {
    if (!videoRef.current) return;
    const newState = !muted;
    videoRef.current.muted = newState;
    setMuted(newState);
  }

  async function toggleLike() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Login required");

    if (liked) {
      await supabase.from("likes").delete().eq("reaction_id", reaction.id).eq("user_id", user.id);
      setLiked(false);
      setLikesCount((prev: number) => prev - 1);
    } else {
      await supabase.from("likes").insert({ reaction_id: reaction.id, user_id: user.id });
      setLiked(true);
      setLikesCount((prev: number) => prev + 1);
    }
  }

  async function shareVideo() {
    await navigator.clipboard.writeText(`${window.location.origin}/reaction/${reaction.id}`);
    alert("Link copied!");
  }

  async function deleteReaction() {
    if (profile?.role !== "admin") return;
    const confirmed = confirm("Obrisati trajno?");
    if (!confirmed) return;
    try {
      const videoUrl = reaction.video_url;
      const storagePath = videoUrl.split("/videos/")[1];
      if (storagePath) await supabase.storage.from("videos").remove([storagePath]);
      await supabase.from("likes").delete().eq("reaction_id", reaction.id);
      await supabase.from("reactions").delete().eq("id", reaction.id);
      window.location.reload();
    } catch (err) { alert("Greška pri brisanju."); }
  }

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-black snap-start flex items-center justify-center">
      
      <video
        ref={videoRef}
        src={reaction.video_url}
        loop
        playsInline
        muted={muted}
        preload="metadata"
        className="w-full h-full object-cover z-0"
      />

      {/* OVERLAY ZA KONTROLE */}
      <div className="absolute inset-0 z-10 flex w-full h-full">
        
        {/* LEVA STRANA - INFO */}
        <div className="flex-1 flex flex-col justify-end p-6 mb-16">
          <Link href={`/u/${reaction.username}`} className="font-black text-xl text-white drop-shadow-lg">
            @{reaction.username}
          </Link>
          <h2 className="text-white font-bold mt-2 drop-shadow-md truncate w-[80%]">
            {reaction.song} - {reaction.artist}
          </h2>
        </div>

        {/* DESNA STRANA - IKONICE (LIKES, COMMENTS, SHARE, SOUND) */}
        <div className="w-20 flex flex-col items-center justify-end gap-5 pb-24 pr-2">
          
          {/* LIKE */}
          <button onClick={toggleLike} className="flex flex-col items-center">
            <div className={`p-3 rounded-full bg-black/20 backdrop-blur-sm ${liked ? 'text-red-500' : 'text-white'}`}>
                <Heart className={`w-8 h-8 ${liked ? 'fill-current' : ''}`} />
            </div>
            <span className="text-white text-xs font-bold mt-1 drop-shadow-md">{likesCount}</span>
          </button>

          {/* COMMENT (Sada dodato) */}
          <button onClick={() => alert("Comments coming soon!")} className="flex flex-col items-center">
            <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm text-white">
                <MessageCircle className="w-8 h-8" />
            </div>
            <span className="text-white text-xs font-bold mt-1 drop-shadow-md">0</span>
          </button>

          {/* SHARE */}
          <button onClick={shareVideo}>
            <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm text-white">
                <Share className="w-8 h-8" />
            </div>
          </button>

          {/* SOUND */}
          <button onClick={toggleSound}>
            <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm text-white">
                {muted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
            </div>
          </button>

          {/* ADMIN DELETE */}
          {profile?.role === "admin" && (
            <button onClick={deleteReaction} className="p-3 rounded-full bg-red-600/40 text-white">
                <Trash2 className="w-8 h-8" />
            </button>
          )}

        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-5" />
    </div>
  );
}