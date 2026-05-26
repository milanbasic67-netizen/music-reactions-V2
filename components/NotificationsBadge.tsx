"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase }
from "@/lib/supabase";

export default function NotificationsBadge() {

  const [count, setCount] =
    useState(0);

  useEffect(() => {

    async function loadNotifications() {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      const username =
        user.email?.split(
          "@"
        )[0];

      const {
        data,
      } =
        await supabase
          .from(
            "notifications"
          )
          .select("*")
          .eq(
            "username",
            username
          )
          .eq(
            "read",
            false
          );

      setCount(
        data?.length || 0
      );

    }

    loadNotifications();

    // REALTIME
    const channel =
      supabase
        .channel(
          "notifications-realtime"
        )
        .on(
          "postgres_changes",

          {
            event:
              "*",

            schema:
              "public",

            table:
              "notifications",
          },

          () => {

            loadNotifications();

          }
        )
        .subscribe();

    return () => {

      supabase.removeChannel(
        channel
      );

    };

  }, []);

  if (count === 0) {
    return null;
  }

  return (
    <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-black">

      {count}

    </div>
  );
}