"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import { Grid, Heart, Music2, LogOut, AlertCircle, Trash2, X, Check } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import Link from "next/link";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<any>(null);
  const [reactions, setReactions] = useState<any[]>([]);
  const [likedReactions, setLikedReactions] = useState<any[]>([]);
  const [followsCount, setFollowsCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMe, setIsMe] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "liked">("videos");
  const [likedLoading, setLikedLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAvatar, setEditAvatar] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!username) return;
      setLoading(true);

      try {
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .ilike("username", username)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!userProfile) { setLoading(false); return; }

        setProfile(userProfile);

        const me = await getProfile();
        if (me) {
          setMyProfile(me);
          if (me.id === userProfile.id) setIsMe(true);
        }

        const { data: vids } = await supabase
          .from("reactions")
          .select("*")
          .eq("user_id", userProfile.id)
          .order("created_at", { ascending: false });
        setReactions(vids || []);

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

      } catch {
        // profile load failed
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [username]);

  async function loadLikedReactions() {
    if (!profile) return;
    setLikedLoading(true);
    const { data: likes } = await supabase
      .from("likes")
      .select("reaction_id")
      .eq("user_id", profile.id);

    if (!likes?.length) { setLikedReactions([]); setLikedLoading(false); return; }

    const ids = likes.map(l => l.reaction_id);
    const { data: vids } = await supabase
      .from("reactions")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });

    setLikedReactions(vids || []);
    setLikedLoading(false);
  }

  function openEditModal() {
    setEditAvatar(profile.avatar_url || "");
    setEditBio(profile.bio || "");
    setShowEditModal(true);
  }

  async function saveProfile() {
    setEditSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: editAvatar || null, bio: editBio || null })
      .eq("id", profile.id);

    if (!error) {
      setProfile((prev: any) => ({ ...prev, avatar_url: editAvatar || null, bio: editBio || null }));
      setShowEditModal(false);
    } else {
      alert("Failed to save. Please try again.");
    }
    setEditSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function deleteVideo(vidId: string, videoUrl: string) {
    if (!confirm("Delete this video permanently?")) return;
    try {
      const parts = videoUrl.split('/public/videos/');
      if (parts.length > 1) {
        const storagePath = decodeURIComponent(parts[1]);
        const { error: storageError } = await supabase.storage.from("videos").remove([storagePath]);
        if (storageError) {
          const proceed = confirm("Could not delete the video file from storage. Remove from feed anyway?");
          if (!proceed) return;
        }
      }
      const { error: dbError } = await supabase.from("reactions").delete().eq("id", vidId);
      if (dbError) { alert("Failed to delete video."); return; }
      setReactions(prev => prev.filter(v => v.id !== vidId));
    } catch {
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

  const gridItems = activeTab === "videos" ? reactions : likedReactions;

  return (
    <main className="min-h-screen bg-[#0D0D14] text-white pb-24">
      <div className="max-w-[1000px] mx-auto p-6 lg:p-12">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-full overflow-hidden bg-slate-900 border-2 border-white/10 shadow-2xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-black bg-slate-800 uppercase">
                {profile.username?.[0]}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center md:items-start flex-1">
            <h1 className="text-3xl font-black tracking-tighter">@{profile.username}</h1>
            {profile.bio && (
              <p className="text-slate-400 text-sm mt-2 max-w-sm text-center md:text-left">{profile.bio}</p>
            )}

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
                  <button onClick={openEditModal} className="flex-1 md:px-12 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition">
                    Edit Profile
                  </button>
                  <button onClick={handleLogout} className="px-4 py-3 bg-white/5 border border-white/8 rounded-xl hover:text-red-400 transition">
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <FollowButton profileUsername={profile.username} />
              )}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="mt-16 border-b border-white/8 flex justify-center md:justify-start gap-12">
          <button
            onClick={() => setActiveTab("videos")}
            className={`pb-4 flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] border-b-2 transition-colors ${activeTab === "videos" ? "border-white text-white" : "border-transparent text-slate-600 hover:text-slate-400"}`}
          >
            <Grid className="w-4 h-4" /> Videos
          </button>
          <button
            onClick={() => { setActiveTab("liked"); loadLikedReactions(); }}
            className={`pb-4 flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] border-b-2 transition-colors ${activeTab === "liked" ? "border-white text-white" : "border-transparent text-slate-600 hover:text-slate-400"}`}
          >
            <Heart className="w-4 h-4" /> Liked
          </button>
        </div>

        {/* VIDEO GRID */}
        {likedLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : gridItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-700">
            <Music2 className="w-12 h-12 mb-4 opacity-10" />
            <p className="font-black uppercase tracking-tighter text-xs">
              {activeTab === "videos" ? "No videos shared" : "No liked videos"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 lg:gap-4 mt-8">
            {gridItems.map((vid) => (
              <div key={vid.id} className="relative aspect-[9/16] bg-slate-900 rounded-sm lg:rounded-2xl overflow-hidden group border border-white/5">
                <Link href={`/v/${vid.id}`} className="absolute inset-0 z-10" />
                <video src={vid.video_url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />

                {(isMe || myProfile?.role === "admin") && activeTab === "videos" && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteVideo(vid.id, vid.video_url); }}
                    className="absolute top-2 right-2 p-2 bg-red-600/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                )}

                <div className="absolute bottom-3 left-3 flex items-center gap-1 opacity-60 z-10 pointer-events-none">
                  <Music2 className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">{vid.song}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#0F0F1A] border border-white/8 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tighter">Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white/8 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Avatar URL</label>
                <input
                  type="text"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full bg-white/5 border border-white/8 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-violet-500 transition"
                />
                {editAvatar && (
                  <img src={editAvatar} alt="" className="mt-2 w-16 h-16 rounded-full object-cover border border-white/10" onError={(e) => (e.currentTarget.style.display = "none")} />
                )}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell the world about yourself..."
                  maxLength={150}
                  rows={3}
                  className="mt-1 w-full bg-white/5 border border-white/8 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-violet-500 transition resize-none"
                />
                <p className="text-right text-[10px] text-slate-600 mt-1">{editBio.length}/150</p>
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={editSaving}
              className="mt-6 w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white font-black py-4 rounded-2xl transition flex items-center justify-center gap-2"
            >
              {editSaving ? "Saving..." : <><Check className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
