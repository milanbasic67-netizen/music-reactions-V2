"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const username = profile?.username;
      if (!username) { setLoading(false); return; }

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("username", username)
        .order("created_at", { ascending: false });

      setNotifications(data || []);
      setLoading(false);

      // Mark all as read
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("username", username)
        .eq("read", false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0D0D14] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (notLoggedIn) {
    return (
      <main className="min-h-screen pb-24 bg-[#0D0D14] text-white p-5 flex items-center justify-center">
        <p className="font-black text-slate-500 uppercase tracking-widest text-xs">Please log in to view notifications.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24 bg-[#0D0D14] text-white p-5">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-black">Notifications</h1>

        <div className="mt-10 space-y-4">
          {notifications.length === 0 ? (
            <p className="text-slate-600 font-bold text-sm uppercase tracking-widest text-center py-16">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`border rounded-3xl p-5 transition ${n.read ? "bg-white/4 border-white/8" : "bg-violet-500/5 border-violet-500/20"}`}>
                <div className="text-white text-lg font-bold">
                  @{n.actor}{" "}
                  {n.type === "like" && "liked your reaction"}
                  {n.type === "follow" && "followed you"}
                  {n.type === "comment" && "commented on your reaction"}
                </div>
                <div className="text-slate-500 mt-2 text-sm">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
