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

  const [videoFile,
    setVideoFile] =
    useState<File | null>(
      null
    );

  const [thumbFile,
    setThumbFile] =
    useState<File | null>(
      null
    );

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

  // UPLOAD SONG
  async function uploadSong() {

    try {

      if (
        !videoFile
      ) {

        alert(
          "Missing video"
        );

        return;

      }

      if (
        !thumbFile
      ) {

        alert(
          "Missing thumbnail"
        );

        return;

      }

      setLoading(
        true
      );

      // USER
      const {
        data: {
          user,
        },
      } =
        await supabase
          .auth
          .getUser();

      if (!user) {

        alert(
          "Login required"
        );

        return;

      }

      // VIDEO NAME
      const videoName =

`${Date.now()}-${videoFile.name}`;

      // THUMB NAME
      const thumbName =

`${Date.now()}-${thumbFile.name}`;

      // UPLOAD VIDEO
      const {
        error:
          videoError,
      } =
        await supabase
          .storage
          .from(
            "songs"
          )
          .upload(

            videoName,

            videoFile,

            {

              contentType:
                "video/mp4",

            }

          );

      if (
        videoError
      ) {

        console.log(
          videoError
        );

        alert(
          videoError.message
        );

        setLoading(
          false
        );

        return;

      }

      // UPLOAD THUMB
      const {
        error:
          thumbError,
      } =
        await supabase
          .storage
          .from(
            "songs"
          )
          .upload(

            thumbName,

            thumbFile

          );

      if (
        thumbError
      ) {

        console.log(
          thumbError
        );

        alert(
          thumbError.message
        );

        setLoading(
          false
        );

        return;

      }

      // VIDEO URL
      const {
        data:
          videoPublic,
      } =
        supabase
          .storage
          .from(
            "songs"
          )
          .getPublicUrl(
            videoName
          );

      // THUMB URL
      const {
        data:
          thumbPublic,
      } =
        supabase
          .storage
          .from(
            "songs"
          )
          .getPublicUrl(
            thumbName
          );

      // INSERT SONG
      const {
        error:
          insertError,
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

            video_url:
              videoPublic.publicUrl,

            thumbnail_url:
              thumbPublic.publicUrl,

            uploaded_by:
              profile.username,

            user_id:
              user.id,

          });

      if (
        insertError
      ) {

        console.log(
          insertError
        );

        alert(
          insertError.message
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

          Upload mp4 + thumbnail

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

      {/* VIDEO */}
      <div className="mb-5">

        <label className="block mb-2 text-zinc-400">

          MP4 Video

        </label>

        <input

          type="file"

          accept="video/mp4"

          onChange={
            (
              e
            ) =>

              setVideoFile(

                e.target
                  .files?.[0] ||
                  null

              )
          }

          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4"

        />

      </div>

      {/* THUMB */}
      <div className="mb-8">

        <label className="block mb-2 text-zinc-400">

          Thumbnail

        </label>

        <input

          type="file"

          accept="image/*"

          onChange={
            (
              e
            ) =>

              setThumbFile(

                e.target
                  .files?.[0] ||
                  null

              )
          }

          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4"

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
          : "Upload Song"}

      </button>

    </main>

  );

}