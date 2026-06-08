"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DebugProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [debugError, setDebugError] = useState<string | null>(null);

  useEffect(() => {
    async function testFetch() {
      setLoading(true);
      console.log("Attempting to fetch username:", username);

      // TEST 1: Try fetching from 'profiles'
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", username)
        .maybeSingle();

      if (error) {
        setDebugError(`Table 'profiles' error: ${error.message}`);
        
        // TEST 2: If 'profiles' fails, maybe it's 'users'?
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .ilike("username", username)
          .maybeSingle();
        
        if (userData) {
          setProfile(userData);
          setDebugError(null);
        } else if (userError) {
          setDebugError(`Tried 'profiles' and 'users' tables. Both failed.`);
        }
      } else if (!data) {
        setDebugError("User not found in 'profiles' table. Check if the username exists in Supabase.");
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    if (username) testFetch();
  }, [username]);

  if (loading) return <div className="p-10 text-white">Searching for {username}...</div>;

  if (debugError || !profile) {
    return (
      <div className="p-10 bg-black text-white min-h-screen">
        <h1 className="text-red-500 font-bold text-2xl mb-4">Debug Info:</h1>
        <p className="bg-zinc-900 p-4 rounded border border-red-900 text-red-200 font-mono">
          {debugError || "Unknown Error"}
        </p>
        <p className="mt-4 text-zinc-500">
          Username from URL: <span className="text-white">{username}</span>
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-white text-black font-bold rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-10 text-white">
      <h1 className="text-4xl font-black">Success! Profile found.</h1>
      <pre className="mt-4 bg-zinc-900 p-4 rounded">{JSON.stringify(profile, null, 2)}</pre>
    </div>
  );
}