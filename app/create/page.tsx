"use client";

export const dynamic =
  "force-dynamic";

import {

  Suspense,

} from "react";

import {

  useSearchParams,

} from "next/navigation";

import DuetRecorder
from "@/components/DuetRecorder";

// CONTENT
function CreateContent() {

  const searchParams =
    useSearchParams();

  const videoUrl =

    searchParams.get(
      "video"
    ) || "";

  const title =

    decodeURIComponent(

      searchParams.get(
        "title"
      ) || ""

    );

  const artist =

    decodeURIComponent(

      searchParams.get(
        "artist"
      ) || ""

    );

  // MISSING
  if (!videoUrl) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center text-2xl font-black">

        Missing video

      </main>

    );

  }

  return (

    <main className="min-h-screen bg-black text-white">

      {/* PLAYER */}
      <div className="px-3 pt-3">

        <div className="relative w-full h-[140px] rounded-2xl overflow-hidden bg-black">

          <video

            id="song-video"

            src={videoUrl}

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
          videoUrl
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

// PAGE
export default function CreatePage() {

  return (

    <Suspense>

      <CreateContent />

    </Suspense>

  );

}