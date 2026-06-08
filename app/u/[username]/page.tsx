"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import FollowButton from "@/components/FollowButton";
import { Grid, Lock, Music2 } from "lucide-react";

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<any>(null);
  const [reactions, setReactions] = useState<any[]>([]);
  const [followsCount, setFollowsCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMe, setIsMe] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      try {
        // 1. Fetch user profile by username
        const { data: userProfile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .single();

        if (error || !userProfile) throw new Error("User not found");
        setProfile(userProfile);

        // 2. Check if this is the logged-in user
        const myProfile = await getProfile();
        if (myProfile?.id === userProfile.id) {
          setIsMe(true);
        }

        // 3. Fetch user's reactions
        const { data: userReactions } = await supabase
          .from("reactions")
          .select("*")
          .eq("user_id", userProfile.id)
          .order("created_at", { ascending: false });

        setReactions(userReactions || []);

        // 4. Fetch Follows/Following counts
        const { count: follows } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_username", username);

        const { count: following } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_username", username);

        setFollowsCount(follows || 0);
        setFollowingCount(following || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (username) loadUserData();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-bold animate-pulse">
        LOADING PROFILE...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-bold">
        USER NOT FOUND
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-10">
      {/* HEADER SECTION */}
      <div className="p-6 lg:p-12 max-w-[1000px] mx-auto">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar */}
          <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden bg-zinc-900 border-2 border-zinc-800 shadow-xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-black bg-gradient-to-br from-zinc-800 to-black">
                {profile.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-3xl font-black tracking-tight">@{profile.username}</h1>
            
            <div className="flex gap-8 mt-4 text-sm lg:text-base">
              <div className="flex flex-col items-center md:items-start">
                <span className="font-black text-white">{reactions.length}</span>
                <span className="text-zinc-500 text-xs uppercase tracking-widest">Duets</span>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <span className="font-black text-white">{followsCount}</span>
                <span className="text-zinc-500 text-xs uppercase tracking-widest">Followers</span>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <span className="font-black text-white">{followingCount}</span>
                <span className="text-zinc-500 text-xs uppercase tracking-widest">Following</span>
              </div>
            </div>

            <div className="mt-6 w-full md:w-auto">
              {isMe ? (
                <button className="w-full md:px-10 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg font-bold transition">
                  Edit Profile
                </button>
              ) : (
                <FollowButton profileId={profile.id} />
              )}
            </div>
          </div>
        </div>

        {/* TABS SECTION */}
        <div className="mt-12 border-b border-zinc-900 flex justify-center md:justify-start gap-12">
          <button className="pb-4 border-b-2 border-white flex items-center gap-2 font-bold text-sm uppercase tracking-widest">
            <Grid className="w-4 h-4" /> Videos
          </button>
          <button className="pb-4 text-zinc-500 flex items-center gap-2 font-bold text-sm uppercase tracking-widest hover:text-zinc-300 transition">
            <Lock className="w-4 h-4" /> Liked
          </button>
        </div>

        {/* VIDEOS GRID */}
        {reactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
            <Music2 className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-tighter">No videos yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 lg:gap-4 mt-6">
            {reactions.map((reaction) => (
              <div 
                key={reaction.id} 
                className="relative aspect-[9/16] bg-zinc-900 rounded-sm lg:rounded-xl overflow-hidden group cursor-pointer border border-zinc-900"
                onClick={() => window.location.href = `/`} // Link to main feed
              >
                <video src={reaction.video_url} className="w-full h-full object-cover transition group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                   <Music2 className="w-3 h-3 text-white" />
                   <span className="text-[10px] font-bold text-white drop-shadow-md">View</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}