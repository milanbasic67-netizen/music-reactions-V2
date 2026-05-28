"use client";

import {

  useEffect,

  useRef,

  useState,

} from "react";

type Props = {

  reaction: any;

  active?: boolean;

};

export default function VideoCard({

  reaction,

  active = true,

}: Props) {

  const videoRef =
    useRef<HTMLVideoElement>(
      null
    );

  const [muted,
    setMuted] =
    useState(false);

  // AUTOPLAY
  useEffect(() => {

    if (
      !videoRef.current
    ) {

      return;

    }

    if (active) {

      videoRef.current
        .play()
        .catch(
          console.log
        );

    } else {

      videoRef.current
        .pause();

    }

  }, [active]);

  // TOGGLE SOUND
  function toggleMute() {

    setMuted(
      !muted
    );

  }

  return (

    <div className="relative w-full h-screen bg-black overflow-hidden">

      {/* FINAL DUET VIDEO */}
      <video

        ref={videoRef}

        src={
          reaction.video_url
        }

        autoPlay

        loop

        playsInline

        muted={muted}

        className="absolute inset-0 w-full h-full object-cover"

      />

      {/* GRADIENT */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

      {/* INFO */}
      <div className="absolute bottom-24 left-4 right-24 z-20">

        <div className="mb-4">

          <h2 className="font-black text-2xl text-white">

            @{reaction.username || "user"}

          </h2>

          <p className="text-zinc-300 mt-2 text-lg">

            {reaction.song || "Song"}

          </p>

          <p className="text-zinc-500 mt-1">

            {reaction.artist || "Artist"}

          </p>

        </div>

      </div>

      {/* RIGHT ACTIONS */}
      <div className="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-6">

        {/* SOUND */}
        <button

          onClick={
            toggleMute
          }

          className="w-14 h-14 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white text-2xl"

        >

          {muted
            ? "🔇"
            : "🔊"}

        </button>

      </div>

    </div>

  );

}