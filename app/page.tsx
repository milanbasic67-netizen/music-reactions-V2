"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import VideoCard from "@/components/VideoCard";

export default function Home() {
  const [reactions, setReactions] = useState<any[]>([]);
  const [view, setView] = useState<"for-you" | "following">("for-you");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReactions() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase.from("reactions").select("*").order("created_at", { ascending: false });

      if (view === "following" && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        if (profile?.username) {
          const { data: following } = await supabase
            .from("follows")
            .select("following_username")
            .eq("follower_username", profile.username);

          const usernames = following?.map(f => f.following_username) || [];
          query = query.in("username", usernames);
        }
      }

      const { data } = await query;
      setReactions(data || []);
      setLoading(false);
    }

    fetchReactions();
  }, [view]);

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory bg-[#0D0D14]">
      {/* TABS OVERLAY */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center gap-6 pointer-events-none">
        <button 
          onClick={() => setView("for-you")}
          className={`pointer-events-auto text-sm font-black uppercase tracking-widest transition-all ${
            view === "for-you" ? "text-white scale-110" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          For You
        </button>
        <div className="w-[1px] h-4 bg-white/15" />
        <button 
          onClick={() => setView("following")}
          className={`pointer-events-auto text-sm font-black uppercase tracking-widest transition-all ${
            view === "following" ? "text-white scale-110" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Following
        </button>
      </div>

      {loading ? (
        <div className="h-full flex items-center justify-center text-slate-600 font-black animate-pulse">
          LOADING FEED...
        </div>
      ) : reactions.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-10">
          <p className="text-slate-500 font-black uppercase tracking-tighter text-xl">No videos found</p>
          <p className="text-slate-600 text-sm mt-2">Try following more creators or switch to "For You"</p>
        </div>
      ) : (
        reactions.map((item) => (
          <VideoCard key={item.id} reaction={item} />
        ))
      )}
    </div>
  );
}