"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function getMyUsername() {
      // 1. Get the logged in user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return router.push("/login");
      }

      // 2. Look up their username in the profiles table
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (profile?.username) {
        // 3. Redirect to /u/their_actual_username
        router.push(`/u/${profile.username}`);
      } else {
        console.error("No username found for this ID:", user.id);
        router.push("/"); // Go home if no username exists
      }
    }

    getMyUsername();
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}