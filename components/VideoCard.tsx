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

import CommentsModal
from "./CommentsModal";

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

  const [
    commentsOpen,
    setCommentsOpen,
  ] = useState(false);

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  const [following, setFollowing] =
    useState(false);

  // AUTOPLAY + USER
  useEffect(() => {

    const video =
      videoRef.current;

    if (!video) return;

    // GET USER
    supabase.auth
      .getUser()
      .then(
        async ({
          data,
        }) => {

          setCurrentUser(
            data.user
          );

          // CHECK FOLLOW
          const username =
            data.user?.email?.split(
              "@"
            )[0];

          if (
            username
          ) {

            const {
              data: existing,
            } =
              await supabase
                .from(
                  "follows"
                )
                .select("*")
                .eq(
                  "follower_username",
                  username
                )
                .eq(
                  "following_username",
                  reaction.username
                )
                .single();

            if (
              existing
            ) {

              setFollowing(
                true
              );

            }

          }

        }
      );

    // AUTOPLAY
    const observer =
      new IntersectionObserver(
        (
          entries
        ) => {

          entries.forEach(
            (
              entry
            ) => {

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

            }
          );

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

    if (!video) return;

    if (muted) {

      video.muted =
        false;

      video.volume =
        1;

      setMuted(
        false
      );

      video.play();

    } else {

      video.muted =
        true;

      setMuted(
        true
      );

    }

  }

  // LIKE SYSTEM
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

    // EXISTING LIKE
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

      // NOTIFICATION
      await supabase
        .from(
          "notifications"
        )
        .insert({

          username:
            reaction.username,

          actor:
            user.email?.split(
              "@"
            )[0],

          type:
            "like",

          reaction_id:
            reaction.id,

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

  // FOLLOW SYSTEM
  async function toggleFollow() {

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

    const myUsername =
      user.email?.split(
        "@"
      )[0];

    // CAN’T FOLLOW SELF
    if (
      myUsername ===
      reaction.username
    ) {

      return;

    }

    // EXISTING
    const {
      data: existing,
    } =
      await supabase
        .from(
          "follows"
        )
        .select("*")
        .eq(
          "follower_username",
          myUsername
        )
        .eq(
          "following_username",
          reaction.username
        )
        .single();

    // UNFOLLOW
    if (existing) {

      await supabase
        .from(
          "follows"
        )
        .delete()
        .eq(
          "id",
          existing.id
        );

      setFollowing(
        false
      );

    } else {

      // FOLLOW
      await supabase
        .from(
          "follows"
        )
        .insert({

          follower_username:
            myUsername,

          following_username:
            reaction.username,

        });

      // NOTIFICATION
      await supabase
        .from(
          "notifications"
        )
        .insert({

          username:
            reaction.username,

          actor:
            myUsername,

          type:
            "follow",

        });

      setFollowing(
        true
      );

    }

  }

  // DELETE POST
  async function deletePost() {

    const confirmDelete =
      confirm(
        "Delete this reaction?"
      );

    if (!confirmDelete) {
      return;
    }

    try {

      await supabase
        .from(
          "reactions"
        )
        .delete()
        .eq(
          "id",
          reaction.id
        );

      window.location.reload();

    } catch (err) {

      console.log(
        err
      );

      alert(
        "Delete failed"
      );

    }

  }

  return (
    <div className="relative h-screen w-screen snap-start overflow-hidden bg-black">

      {/* VIDEO */}
      <video
        ref={videoRef}
        src={
          reaction.video_url
        }
        loop
        muted={muted}
        playsInline
        controls={false}
        onClick={
          toggleSound
        }
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/30 z-10 pointer-events-none" />

      {/* SOUND BUTTON */}
      <button
        onClick={
          toggleSound
        }
        className="absolute top-6 right-5 z-30 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-3"
      >

        {muted ? (

          <VolumeX
            size={24}
            className="text-white"
          />

        ) : (

          <Volume2
            size={24}
            className="text-white"
          />

        )}

      </button>

      {/* RIGHT ACTIONS */}
      <div className="absolute right-4 bottom-32 z-30 flex flex-col items-center gap-7">

        {/* DELETE */}
        {currentUser?.email?.split(
          "@"
        )[0] ===
        reaction.username && (

          <button
            onClick={
              deletePost
            }
            className="flex flex-col items-center active:scale-90 transition"
          >

            <Trash2
              size={36}
              className="text-red-500"
            />

            <span className="text-red-400 text-xs mt-2 font-semibold">

              Delete

            </span>

          </button>

        )}

        {/* LIKE */}
        <button
          onClick={
            toggleLike
          }
          className="flex flex-col items-center active:scale-90 transition"
        >

          <Heart
            size={36}
            className={
              liked
                ? "fill-red-500 text-red-500"
                : "text-white"
            }
          />

          <span className="text-white text-xs mt-2 font-semibold">

            {likesCount}

          </span>

        </button>

        {/* COMMENTS */}
        <button
          onClick={() =>
            setCommentsOpen(
              true
            )
          }
          className="flex flex-col items-center active:scale-90 transition"
        >

          <MessageCircle
            size={36}
            className="text-white"
          />

          <span className="text-white text-xs mt-2 font-semibold">

            {
              reaction.comments_count ||
              0
            }

          </span>

        </button>

        {/* SHARE */}
        <button
          onClick={
            async () => {

              try {

                await navigator.share({
                  title:
                    reaction.song,

                  url:
                    reaction.video_url,
                });

              } catch {}

            }
          }
          className="flex flex-col items-center active:scale-90 transition"
        >

          <Share
            size={36}
            className="text-white"
          />

          <span className="text-white text-xs mt-2 font-semibold">

            Share

          </span>

        </button>

      </div>

      {/* USER INFO */}
      <div className="absolute bottom-10 left-5 right-24 z-30">

        {/* USER */}
        <div className="flex items-center gap-3">

          <div className="w-12 h-12 rounded-full bg-zinc-700 border border-white/20 flex items-center justify-center text-white font-black">

            {reaction.username?.[0]?.toUpperCase() ||
              "U"}

          </div>

          <div>

            <h2 className="text-white font-black text-xl">

              @
              {
                reaction.username
              }

            </h2>

            <p className="text-zinc-300 text-sm">

              Music Reaction

            </p>

            {/* FOLLOW BUTTON */}
            {currentUser?.email?.split(
              "@"
            )[0] !==
            reaction.username && (

              <button
                onClick={
                  toggleFollow
                }
                className={
                  following
                    ? "mt-3 bg-zinc-700 text-white px-4 py-2 rounded-full text-sm font-bold"
                    : "mt-3 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold"
                }
              >

                {following
                  ? "Following"
                  : "Follow"}

              </button>

            )}

          </div>

        </div>

        {/* SONG */}
        <div className="mt-5">

          <h3 className="text-white text-xl font-bold leading-tight">

            {
              reaction.song
            }

          </h3>

          <p className="text-zinc-300 mt-2">

            {
              reaction.artist
            }

          </p>

        </div>

      </div>

      {/* COMMENTS MODAL */}
      <CommentsModal
        reactionId={
          reaction.id
        }
        open={
          commentsOpen
        }
        onClose={() =>
          setCommentsOpen(
            false
          )
        }
      />

    </div>
  );
}