"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!trimmed || trimmed.length < 3) return alert("Username must be at least 3 characters (letters, numbers, underscores only).");
    if (!userId) return;

    setLoading(true);

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", trimmed)
      .single();

    if (existing) {
      alert("That username is already taken.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, username: trimmed }, { onConflict: "id" });

    if (error) {
      alert("Failed to save username. Please try again.");
    } else {
      router.push(`/u/${trimmed}`);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0D0D14] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#0F0F1A] border border-white/8 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-white text-4xl font-black text-center tracking-tighter">Choose a username</h1>
        <p className="text-slate-500 text-center mt-3 text-sm">This is how others will find you on Duet.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_username"
              maxLength={30}
              className="w-full bg-white/5 border border-white/8 rounded-2xl pl-10 pr-5 py-4 text-white outline-none focus:border-violet-500 transition font-bold"
            />
          </div>
          <button
            type="submit"
            disabled={loading || username.trim().length < 3}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-lg py-4 rounded-2xl transition"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
