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

      className={`px-10 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-xl ${
        following
          ? "bg-white/10 text-white border border-white/10 hover:bg-white/15"
          : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/20"
      }`}

    >

      {following
        ? "Following"
        : "Follow"}

    </button>

  );

}