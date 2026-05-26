import Link from "next/link";

import { supabase }
from "@/lib/supabase";

export default async function SongsPage() {

  const {
    data: songs,
    error,
  } =
    await supabase
      .from(
        "songs"
      )
      .select("*")
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  return (

    <main className="min-h-screen bg-black text-white pb-28">

      {/* HEADER */}
      <div className="px-6 pt-16 pb-10">

        <h1 className="text-5xl font-black">

          Songs

        </h1>

        <p className="text-zinc-400 mt-4 text-lg">

          Pick a song and create a reaction

        </p>

      </div>

      {/* ERROR */}
      {error && (

        <div className="px-6 text-red-500">

          Failed to load songs

        </div>

      )}

      {/* EMPTY */}
      {!songs ||
        songs.length === 0 ? (

        <div className="px-6 text-zinc-500 text-xl">

          No songs uploaded yet.

        </div>

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-6">

          {songs.map(
            (
              song
            ) => (

              <div
                key={
                  song.id
                }
                className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden"
              >

                {/* THUMB */}
                <img
                  src={
                    song.thumbnail_url
                      ? song.thumbnail_url
                      : "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"
                  }
                  alt={
                    song.title
                  }
                  className="w-full h-[420px] object-cover bg-black"
                />

                {/* INFO */}
                <div className="p-6">

                  <h2 className="text-2xl font-black leading-tight">

                    {
                      song.title
                    }

                  </h2>

                  <p className="text-zinc-400 mt-3 text-lg">

                    {
                      song.artist
                    }

                  </p>

                  {/* BUTTON */}
                  <Link
                    href={`/create?video=${encodeURIComponent(
                      song.video_url
                    )}&title=${encodeURIComponent(
                      song.title
                    )}&artist=${encodeURIComponent(
                      song.artist
                    )}`}
                  >

                    <button
                      className="mt-6 w-full bg-red-600 hover:bg-red-500 transition text-white font-black py-4 rounded-2xl"
                    >

                      React To This

                    </button>

                  </Link>

                </div>

              </div>

            )
          )}

        </div>

      )}

    </main>

  );

}