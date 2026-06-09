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
  const [isMuted, setIsMuted] = useState(true); // Global audio state
  const [showComments, setShowComments] = useState(false);
  const [progress, setProgress] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  // 1. AUDIO SYNC ACROSS ENTIRE FEED
  useEffect(() => {
    const syncMute = (e: any) => {
      setIsMuted(e.detail.muted);
      if (videoRef.current) videoRef.current.muted = e.detail.muted;
    };
    window.addEventListener("videoVolumeToggle", syncMute);
    return () => window.removeEventListener("videoVolumeToggle", syncMute);
  }, []);

  // 2. LOAD PROFILE, LIKE STATUS & COMMENT COUNT
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
      if (reaction.id) {
        const { count: cCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("reaction_id", reaction.id);
        setCommentsCount(cCount || 0);

        const { count: lCount } = await supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("reaction_id", reaction.id);
        setLikesCount(lCount || 0);
      }
    }
    init();
  }, [reaction.id]);

  // 3. AUTOPLAY & PROGRESS LOGIC
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
          video.muted = isMuted; // Apply global state when entering viewport
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

  // HANDLERS
  const toggleMute = () => {
    const newMutedState = !isMuted;
    window.dispatchEvent(new CustomEvent("videoVolumeToggle", { detail: { muted: newMutedState } }));
  };

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("You must be logged in!");

    if (liked) {
      const { error } = await supabase.from("likes").delete().eq("reaction_id", reaction.id).eq("user_id", user.id);
      if (!error) { setLiked(false); setLikesCount((prev: number) => Math.max(0, prev - 1)); }
    } else {
      const { error } = await supabase.from("likes").insert({ reaction_id: reaction.id, user_id: user.id });
      if (!error) {
        setLiked(true);
        setLikesCount((prev: number) => prev + 1);
        if (profile?.username && reaction.username && profile.username !== reaction.username) {
          await supabase.from("notifications").insert({
            username: reaction.username,
            actor: profile.username,
            type: "like",
            reaction_id: reaction.id,
            read: false,
          });
        }
      }
    }
  };

  if (!reaction) return null;

  return (
    <div className="relative h-[100dvh] w-full bg-[#0D0D14] snap-start flex justify-center overflow-hidden">
      <div className="relative h-full aspect-[9/16] w-full max-w-[480px] bg-[#0A0A10] shadow-2xl border-x border-white/5">
        
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
          className="absolute bottom-0 left-0 h-1 bg-violet-500 z-50 transition-all duration-100"
          style={{ width: `${progress}%` }} 
        />

        {/* OVERLAY GRADIENT */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-10" />

        {/* INFO SECTION */}
        <div className="absolute bottom-10 left-5 z-20 w-[75%] pointer-events-none">
          <Link href={`/u/${reaction.username}`} className="pointer-events-auto">
            <span className="font-black text-white text-xl drop-shadow-md hover:text-violet-400 transition-colors">
              @{reaction.username || "user"}
            </span>
          </Link>
          <h2 className="text-white text-sm mt-2 font-medium drop-shadow-md line-clamp-2">
            {reaction.song}
          </h2>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">{reaction.artist}</p>
        </div>

        {/* ACTIONS (RIGHT) */}
        <div className="absolute right-4 bottom-24 z-30 flex flex-col items-center gap-6">
          <button onClick={handleLike} className="flex flex-col items-center group">
            <div className={`p-3 rounded-full bg-black/40 backdrop-blur-md transition-transform group-active:scale-125 ${liked ? "text-rose-500" : "text-white"}`}>
              <Heart className={`w-7 h-7 ${liked ? "fill-current" : ""}`} />
            </div>
            <span className="text-white text-[11px] font-bold mt-1 drop-shadow-lg">{likesCount}</span>
          </button>

          <button onClick={() => setShowComments(true)} className="flex flex-col items-center group">
            <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white group-active:scale-110 transition-transform">
              <MessageCircle className="w-7 h-7" />
            </div>
            <span className="text-white text-[11px] font-bold mt-1 drop-shadow-lg">{commentsCount}</span>
          </button>

          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/v/${reaction.id}`); alert("Link copied!"); }}>
            <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white active:scale-90 transition-transform">
              <Share className="w-7 h-7" />
            </div>
          </button>

          <button onClick={toggleMute}>
            <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white active:scale-90 transition-transform">
              {isMuted ? <VolumeX className="w-7 h-7 text-slate-300" /> : <Volume2 className="w-7 h-7" />}
            </div>
          </button>

          {profile?.role === "admin" && (
            <button
              onClick={async () => {
                if (!confirm("Delete video permanently?")) return;
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const parts = reaction.video_url?.split("/public/videos/");
                  const storagePath = parts?.length > 1 ? decodeURIComponent(parts[1]) : null;
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/delete-video`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ reactionId: reaction.id, storagePath }),
                  });
                  const result = await res.json().catch(() => ({}));
                  if (!res.ok) { alert(`Delete failed: ${result.error || "unknown"}`); return; }
                  if (result.storageError) alert(`Storage warning: ${result.storageError}`);
                  window.location.reload();
                } catch {
                  alert("Error deleting video.");
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
            onCommentAdded={() => setCommentsCount((prev) => prev + 1)}
          />
        )}
      </div>
    </div>
  );
}