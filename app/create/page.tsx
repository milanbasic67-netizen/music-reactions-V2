"use client";

export const dynamic =
  "force-dynamic";

import {

  useEffect,

  useState,

} from "react";

import {

  useSearchParams,

} from "next/navigation";

import DuetRecorder
from "@/components/DuetRecorder";

export default function CreatePage() {

  const searchParams =
    useSearchParams();

  const [loading,
    setLoading] =
    useState(true);

  const [tempVideo,
    setTempVideo] =
    useState("");

  const [tempFile,
    setTempFile] =
    useState("");

  const [title,
    setTitle] =
    useState("");

  const [artist,
    setArtist] =
    useState("");

  // LOAD
  useEffect(() => {

    async function prepareSong() {

      try {

        const youtubeUrl =

          searchParams.get(
            "youtube"
          );

        const songTitle =

          searchParams.get(
            "title"
          ) || "";

        const songArtist =

          searchParams.get(
            "artist"
          ) || "";

        setTitle(
          decodeURIComponent(
            songTitle
          )
        );

        setArtist(
          decodeURIComponent(
            songArtist
          )
        );

        if (!youtubeUrl) {

          alert(
            "Missing YouTube URL"
          );

          return;

        }

        console.log(
          youtubeUrl
        );

        // PREPARE SONG
        const res =
          await fetch(

`${process.env.NEXT_PUBLIC_API_URL}/prepare-song`,

            {

              method:
                "POST",

              headers: {

                "Content-Type":
                  "application/json",

              },

              body:
                JSON.stringify({

                  youtubeUrl,

                }),

            }

          );

        const data =
          await res.json();

        console.log(
          data
        );

        if (
          !data.videoUrl
        ) {

          alert(
            "Prepare failed"
          );

          return;

        }

        setTempVideo(

          data.videoUrl

        );

        setTempFile(

          data.tempFile

        );

      } catch (err) {

        console.log(
          err
        );

        alert(
          "Prepare error"
        );

      }

      setLoading(
        false
      );

    }

    prepareSong();

  }, []);

  // LOADING
  if (loading) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">

        Preparing song...

      </main>

    );

  }

  // FAILED
  if (!tempVideo) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">

        Failed to load song

      </main>

    );

  }

  return (

    <main className="min-h-screen bg-black text-white">

      {/* PLAYER */}
      <div className="px-3 pt-3">

        <div className="relative w-full h-[140px] rounded-2xl overflow-hidden bg-black">

          <video

            src={tempVideo}

            autoPlay

            controls

            playsInline

            className="absolute inset-0 w-full h-full object-cover"

          />

        </div>

      </div>

      {/* INFO */}
      <div className="p-4">

        <h1 className="text-2xl font-black">

          {title}

        </h1>

        <p className="text-zinc-500 mt-1">

          {artist}

        </p>

      </div>

      {/* RECORDER */}
      <DuetRecorder

        originalVideo={
          tempVideo
        }

        tempFile={
          tempFile
        }

        title={
          title
        }

        artist={
          artist
        }

      />

    </main>

  );

}