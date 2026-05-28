"use client";

import {

  useEffect,

  useState,

} from "react";

import { supabase }
from "@/lib/supabase";

import { getProfile }
from "@/lib/getProfile";

export default function UploadSongPage() {

  const [profile,
    setProfile] =
    useState<any>(
      null
    );

  const [loading,
    setLoading] =
    useState(false);

  const [title,
    setTitle] =
    useState("");

  const [artist,
    setArtist] =
    useState("");

  const [youtubeUrl,
    setYoutubeUrl] =
    useState("");

  // LOAD PROFILE
  useEffect(() => {

    async function load() {

      const p =
        await getProfile();

      setProfile(
        p
      );

    }

    load();

  }, []);

  // NOT ADMIN
  if (
    profile &&
    profile.role !== "admin"
  ) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">

        Not authorized

      </main>

    );

  }

  // LOADING
  if (!profile) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center">

        Loading...

      </main>

    );

  }

  // GET VIDEO ID
  function getYoutubeId(
    url: string
  ) {

    const regExp =

      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/)([^#&?]*).*/;

    const match =
      url.match(
        regExp
      );

    return
      match &&
      match[2].length === 11
        ? match[2]
        : null;

  }

  // UPLOAD SONG
  async function uploadSong() {

    try {

      if (
        !youtubeUrl
      ) {

        alert(
          "Missing YouTube URL"
        );

        return;

      }

      setLoading(
        true
      );

      // VIDEO ID
      const videoId =
        getYoutubeId(
          youtubeUrl
        );

      console.log({

        youtubeUrl,

        videoId,

      });

      if (!videoId) {

        alert(
          "Invalid YouTube URL"
        );

        setLoading(
          false
        );

        return;

      }

      // THUMB
      const thumbnailUrl =

        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      // USER
      const {
        data: {
          user,
        },
      } =
        await supabase
          .auth
          .getUser();

      // INSERT SONG
      const {
        error,
      } =
        await supabase

          .from(
            "songs"
          )

          .insert({

            title:
              title || "Untitled",

            artist:
              artist || "Unknown",

            youtube_url:
              youtubeUrl,

            video_id:
              videoId,

            thumbnail_url:
              thumbnailUrl,

            uploaded_by:
              profile.username,

            user_id:
              user?.id,

          });

      if (
        error
      ) {

        console.log(
          error
        );

        alert(
          error.message
        );

        setLoading(
          false
        );

        return;

      }

      alert(
        "Song uploaded!"
      );

      window.location.href =
        "/songs";

    } catch (err) {

      console.log(
        err
      );

      alert(
        "Upload failed"
      );

    }

    setLoading(
      false
    );

  }

  return (

    <main className="min-h-screen bg-black text-white p-5 max-w-xl mx-auto">

      {/* HEADER */}
      <div className="mb-10">

        <h1 className="text-4xl font-black">

          Upload Song

        </h1>

        <p className="text-zinc-500 mt-2">

          YouTube song import

        </p>

      </div>

      {/* TITLE */}
      <div className="mb-5">

        <label className="block mb-2 text-zinc-400">

          Title

        </label>

        <input

          value={title}

          onChange={
            (
              e
            ) =>
              setTitle(
                e.target.value
              )
          }

          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none"

        />

      </div>

      {/* ARTIST */}
      <div className="mb-5">

        <label className="block mb-2 text-zinc-400">

          Artist

        </label>

        <input

          value={artist}

          onChange={
            (
              e
            ) =>
              setArtist(
                e.target.value
              )
          }

          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none"

        />

      </div>

      {/* YOUTUBE URL */}
      <div className="mb-8">

        <label className="block mb-2 text-zinc-400">

          YouTube URL

        </label>

        <input

          value={youtubeUrl}

          onChange={
            (
              e
            ) =>
              setYoutubeUrl(
                e.target.value
              )
          }

          placeholder="https://youtube.com/watch?v=..."

          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 outline-none"

        />

      </div>

      {/* BUTTON */}
      <button

        onClick={
          uploadSong
        }

        disabled={
          loading
        }

        className="w-full bg-red-600 hover:bg-red-500 transition py-5 rounded-3xl font-black text-xl"

      >

        {loading
          ? "Uploading..."
          : "Import YouTube Song"}

      </button>

    </main>

  );

}