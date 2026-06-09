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
        // 3. Send them to /u/john_doe (their actual name)
        router.push(`/u/${profile.username}`);
      } else {
        // If no username exists in the DB, send them home or to a setup page
        router.push("/");
      }
    }

    redirectToActualUsername();
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}