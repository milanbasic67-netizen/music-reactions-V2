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
      // Putanja do fajla u storage-u
      const videoUrl = reaction.video_url;
      const storagePath = videoUrl.split("/videos/")[1];

      if (storagePath) {
        console.log("Brišem fajl:", storagePath);
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
      
      {/* VIDEO - 9:16 TikTok Format (1080x1920) */}
      <video
        ref={videoRef}
        src={reaction.video_url}
        loop
        playsInline
        muted={muted}
        preload="metadata"
        // object-cover osigurava da 9:16 video popuni ceo 100dvh ekran
        className="w-full h-full object-cover z-0"
      />

      {/* OVERLAY ZA KONTROLE */}
      <div className="absolute inset-0 z-10 flex">
        
        {/* LEVA STRANA - INFO O PESMI */}
        <div className="flex-1 flex flex-col justify-end p-6 mb-20">
          <Link href={`/u/${reaction.username}`} className="font-black text-2xl text-white hover:underline drop-shadow-lg">
            @{reaction.username}
          </Link>
          <h2 className="text-lg mt-3 font-bold text-white truncate w-[70%] drop-shadow-md">
            {reaction.song}
          </h2>
          <p className="text-zinc-300 mt-1 drop-shadow-md">{reaction.artist}</p>
        </div>

        {/* DESNA STRANA - DUGMIĆI */}
        <div className="w-24 flex flex-col items-center justify-end gap-6 pb-32 pr-2">
          
          {/* LIKE */}
          <button onClick={toggleLike} className="flex flex-col items-center group">
            <div className={`p-3 rounded-full bg-black/30 backdrop-blur-md transition ${liked ? 'text-red-500' : 'text-white'}`}>
                <Heart className={`w-8 h-8 ${liked ? 'fill-current' : ''}`} />
            </div>
            <span className="text-white text-xs mt-1 font-bold drop-shadow-md">{likesCount}</span>
          </button>

          {/* SHARE */}
          <button onClick={shareVideo}>
            <div className="p-3 rounded-full bg-black/30 backdrop-blur-md text-white">
                <Share className="w-8 h-8" />
            </div>
          </button>

          {/* SOUND */}
          <button onClick={toggleSound}>
            <div className="p-3 rounded-full bg-black/30 backdrop-blur-md text-white">
                {muted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
            </div>
          </button>

          {/* DELETE (Pojavljuje se samo Adminu) */}
          {profile?.role === "admin" && (
            <button onClick={deleteReaction} className="mt-4 p-3 rounded-full bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition">
                <Trash2 className="w-8 h-8" />
            </button>
          )}

        </div>

      </div>

      {/* GRADIENT ZA BOLJU ČITLJIVOST (Dole) */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-5" />

    </div>
  );
}