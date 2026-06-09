"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import VideoCard from "@/components/VideoCard";

const PAGE_SIZE = 8;

export default function Home() {
  const [reactions, setReactions] = useState<any[]>([]);
  const [view, setView] = useState<"for-you" | "following">("for-you");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetching = useRef(false);
  const currentView = useRef(view);
  const currentCount = useRef(0);

  useEffect(() => { currentView.current = view; }, [view]);
  useEffect(() => { currentCount.current = reactions.length; }, [reactions]);

  async function fetchPage(from: number, viewMode: string) {
    const to = from + PAGE_SIZE - 1;
    const { data: { user } } = await supabase.auth.getUser();
    let q = supabase.from("reactions").select("*").order("created_at", { ascending: false }).range(from, to);

    if (viewMode === "following" && user) {
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
      if (profile?.username) {
        const { data: following } = await supabase.from("follows").select("following_username").eq("follower_username", profile.username);
        const usernames = (following || []).map((f: any) => f.following_username);
        if (usernames.length === 0) return [];
        q = supabase.from("reactions").select("*").order("created_at", { ascending: false }).range(from, to).in("username", usernames);
      }
    }

    const { data } = await q;
    return data || [];
  }

  // Reload when view changes
  useEffect(() => {
    let cancelled = false;
    async function initial() {
      setLoading(true);
      setHasMore(true);
      const data = await fetchPage(0, view);
      if (!cancelled) {
        setReactions(data);
        setHasMore(data.length === PAGE_SIZE);
        setLoading(false);
      }
    }
    initial();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || isFetching.current || !hasMore) return;
      isFetching.current = true;
      setLoadingMore(true);
      const data = await fetchPage(currentCount.current, currentView.current);
      setReactions(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setLoadingMore(false);
      isFetching.current = false;
    }, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore]);

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory bg-[#0D0D14]">
      {/* TABS OVERLAY */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center gap-6 pointer-events-none">
        <button
          onClick={() => setView("for-you")}
          className={`pointer-events-auto text-sm font-black uppercase tracking-widest transition-all ${view === "for-you" ? "text-white scale-110" : "text-slate-500 hover:text-slate-300"}`}
        >
          For You
        </button>
        <div className="w-[1px] h-4 bg-white/15" />
        <button
          onClick={() => setView("following")}
          className={`pointer-events-auto text-sm font-black uppercase tracking-widest transition-all ${view === "following" ? "text-white scale-110" : "text-slate-500 hover:text-slate-300"}`}
        >
          Following
        </button>
      </div>

      {loading ? (
        <div className="h-full flex items-center justify-center text-slate-600 font-black animate-pulse">LOADING FEED...</div>
      ) : reactions.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-10">
          <p className="text-slate-500 font-black uppercase tracking-tighter text-xl">No videos found</p>
          <p className="text-slate-600 text-sm mt-2">Try following more creators or switch to "For You"</p>
        </div>
      ) : (
        <>
          {reactions.map((item) => (
            <VideoCard key={item.id} reaction={item} />
          ))}
          <div ref={sentinelRef} className="h-2" />
          {loadingMore && (
            <div className="h-[100dvh] snap-start flex items-center justify-center bg-[#0D0D14]">
              <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
