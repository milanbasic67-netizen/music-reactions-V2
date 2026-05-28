"use client";

export const dynamic =
  "force-dynamic";

import {

  Suspense,

  useEffect,

  useState,

} from "react";

import {

  useSearchParams,

} from "next/navigation";

import DuetRecorder
from "@/components/DuetRecorder";

function CreateContent() {

  const searchParams =
    useSearchParams();

  const [mounted,
    setMounted] =
    useState(false);

  useEffect(() => {

    setMounted(
      true
    );

  }, []);

  if (!mounted) {

    return null;

  }

  const youtube =

    searchParams.get(
      "youtube"
    ) || "";

  const title =

    searchParams.get(
      "title"
    ) || "";

  const artist =

    searchParams.get(
      "artist"
    ) || "";

  console.log({
    youtube,
    title,
    artist,
  });

  // MISSING
  if (!youtube) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">

        Missing YouTube URL

      </main>

    );

  }

  // VIDEO ID
  let videoId =
    "";

  try {

    const decoded =
      decodeURIComponent(
        youtube
      );

    const parsed =
      new URL(
        decoded
      );

    // youtu.be
    if (
      parsed.hostname ===
      "youtu.be"
    ) {

      videoId =
        parsed.pathname.replace(
          "/",
          ""
        );

    }

    // shorts
    else if (

      parsed.pathname.includes(
        "/shorts/"
      )

    ) {

      videoId =
        parsed.pathname
          .split(
            "/shorts/"
          )[1]
          ?.split("?")[0] || "";

    }

    // watch?v=
    else {

      videoId =
        parsed.searchParams.get(
          "video"
        ) || "";

    }

  } catch (

    err

  ) {

    console.log(
      err
    );

  }

  // INVALID
  if (!videoId) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">

        Invalid YouTube URL

      </main>

    );

  }

  return (

    <main className="min-h-screen bg-black text-white">

      {/* PLAYER */}
      <div className="w-full h-[220px] md:h-[320px] bg-black sticky top-0 z-40 rounded-b-3xl overflow-hidden">

        <iframe

          src={`https://www.youtube.com/embed/${videoId}`}

          className="w-full h-full"

          allow="autoplay"

          allowFullScreen

        />

      </div>

      {/* INFO */}
      <div className="p-5 border-b border-zinc-900">

        <h1 className="text-3xl font-black">

          {decodeURIComponent(
            title
          )}

        </h1>

        <p className="text-zinc-500 mt-2">

          {decodeURIComponent(
            artist
          )}

        </p>

      </div>

      {/* RECORDER */}
      <DuetRecorder

        youtubeUrl={
          decodeURIComponent(
            youtube
          )
        }

        title={
          decodeURIComponent(
            title
          )
        }

        artist={
          decodeURIComponent(
            artist
          )
        }

      />

    </main>

  );

}

export default function CreatePage() {

  return (

    <Suspense
      fallback={

        <main className="min-h-screen bg-black text-white flex items-center justify-center">

          Loading...

        </main>

      }

    >

      <CreateContent />

    </Suspense>

  );

}