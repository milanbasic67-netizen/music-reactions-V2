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

  // 1. UCITAVANJE PROFILA I PROVERA LAJKA
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

  // 2. AUTOPLAY LOGIKA (TikTok stil)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true; // Forsiramo mute za autoplay

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.7 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // 3. TOGGLE SOUND
  function toggleSound() {
    if (!videoRef.current) return;
    const newState = !muted;
    videoRef.current.muted = newState;
    setMuted(newState);
  }

  // 4. LIKE LOGIC
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

  // 5. SHARE
  async function shareVideo() {
    await navigator.clipboard.writeText(`${window.location.origin}/reaction/${reaction.id}`);
    alert("Link copied!");
  }

  // 6. ADMIN DELETE (Briše bazu i Storage fajl)
  async function deleteReaction() {
    // Provera da li je ulogovan admin
    if (profile?.role !== "admin") {
      alert("Samo administrator može brisati objave.");
      return;
    }

    const confirmed = confirm("Da li sigurno želiš da obrišeš ovaj duet i trajno ukloniš video?");
    if (!confirmed) return;

    try {
      // Putanja do fajla u storage-u (buket: videos, folder: duets)
      // Primer URL-a: .../videos/duets/tiktok-123.mp4 -> uzimamo "duets/tiktok-123.mp4"
      const videoUrl = reaction.video_url;
      const storagePath = videoUrl.split("/videos/")[1];

      if (storagePath) {
        await supabase.storage.from("videos").remove([storagePath]);
      }

      // Brišemo lajkove pa reakciju
      await supabase.from("likes").delete().eq("reaction_id", reaction.id);
      const { error } = await supabase.from("reactions").delete().eq("id", reaction.id);

      if (error) throw error;

      alert("Obrisano!");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Greška pri brisanju.");
    }
  }

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-black snap-start flex items-center justify-center">
      
      {/* VIDEO - 9:16 TikTok Format */}
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
      <div className="absolute inset-0 z-10 flex">
        
        {/* LEVA STRANA - INFO O PESMI */}
        <div className="flex-1 flex flex-col justify-end p-6 mb-20">
          <Link href={`/u/${reaction.username}`} className="font-black text-2xl text-white hover:underline">
            @{reaction.username}
          </Link>
          <h2 className="text-lg mt-3 font-bold text-white truncate w-[70%]">
            {reaction.song}
          </h2>
          <p className="text-zinc-300 mt-1">{reaction.artist}</p>
        </div>

        {/* DESNA STRANA - DUGMIĆI */}
        <div className="w-24 flex flex-col items-center justify-end gap-6 pb-32 pr-2">
          
          {/* LIKE */}
          <button onClick={toggleLike} className="flex flex-col items-center group">
            <div className={`p-3 rounded-full bg-black/20 backdrop-blur-sm transition ${liked ? 'text-red-500' : 'text-white'}`}>
                <Heart className={`w-8 h-8 ${liked ? 'fill-current' : ''}`} />
            </div>
            <span className="text-white text-xs mt-1 font-bold">{likesCount}</span>
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