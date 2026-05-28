"use client";

import {

  Heart,

  MessageCircle,

  Share,

  Trash2,

  Volume2,

  VolumeX,

} from "lucide-react";

import Link
from "next/link";

import {

  useEffect,

  useRef,

  useState,

} from "react";

import { supabase }
from "@/lib/supabase";

import { getProfile }
from "@/lib/getProfile";

type Props = {

  reaction: any;

};

export default function VideoCard({
  reaction,
}: Props) {

  const videoRef =
    useRef<HTMLVideoElement>(
      null
    );

  const [profile,
    setProfile] =
    useState<any>(
      null
    );

  const [liked,
    setLiked] =
    useState(false);

  const [likesCount,
    setLikesCount] =
    useState(

      reaction.likes_count ||
      0

    );

  const [muted,
    setMuted] =
    useState(false);

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

  // AUTOPLAY
  useEffect(() => {

    const video =
      videoRef.current;

    if (!video)
      return;

    const observer =
      new IntersectionObserver(

        ([entry]) => {

          if (
            entry.isIntersecting
          ) {

            video
              .play()
              .catch(
                () => {}
              );

          } else {

            video.pause();

          }

        },

        {

          threshold:
            0.7,

        }

      );

    observer.observe(
      video
    );

    return () => {

      observer.disconnect();

    };

  }, []);

  // TOGGLE SOUND
  function toggleSound() {

    const video =
      videoRef.current;

    if (!video)
      return;

    if (muted) {

      video.muted =
        false;

      video.volume =
        1;

      setMuted(
        false
      );

    } else {

      video.muted =
        true;

      setMuted(
        true
      );

    }

  }

  // LIKE
  async function toggleLike() {

    const {
      data: { user },
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

    const {
      data: existing,
    } =
      await supabase

        .from(
          "likes"
        )

        .select("*")

        .eq(
          "reaction_id",
          reaction.id
        )

        .eq(
          "user_id",
          user.id
        )

        .single();

    // UNLIKE
    if (existing) {

      await supabase

        .from(
          "likes"
        )

        .delete()

        .eq(
          "id",
          existing.id
        );

      setLiked(
        false
      );

      setLikesCount(
        (
          prev: number
        ) =>
          prev - 1
      );

    } else {

      // LIKE
      await supabase

        .from(
          "likes"
        )

        .insert({

          reaction_id:
            reaction.id,

          user_id:
            user.id,

        });

      setLiked(
        true
      );

      setLikesCount(
        (
          prev: number
        ) =>
          prev + 1
      );

    }

  }

  // SHARE
  async function shareVideo() {

    await navigator
      .clipboard
      .writeText(

`${window.location.origin}/reaction/${reaction.id}`

      );

    alert(
      "Link copied!"
    );

  }

  // DELETE
  async function deleteReaction() {

    try {

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

      const canDelete =

        reaction.user_id ===
        user.id ||

        profile?.role ===
        "admin";

      if (!canDelete) {

        alert(
          "You can delete only your own reactions"
        );

        return;

      }

      const confirmed =
        confirm(
          "Delete reaction?"
        );

      if (
        !confirmed
      ) return;

      // STORAGE PATH
      let storagePath =
        "";

      if (
        reaction.video_url
      ) {

        const split =
          reaction.video_url.split(
            "/videos/"
          );

        storagePath =
          split[1];

      }

      // DELETE STORAGE VIDEO
      if (
        storagePath
      ) {

        await supabase
          .storage
          .from(
            "videos"
          )
          .remove([
            storagePath,
          ]);

      }

      // DELETE LIKES
      await supabase

        .from(
          "likes"
        )

        .delete()

        .eq(
          "reaction_id",
          reaction.id
        );

      // DELETE REACTION
      const {
        error,
      } =
        await supabase

          .from(
            "reactions"
          )

          .delete()

          .eq(
            "id",
            reaction.id
          );

      if (
        error
      ) {

        alert(
          error.message
        );

        return;

      }

      window.location.reload();

    } catch (err) {

      console.log(
        err
      );

    }

  }

  return (

    <div className="relative h-screen w-screen overflow-hidden bg-black snap-start">

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

        className="absolute inset-0 w-full h-full object-contain bg-black"

      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/20 z-10" />

      {/* CONTENT */}
      <div className="absolute inset-0 z-40 flex">

        {/* LEFT */}
        <div className="flex-1 flex flex-col justify-end p-5">

          <div className="mb-24">

            {/* USER */}
            <Link

              href={`/u/${reaction.username}`}

              className="font-black text-2xl"

            >

              @
              {reaction.username}

            </Link>

            {/* SONG */}
            <h2 className="text-lg mt-3 font-bold">

              {reaction.song}

            </h2>

            {/* ARTIST */}
            <p className="text-zinc-300 mt-1">

              {reaction.artist}

            </p>

          </div>

        </div>

        {/* RIGHT */}
        <div className="w-24 flex flex-col items-center justify-end gap-6 pb-32">

          {/* LIKE */}
          <button
            onClick={
              toggleLike
            }
            className="flex flex-col items-center"
          >

            <Heart
              className={`w-8 h-8 ${
                liked
                  ? "fill-red-500 text-red-500"
                  : "text-white"
              }`}
            />

            <span className="text-xs mt-1">

              {likesCount}

            </span>

          </button>

          {/* COMMENTS */}
          <button
            className="flex flex-col items-center"
          >

            <MessageCircle className="w-8 h-8 text-white" />

          </button>

          {/* SHARE */}
          <button
            onClick={
              shareVideo
            }
            className="flex flex-col items-center"
          >

            <Share className="w-8 h-8 text-white" />

          </button>

          {/* DELETE */}
          <button
            onClick={
              deleteReaction
            }
            className="flex flex-col items-center"
          >

            <Trash2 className="w-8 h-8 text-white" />

          </button>

          {/* SOUND */}
          <button
            onClick={
              toggleSound
            }
            className="flex flex-col items-center"
          >

            {muted ? (

              <VolumeX className="w-8 h-8 text-white" />

            ) : (

              <Volume2 className="w-8 h-8 text-white" />

            )}

          </button>

        </div>

      </div>

    </div>

  );

}