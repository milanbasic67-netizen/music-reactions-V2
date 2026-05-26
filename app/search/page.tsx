"use client";

import {
  useEffect,
  useState,
} from "react";

import Link
from "next/link";

import { supabase }
from "@/lib/supabase";

export default function SearchPage() {

  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(false);

  // SEARCH
  useEffect(() => {

    async function search() {

      if (!query) {

        setResults([]);

        return;

      }

      setLoading(
        true
      );

      // SEARCH REACTIONS
      const {
        data,
      } =
        await supabase
          .from(
            "reactions"
          )
          .select("*")
          .or(
            `song.ilike.%${query}%,
             artist.ilike.%${query}%,
             username.ilike.%${query}%`
          )
          .limit(30);

      setResults(
        data || []
      );

      setLoading(
        false
      );

    }

    const timeout =
      setTimeout(
        search,
        300
      );

    return () =>
      clearTimeout(
        timeout
      );

  }, [query]);

  return (
    <main className="min-h-screen pb-24 bg-black text-white p-5">

      {/* HEADER */}
      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-black">

          Search

        </h1>

        <p className="text-zinc-400 mt-3 text-lg">

          Find songs, artists and creators

        </p>

      </div>

      {/* SEARCH INPUT */}
      <div className="max-w-4xl mx-auto mt-8">

        <input
          value={query}
          onChange={(e) =>
            setQuery(
              e.target.value
            )
          }
          placeholder="Search..."
          className="w-full bg-zinc-900 border border-white/10 rounded-3xl px-6 py-5 text-white text-xl outline-none"
        />

      </div>

      {/* LOADING */}
      {loading && (

        <div className="text-center text-zinc-400 mt-10">

          Searching...

        </div>

      )}

      {/* RESULTS */}
      <div className="max-w-4xl mx-auto mt-10 space-y-5">

        {results.map(
          (
            reaction
          ) => (

            <Link
              key={
                reaction.id
              }
              href="/"
            >

              <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden hover:border-red-500/40 transition cursor-pointer">

                {/* VIDEO */}
                <video
                  src={
                    reaction.video_url
                  }
                  muted
                  playsInline
                  className="w-full h-[260px] object-cover bg-black"
                />

                {/* INFO */}
                <div className="p-5">

                  <div className="text-white text-2xl font-black">

                    {
                      reaction.song
                    }

                  </div>

                  <div className="text-zinc-400 mt-2">

                    {
                      reaction.artist
                    }

                  </div>

                  <div className="text-red-400 mt-4 font-bold">

                    @
                    {
                      reaction.username
                    }

                  </div>

                </div>

              </div>

            </Link>

          )
        )}

      </div>

    </main>
  );
}