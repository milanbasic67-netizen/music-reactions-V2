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

  // LOAD PROFILE & CHECK IF LIKED
  useEffect(() => {
    async function load() {
      const p = await getProfile();
      setProfile(p);

      if (p) {
        const { data } = await supabase
          .from("likes")
          .select("*")
          .eq("reaction_id", reaction.id)
          .eq("user_id", p.id)
          .single();
        if (data) setLiked(true);
      }
    }
    load();
  }, [reaction.id]);

  // AUTOPLAY & INTERSECTION OBSERVER
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // TOGGLE SOUND
  function toggleSound() {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  }

  // LIKE LOGIC
  async function toggleLike() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Login required");

    if (liked) {
      await supabase.from("likes").delete().eq("reaction_id", reaction.id).eq("user_id", user.id);
      setLikesCount((prev: number) => prev - 1);
      setLiked(false);
    } else {
      await supabase.from("likes").insert({ reaction_id: reaction.id, user_id: user.id });
      setLikesCount((prev: number) => prev + 1);
      setLiked(true);
    }
  }

  // SHARE
  async function shareVideo() {
    await navigator.clipboard.writeText(`${window.location.origin}/reaction/${reaction.id}`);
    alert("Link copied!");
  }

    // DELETE REACTION
  async function deleteReaction() {
    try {
      // 1. Provera admin statusa iz profila koji smo već učitali u useEffect-u
      if (profile?.role !== "admin") {
        alert("Samo admin može brisati reakcije.");
        return;
      }

      const confirmed = confirm("Da li ste sigurni da želite da obrišete ovaj duet i video fajl?");
      if (!confirmed) return;

      // 2. Izdvajanje putanje fajla iz URL-a
      // URL format: .../storage/v1/object/public/videos/duets/tiktok-123.mp4
      // Nama treba samo: "duets/tiktok-123.mp4"
      const videoUrl = reaction.video_url;
      const pathParts = videoUrl.split("/videos/");
      const storagePath = pathParts[1]; 

      if (storagePath) {
        console.log("Brišem fajl iz storage-a:", storagePath);
        const { error: storageError } = await supabase.storage
          .from("videos")
          .remove([storagePath]);

        if (storageError) {
          console.error("Greška pri brisanju fajla:", storageError.message);
          // Nastavljamo dalje čak i ako fajl nije nađen, da bismo očistili bazu
        }
      }

      // 3. Brisanje povezanih lajkova (zbog Foreign Key ograničenja)
      await supabase
        .from("likes")
        .delete()
        .eq("reaction_id", reaction.id);

      // 4. Brisanje zapisa iz tabele 'reactions'
      const { error: dbError } = await supabase
        .from("reactions")
        .delete()
        .eq("id", reaction.id);

      if (dbError) {
        alert("Greška pri brisanju iz baze: " + dbError.message);
        return;
      }

      alert("Duet je uspešno obrisan.");
      window.location.reload();

    } catch (err) {
      console.error("System Error:", err);
      alert("Došlo je do greške prilikom brisanja.");
    }
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black snap-start flex items-center justify-center">
      
      {/* VIDEO ELEMENT - OPTIMIZOVAN ZA 9:16 */}
      <video
        ref={videoRef}
        src={reaction.video_url}
        loop
        playsInline
        muted={muted}
        preload="metadata"
        className="w-full h-full object-cover shadow-2xl"
      />

      {/* DARK GRADIENT OVERLAY (Samo pri dnu radi bolje čitljivosti teksta) */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 z-10" />

      {/* UI CONTROLS */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-5 pb-24">
        
        <div className="flex justify-between items-end">
          
          {/* LEFT: INFO */}
          <div className="flex-1 text-white">
            <Link href={`/u/${reaction.username}`} className="font-black text-xl hover:underline">
              @{reaction.username}
            </Link>
            <h2 className="text-lg font-bold mt-2 truncate w-[70vw]">{reaction.song}</h2>
            <p className="text-zinc-300 text-sm">{reaction.artist}</p>
          </div>

          {/* RIGHT: BUTTONS */}
          <div className="flex flex-col items-center gap-6 mb-2">
            
            {/* LIKE */}
            <button onClick={toggleLike} className="group">
              <div className={`p-3 rounded-full bg-black/20 backdrop-blur-sm transition ${liked ? 'text-red-500' : 'text-white'}`}>
                <Heart className={`w-7 h-7 ${liked ? 'fill-current' : ''}`} />
              </div>
              <span className="text-white text-xs font-bold mt-1 block text-center">{likesCount}</span>
            </button>

            {/* SHARE */}
            <button onClick={shareVideo}>
              <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm text-white">
                <Share className="w-7 h-7" />
              </div>
            </button>

            {/* SOUND */}
            <button onClick={toggleSound}>
              <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm text-white">
                {muted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
              </div>
            </button>

            {/* DELETE (Show only for owner/admin) */}
            {(profile?.id === reaction.user_id || profile?.role === "admin") && (
              <button onClick={deleteReaction} className="text-zinc-500 hover:text-red-500 transition">
                <Trash2 className="w-6 h-6" />
              </button>
            )}

          </div>
        </div>
      </div>

    </div>
  );
}