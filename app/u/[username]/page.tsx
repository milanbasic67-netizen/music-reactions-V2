"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import { Grid, Lock, Music2, LogOut, AlertCircle, Trash2 } from "lucide-react";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<any>(null);
  const [reactions, setReactions] = useState<any[]>([]);
  const [followsCount, setFollowsCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMe, setIsMe] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!username) return;
      setLoading(true);
      
      console.log("🔍 Looking for profile:", username);

      try {
        // 1. Fetch user by username (Case-Insensitive)
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .ilike("username", username)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!userProfile) {
          console.warn("⚠️ No user found with username:", username);
          setLoading(false);
          return;
        }

        setProfile(userProfile);

        // 2. Check if this is my profile
        const me = await getProfile();
        if (me) {
          setMyRole(me.role);
          if (me.id === userProfile.id) {
            setIsMe(true);
          }
        }

        // 3. Fetch user's videos (Reactions)
        const { data: vids } = await supabase
          .from("reactions")
          .select("*")
          .eq("user_id", userProfile.id)
          .order("created_at", { ascending: false });
        
        setReactions(vids || []);

        // 4. Fetch stats (Followers/Following)
        const { count: followers } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_username", userProfile.username);

        const { count: following } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_username", userProfile.username);

        setFollowsCount(followers || 0);
        setFollowingCount(following || 0);

      } catch (err: any) {
        console.error("❌ Profile Error:", err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [username]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function deleteVideo(vidId: string, videoUrl: string) {
    if (!confirm("Delete this video permanently?")) return;

    try {
      // 1. Storage cleanup
      const parts = videoUrl.split('/public/videos/');
      if (parts.length > 1) {
        const filePath = decodeURIComponent(parts[1]);
        await supabase.storage.from("videos").remove([filePath]);
      }

      // 2. Database cleanup
      await supabase.from("reactions").delete().eq("id", vidId);
      
      // Update UI
      setReactions(prev => prev.filter(v => v.id !== vidId));
      alert("Deleted.");
    } catch (err) {
      alert("Error deleting video.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D14] text-white flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-black text-xs uppercase tracking-widest opacity-40">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0D0D14] text-white flex flex-col items-center justify-center p-10 text-center">
        <AlertCircle className="w-16 h-16 text-slate-700 mb-4" />
        <h1 className="text-2xl font-black mb-2">USER NOT FOUND</h1>
        <p className="text-slate-500 text-sm mb-8">The user @{username} doesn't exist.</p>
        <button onClick={() => router.push("/")} className="px-10 py-3 bg-white/5 rounded-full font-bold">Home</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0D0D14] text-white pb-24">
      <div className="max-w-[1000px] mx-auto p-6 lg:p-12">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-full overflow-hidden bg-slate-900 border-2 border-white/10 shadow-2xl relative">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-black bg-slate-800 uppercase">
                {profile.username?.[0]}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-3xl font-black tracking-tighter">@{profile.username}</h1>
            
            <div className="flex gap-8 mt-6">
              <div className="flex flex-col items-center md:items-start">
                <span className="text-lg font-black">{reactions.length}</span>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Duets</span>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <span className="text-lg font-black">{followsCount}</span>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Followers</span>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <span className="text-lg font-black">{followingCount}</span>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Following</span>
              </div>
            </div>

            <div className="mt-8 flex gap-2 w-full md:w-auto">
              {isMe ? (
                <>
                  <button className="flex-1 md:px-12 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest">
                    Edit Profile
                  </button>
                  <button onClick={handleLogout} className="px-4 py-3 bg-white/5 border border-white/8 rounded-xl hover:text-red-400 transition">
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button className="flex-1 md:px-16 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-violet-900/20 transition">
                  Follow
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="mt-16 border-b border-white/8 flex justify-center md:justify-start gap-12">
          <button className="pb-4 border-b-2 border-white flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em]">
            <Grid className="w-4 h-4" /> Videos
          </button>
          <button className="pb-4 text-slate-600 flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em]">
            <Lock className="w-4 h-4" /> Liked
          </button>
        </div>

        {/* VIDEO GRID */}
        {reactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-700">
            <Music2 className="w-12 h-12 mb-4 opacity-10" />
            <p className="font-black uppercase tracking-tighter text-xs">No videos shared</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 lg:gap-4 mt-8">
            {reactions.map((vid) => (
              <div key={vid.id} className="relative aspect-[9/16] bg-slate-900 rounded-sm lg:rounded-2xl overflow-hidden group border border-white/5">
                <video src={vid.video_url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                
                {/* ADMIN DELETE BUTTON */}
                {(isMe || myRole === "admin") && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteVideo(vid.id, vid.video_url); }}
                    className="absolute top-2 right-2 p-2 bg-red-600/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                )}

                <div className="absolute bottom-3 left-3 flex items-center gap-1 opacity-60">
                   <Music2 className="w-3 h-3" />
                   <span className="text-[10px] font-bold uppercase tracking-tighter">View</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}