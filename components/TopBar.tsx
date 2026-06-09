"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";
import { Music2, LogOut, PlusCircle, LayoutGrid } from "lucide-react";

export default function TopBar() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const p = await getProfile();
        setProfile(p);
      }
    }
    load();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-[#0D0D14]/90 backdrop-blur-xl border-b border-white/8 h-16">
      <div className="max-w-full mx-auto h-full flex items-center justify-between px-4">
        
        {/* LEFT: Logo and Feed Link */}
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => window.location.href = "/"}
        >
          <div className="bg-violet-600 p-1.5 rounded-lg">
            <Music2 className="text-white w-5 h-5" />
          </div>
          <h1 className="text-white text-xl font-black tracking-tighter">DUET</h1>
        </div>

        {/* RIGHT: Main navigation (Always visible) */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* BUTTON: LIBRARY */}
          <button
            onClick={() => window.location.href = "/songs"}
            className="flex items-center gap-2 bg-white/8 hover:bg-white/12 text-white px-3 py-2 rounded-xl text-sm font-black transition border border-white/5"
          >
            <LayoutGrid size={18} className="text-violet-400" />
            <span className="hidden md:inline">Browse Songs</span>
            <span className="md:hidden">Songs</span>
          </button>

          {/* ADMIN UPLOAD */}
          {profile?.role === "admin" && (
            <button
              onClick={() => window.location.href = "/admin/upload-song"}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-3 py-2 rounded-xl text-sm font-black transition shadow-lg shadow-violet-600/20"
            >
              <PlusCircle size={18} />
              <span className="hidden md:inline">Admin Upload</span>
            </button>
          )}

          <div className="w-[1px] h-8 bg-white/10 mx-1 hidden sm:block" />

          {/* LOGOUT */}
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition border border-white/5"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}