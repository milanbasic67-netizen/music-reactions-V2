"use client";

import {

  Heart,

  MessageCircle,

  Share,

  Volume2,

  VolumeX,

  Trash2,

} from "lucide-react";

import {

  useEffect,

  useRef,

  useState,

} from "react";

import { supabase }
from "@/lib/supabase";

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

  const [liked, setLiked] =
    useState(false);

  const [likesCount, setLikesCount] =
    useState(
      reaction.likes_count || 0
    );

  const [muted, setMuted] =
    useState(true);

  // FINAL VIDEO URL
  const finalVideoUrl =

    reaction.video_url ||
    reaction.videoUrl ||
    reaction.url;

  // AUTOPLAY
  useEffect(() => {

    const video =
      videoRef.current;

    if (!video) return;

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

  // SOUND
  function toggleSound() {

    const video =
      videoRef.current;

    if (!video) return;

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
      await supabase.auth.getUser();

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

    await navigator.clipboard.writeText(

      `${window.location.origin}/reaction/${reaction.id}`

    );

    alert(
      "Link copied!"
    );

  }

  // DELETE
  async function deleteReaction() {

    try {

      // CURRENT USER
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

      // OWNER CHECK
      const currentUsername =
        user.email
          ?.split("@")[0];

      if (

        reaction.username !==
        currentUsername

      ) {

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

      console.log(
        reaction
      );

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

      console.log(
        storagePath
      );

      // DELETE STORAGE VIDEO
      if (
        storagePath
      ) {

        const {
          error:
            storageError,
        } =
          await supabase
            .storage
            .from(
              "videos"
            )
            .remove([
              storagePath,
            ]);

        console.log(
          storageError
        );

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

        console.log(
          error
        );

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

    <div className="relative h-screen w-screen overflow-hidden bg-black">

      {/* VIDEO */}
      <video
        ref={videoRef}
        src={finalVideoUrl}
        className="absolute inset-0 h-full w-full object-contain bg-black"
        autoPlay
        loop
        playsInline
        muted={muted}
      />

      {/* OVERLAY */}
      <div className="absolute inset-0 z-20 flex">

        {/* LEFT */}
        <div className="flex-1 flex flex-col justify-end p-5">

          <div className="mb-24">

            <h2 className="font-black text-xl">

              @
              {reaction.username ||
                "user"}

            </h2>

            <p className="text-sm text-zinc-300 mt-2">

              {reaction.song}

            </p>

            <p className="text-xs text-zinc-500 mt-1">

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

            <span className="text-xs mt-1">

              {reaction.comments_count || 0}

            </span>

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