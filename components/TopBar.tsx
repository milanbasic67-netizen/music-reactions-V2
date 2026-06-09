"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import { Music2, LogOut, PlusCircle } from "lucide-react";

export default function TopBar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUser(user);
      const p = await getProfile();
      setProfile(p);
    }
    loadUser();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!user) return null;

  const username = profile?.username || user.email?.split("@")[0];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        
        {/* LOGO */}
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => window.location.href = "/"}
        >
          <div className="bg-red-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
            <Music2 className="text-white w-6 h-6" />
          </div>
          <h1 className="text-white text-2xl font-black tracking-tighter">DUET</h1>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-6">
          
          {/* NAVIGATION LINKS - Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => window.location.href = "/songs"}
              className="text-zinc-400 hover:text-white px-4 py-2 text-sm font-bold transition"
            >
              Library
            </button>
            <button
              onClick={() => window.location.href = "/trending"}
              className="text-zinc-400 hover:text-white px-4 py-2 text-sm font-bold transition"
            >
              Trending
            </button>
          </nav>

          <div className="h-6 w-[1px] bg-white/10 hidden md:block" />

          {/* USER & BUTTONS */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-white text-sm font-black">@{username}</span>
              <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                {profile?.role || "user"}
              </span>
            </div>

            {/* LIBRARY BUTTON (Main Action) */}
            <button
              onClick={() => window.location.href = "/songs"}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-black border border-white/10 transition flex items-center gap-2"
            >
              <Music2 size={16} />
              <span className="hidden sm:inline">Songs</span>
            </button>

            {/* ADMIN ONLY */}
            {profile?.role === "admin" && (
              <button
                onClick={() => window.location.href = "/admin/upload-song"}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-red-600/20 transition flex items-center gap-2"
              >
                <PlusCircle size={16} />
                <span className="hidden sm:inline">New Song</span>
              </button>
            )}

            <button
              onClick={logout}
              className="p-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}