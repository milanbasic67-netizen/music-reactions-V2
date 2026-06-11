"use client";

import { Home, PlusSquare, User, Search, Bell, CreditCard } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import NotificationsBadge from "./NotificationsBadge";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => setProfile(data));
    });
  }, []);

  const nav = (path: string) => router.push(path);
  const active = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D14]/95 backdrop-blur-2xl border-t border-white/8">
      <div className="grid grid-cols-6 h-20">

        {/* HOME */}
        <button onClick={() => nav("/")} className="flex flex-col items-center justify-center gap-1">
          <Home size={24} className={active("/") ? "text-white" : "text-zinc-500"} />
          <span className={`text-[10px] font-bold ${active("/") ? "text-white" : "text-zinc-500"}`}>Home</span>
        </button>

        {/* SEARCH */}
        <button onClick={() => nav("/search")} className="flex flex-col items-center justify-center gap-1">
          <Search size={24} className={active("/search") ? "text-white" : "text-zinc-500"} />
          <span className={`text-[10px] font-bold ${active("/search") ? "text-white" : "text-zinc-500"}`}>Search</span>
        </button>

        {/* CREATE — centered */}
        <button onClick={() => nav("/songs")} className="flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.5)] active:scale-95 transition-transform">
            <PlusSquare size={28} className="text-white" />
          </div>
        </button>

        {/* NOTIFICATIONS */}
        <button onClick={() => nav("/notifications")} className="flex flex-col items-center justify-center gap-1">
          <div className="relative">
            <Bell size={24} className={active("/notifications") ? "text-white" : "text-zinc-500"} />
            <NotificationsBadge />
          </div>
          <span className={`text-[10px] font-bold ${active("/notifications") ? "text-white" : "text-zinc-500"}`}>Alerts</span>
        </button>

        {/* CREDITS */}
        <button onClick={() => nav("/credits")} className="flex flex-col items-center justify-center gap-1">
          <CreditCard size={24} className={active("/credits") ? "text-violet-400" : "text-zinc-500"} />
          <span className={`text-[10px] font-bold ${active("/credits") ? "text-violet-400" : "text-zinc-500"}`}>Credits</span>
        </button>

        {/* PROFILE */}
        <button onClick={() => nav("/profile")} className="flex flex-col items-center justify-center gap-1">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className={`w-7 h-7 rounded-full object-cover border-2 ${active("/profile") ? "border-white" : "border-zinc-600"}`} alt="" />
          ) : (
            <User size={24} className={active("/profile") ? "text-white" : "text-zinc-500"} />
          )}
          <span className={`text-[10px] font-bold ${active("/profile") ? "text-white" : "text-zinc-500"}`}>Profile</span>
        </button>

      </div>
    </div>
  );
}
