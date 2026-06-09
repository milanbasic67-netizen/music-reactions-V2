"use client";

import {
  Home,
  Music2,
  PlusSquare,
  User,
  Search,
  Flame,
  Bell,
} from "lucide-react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import NotificationsBadge
from "./NotificationsBadge";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BottomNav() {

  const pathname =
    usePathname();

  const router =
    useRouter();

  const [profile, setProfile] =
    useState<any>(null);

  useEffect(() => {

    async function loadProfile() {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      const { data } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      setProfile(data);

    }

    loadProfile();

  }, []);

  return (    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D14]/95 backdrop-blur-2xl border-t border-white/8">

      <div className="grid grid-cols-7 h-20">

        {/* HOME */}
        <button
          onClick={() =>
            router.push("/")
          }
          className="flex flex-col items-center justify-center gap-1"
        >

          <Home
            size={24}
            className={
              pathname === "/"
                ? "text-white"
                : "text-zinc-500"
            }
          />

          <span
            className={
              pathname === "/"
                ? "text-white text-[10px] font-bold"
                : "text-zinc-500 text-[10px]"
            }
          >

            Home

          </span>

        </button>

        

        {/* SEARCH */}
        <button
          onClick={() =>
            router.push(
              "/search"
            )
          }
          className="flex flex-col items-center justify-center gap-1"
        >

          <Search
            size={24}
            className={
              pathname === "/search"
                ? "text-white"
                : "text-zinc-500"
            }
          />

          <span
            className={
              pathname === "/search"
                ? "text-white text-[10px] font-bold"
                : "text-zinc-500 text-[10px]"
            }
          >

            Search

          </span>

        </button>
 
        {/* TRENDING */}
        <button
          onClick={() =>
            router.push(
              "/trending"
            )
          }
          className="flex flex-col items-center justify-center gap-1"
        >

          <Flame
            size={24}
            className={
              pathname === "/trending"
                ? "text-violet-400"
                : "text-zinc-500"
            }
          />

          <span
            className={
              pathname === "/trending"
                ? "text-violet-400 text-[10px] font-bold"
                : "text-zinc-500 text-[10px]"
            }
          >

            Trending

          </span>

        </button>

{/* CREATE */}
        <button
          onClick={() =>
            router.push(
              "/songs"
            )
          }
          className="flex items-center justify-center"
        >

          <div className="w-15 h-15 rounded-2xl bg-violet-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.5)]">

            <PlusSquare
              size={30}
              className="text-white"
            />

          </div>

        </button>


        {/* NOTIFICATIONS */}
        <button
          onClick={() =>
            router.push(
              "/notifications"
            )
          }
          className="relative flex flex-col items-center justify-center gap-1"
        >

          <div className="relative">

            <Bell
              size={24}
              className={
                pathname ===
                "/notifications"
                  ? "text-white"
                  : "text-zinc-500"
              }
            />

            <NotificationsBadge />

          </div>

          <span
            className={
              pathname ===
              "/notifications"
                ? "text-white text-[10px] font-bold"
                : "text-zinc-500 text-[10px]"
            }
          >

            Alerts

          </span>

        </button>

       

        {/* PROFILE */}
        <button
          onClick={() =>
            router.push(
              "/profile"
            )
          }
          className="flex flex-col items-center justify-center gap-1"
        >

          <User
            size={24}
            className={
              pathname === "/profile"
                ? "text-white"
                : "text-zinc-500"
            }
          />

          <span
            className={
              pathname === "/profile"
                ? "text-white text-[10px] font-bold"
                : "text-zinc-500 text-[10px]"
            }
          >

            Profile

          </span>

        </button>

{/* ACCOUNT */}
<button
  onClick={() =>
    router.push("/profile")
  }
  className="flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white transition"
>

  <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">

  {profile?.avatar_url ? (

    <img
      src={profile.avatar_url}
      alt="Avatar"
      className="w-full h-full object-cover"
    />

  ) : (

    <span className="text-white font-black text-sm">

      {profile?.username?.[0]?.toUpperCase() || "?"}

    </span>

  )}

</div>

  <span className="text-[10px]">

    Account

  </span>

</button>


      </div>

    </div>
  );
}