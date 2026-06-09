"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/getProfile";

type Props = {
  profileUsername: string;
};

export default function FollowButton({ profileUsername }: Props) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const me = await getProfile();
      if (!me) { setLoading(false); return; }

      const { data } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_username", me.username)
        .eq("following_username", profileUsername)
        .single();

      setFollowing(!!data);
      setLoading(false);
    }
    check();
  }, [profileUsername]);

  async function toggleFollow() {
    const me = await getProfile();
    if (!me) { alert("Login required"); return; }

    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_username", me.username)
        .eq("following_username", profileUsername);
      if (!error) setFollowing(false);
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_username: me.username, following_username: profileUsername });
      if (!error) {
        setFollowing(true);
        await supabase.from("notifications").insert({
          username: profileUsername,
          actor: me.username,
          type: "follow",
          read: false,
        });
      }
    }
  }

  if (loading) {
    return (
      <div className="px-10 py-3 rounded-xl bg-white/5 border border-white/8 animate-pulse w-28 h-10" />
    );
  }

  return (
    <button
      onClick={toggleFollow}
      className={`px-10 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition shadow-xl ${
        following
          ? "bg-white/10 text-white border border-white/10 hover:bg-white/15"
          : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/20"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
