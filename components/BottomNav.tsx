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

export default function BottomNav() {

  const pathname =
    usePathname();

  const router =
    useRouter();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-2xl border-t border-white/10">

      <div className="grid grid-cols-5 h-20">

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
 {/* CREATE */}
        <button
          onClick={() =>
            router.push(
              "/songs"
            )
          }
          className="flex items-center justify-center"
        >

          <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(255,0,0,0.5)]">

            <PlusSquare
              size={32}
              className="text-white"
            />

          </div>

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
                ? "text-orange-500"
                : "text-zinc-500"
            }
          />

          <span
            className={
              pathname === "/trending"
                ? "text-orange-500 text-[10px] font-bold"
                : "text-zinc-500 text-[10px]"
            }
          >

            Trending

          </span>

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

      </div>

    </div>
  );
}