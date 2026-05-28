"use client";

import {

  useEffect,

  useState,

} from "react";

import { supabase }
from "@/lib/supabase";

type Props = {

  profileId: string;

};

export default function FollowButton({
  profileId,
}: Props) {

  const [following,
    setFollowing] =
    useState(false);

  const [loading,
    setLoading] =
    useState(true);

  // CHECK
  useEffect(() => {

    async function check() {

      const {
        data: {
          user,
        },
      } =
        await supabase
          .auth
          .getUser();

      if (!user) {

        setLoading(
          false
        );

        return;

      }

      const {
        data,
      } =
        await supabase

          .from(
            "followers"
          )

          .select("*")

          .eq(
            "follower_id",
            user.id
          )

          .eq(
            "following_id",
            profileId
          )

          .single();

      setFollowing(
        !!data
      );

      setLoading(
        false
      );

    }

    check();

  }, [profileId]);

  // TOGGLE
  async function toggleFollow() {

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

    // UNFOLLOW
    if (following) {

      await supabase
        .from(
          "followers"
        )
        .delete()
        .eq(
          "follower_id",
          user.id
        )
        .eq(
          "following_id",
          profileId
        );

      setFollowing(
        false
      );

    } else {

      // FOLLOW
      await supabase
        .from(
          "followers"
        )
        .insert({

          follower_id:
            user.id,

          following_id:
            profileId,

        });

      setFollowing(
        true
      );

    }

  }

  if (loading) {

    return null;

  }

  return (

    <button

      onClick={
        toggleFollow
      }

      className={`mt-5 px-6 py-3 rounded-2xl font-black ${
        following
          ? "bg-zinc-800 text-white"
          : "bg-white text-black"
      }`}

    >

      {following
        ? "Following"
        : "Follow"}

    </button>

  );

}