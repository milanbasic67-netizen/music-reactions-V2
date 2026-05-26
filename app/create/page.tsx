"use client";

import {
  Suspense,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import DuetRecorder
from "@/components/DuetRecorder";

function CreateContent() {

  const searchParams =
    useSearchParams();

  const video =
    searchParams.get(
      "video"
    );

  const title =
    searchParams.get(
      "title"
    );

  const artist =
    searchParams.get(
      "artist"
    );

  if (!video) {

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white text-2xl font-black">

        No song selected

      </div>
    );

  }

  return (
    <DuetRecorder
      originalVideo={
        video
      }
      title={
        title || ""
      }
      artist={
        artist || ""
      }
    />
  );

}

export default function CreatePage() {

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black flex items-center justify-center text-white text-2xl font-black">

          Loading...

        </div>
      }
    >

      <CreateContent />

    </Suspense>
  );

}