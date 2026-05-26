"use client";

import {
  useSearchParams,
} from "next/navigation";

import DuetRecorder
from "@/components/DuetRecorder";

export default function CreatePage() {

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