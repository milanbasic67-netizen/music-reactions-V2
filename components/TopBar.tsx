"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase }
from "@/lib/supabase";

import { getProfile }
from "@/lib/getProfile";

export default function TopBar() {

  const [user,
    setUser] =
    useState<any>(
      null
    );

  const [profile,
    setProfile] =
    useState<any>(
      null
    );

  // LOAD USER
  useEffect(() => {

    async function loadUser() {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      // REDIRECT IF LOGGED OUT
      if (!user) {

        window.location.href =
          "/login";

        return;

      }

      setUser(
        user
      );

      // PROFILE
      const p =
        await getProfile();

      setProfile(
        p
      );

    }

    loadUser();

  }, []);

  // LOGOUT
  async function logout() {

    await supabase.auth.signOut();

    window.location.href =
      "/login";

  }

  // NO USER
  if (!user) {
    return null;
  }

  const username =

    profile?.username ||

    user.email?.split(
      "@"
    )[0];

  return (

    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent">

      <div className="flex items-center justify-between px-5 py-4">

        {/* LEFT */}
        <div>

          <h1 className="text-white text-3xl font-black tracking-tight">

            DUET

          </h1>

          <p className="text-zinc-400 text-xs mt-1">

            Music Reaction Platform

          </p>

        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">

          {/* USER INFO */}
          <div className="hidden sm:block text-right">

            <div className="text-white text-sm font-bold">

              @
              {username}

            </div>

            <div className="text-zinc-400 text-xs">

              {profile?.role ||
                "user"}

            </div>

          </div>

          {/* AVATAR */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white font-black text-lg shrink-0 border border-white/10 shadow-2xl">

            {username?.[0]
              ?.toUpperCase()}

          </div>

          {/* BUTTONS */}
          <div className="flex items-center gap-2 overflow-x-auto">

            {/* SONGS */}
            <button
              onClick={() => {

                window.location.href =
                  "/songs";

              }}
              className="shrink-0 bg-blue-600 hover:bg-blue-500 transition px-4 py-2 rounded-full text-white text-xs font-black"
            >

              Songs

            </button>

            {/* CREATE */}
            <button
              onClick={() => {

                window.location.href =
                  "/create";

              }}
              className="shrink-0 bg-green-500 hover:bg-green-400 transition px-4 py-2 rounded-full text-black text-xs font-black"
            >

              Create

            </button>

            {/* ADMIN UPLOAD */}
            {profile?.role ===
              "admin" && (

              <button
                onClick={() => {

                  window.location.href =
                    "/admin/upload-song";

                }}
                className="shrink-0 bg-yellow-400 hover:bg-yellow-300 transition px-4 py-2 rounded-full text-black text-xs font-black"
              >

                Upload

              </button>

            )}

            {/* PROFILE */}
            <button
              onClick={() => {

                window.location.href =
                  `/u/${username}`;

              }}
              className="shrink-0 bg-red-600 hover:bg-red-500 transition px-4 py-2 rounded-full text-white text-xs font-black"
            >

              Profile

            </button>

            {/* LOGOUT */}
            <button
              onClick={
                logout
              }
              className="shrink-0 bg-white hover:bg-zinc-200 transition px-4 py-2 rounded-full text-black text-xs font-black"
            >

              Logout

            </button>

          </div>

        </div>

      </div>

    </div>

  );

}