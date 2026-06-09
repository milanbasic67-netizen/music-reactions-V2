"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function redirectToActualUsername() {
      // 1. Get the current logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return router.push("/login");
      }

      // 2. Fetch their actual username from your 'profiles' table
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (profile?.username) {
        router.push(`/u/${profile.username}`);
      } else {
        router.push("/setup");
      }
    }

    redirectToActualUsername();
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}