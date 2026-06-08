"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation"; // Added useRouter
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import { Grid, Lock, Music2, LogOut } from "lucide-react"; // Added LogOut icon

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<any>(null);
  const [reactions, setReactions] = useState<any[]>([]);
  const [followsCount, setFollowsCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMe, setIsMe] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      if (!username) return;
      try {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("*")
          .ilike("username", username)
          .maybeSingle();

        if (!userProfile) {
          setLoading(false);
          return;
        }
        setProfile(userProfile);

        const myProfile = await getProfile();
        if (myProfile?.id === userProfile.id) {
          setIsMe(true);
        }

        const { data: vids } = await supabase
          .from("reactions")
          .select("*")
          .eq("user_id", userProfile.id)
          .order("created_at", { ascending: false });
        setReactions(vids || []);

        const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_username", userProfile.username);
        const { count: following } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_username", userProfile.username);
        setFollowsCount(followers || 0);
        setFollowingCount(following || 0);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadUserData();
  }, [username]);

  // LOGOUT FUNCTION
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-black animate-pulse uppercase tracking-widest">Loading Profile...</div>;

  if (!profile) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black uppercase">User Not Found</div>;

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-10">
      <div className="p-6 lg:p-12 max-w-[1000px] mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-full overflow-hidden bg-zinc-900 border-2 border-zinc-800 shadow-2xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-black bg-gradient-to-br from-zinc-800 to-black">
                {profile.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-3xl font-black tracking-tighter">@{profile.username}</h1>
            
            <div className="flex gap-8 mt-6">
              <div className="flex flex-col">
                <span className="font-black text-white text-lg">{reactions.length}</span>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Duets</span>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-white text-lg">{followsCount}</span>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Followers</span>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-white text-lg">{followingCount}</span>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Following</span>
              </div>
            </div>

            {/* BUTTONS AREA */}
            <div className="mt-8 flex gap-2 w-full md:w-auto">
              {isMe ? (
                <>
                  <button className="flex-1 md:px-12 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-black text-sm transition">
                    EDIT PROFILE
                  </button>
                  {/* LOGOUT BUTTON FOR MOBILE */}
                  <button 
                    onClick={handleLogout}
                    className="px-4 py-3 bg-zinc-900 hover:bg-red-600/10 hover:text-red-500 border border-zinc-800 rounded-xl transition"
                    title="Log Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button className="w-full md:px-12 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-black text-sm transition shadow-lg shadow-red-900/20">
                  FOLLOW
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="mt-16 border-b border-zinc-900 flex justify-center md:justify-start gap-12">
          <button className="pb-4 border-b-2 border-white flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em]">
            <Grid className="w-4 h-4" /> Videos
          </button>
          <button className="pb-4 text-zinc-600 flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] hover:text-zinc-400 transition">
            <Lock className="w-4 h-4" /> Liked
          </button>
        </div>

        {/* VIDEOS GRID */}
        {reactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-700">
            <Music2 className="w-16 h-16 mb-4 opacity-10" />
            <p className="font-black uppercase tracking-widest text-xs">No shared duets yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 lg:gap-4 mt-8">
            {reactions.map((vid) => (
              <div 
                key={vid.id} 
                className="relative aspect-[9/16] bg-zinc-900 rounded-sm lg:rounded-2xl overflow-hidden group cursor-pointer border border-zinc-900 shadow-lg"
                onClick={() => window.location.href = `/`} 
              >
                <video src={vid.video_url} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 drop-shadow-lg">
                   <Music2 className="w-3 h-3 text-white" />
                   <span className="text-[10px] font-black text-white uppercase tracking-tighter">View</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}