import Link
from "next/link";

import { supabase }
from "@/lib/supabase";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

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

  console.log(
    error
  );

  return (

    <main className="min-h-screen bg-black text-white p-5">

      {/* HEADER */}
      <div className="mb-10">

        <h1 className="text-4xl font-black">

          Songs

        </h1>

        <p className="text-zinc-500 mt-2">

          Choose a song to react to

        </p>

      </div>

      {/* EMPTY */}
      {(!songs ||
        songs.length === 0) && (

        <div className="text-zinc-500 text-lg">

          No songs uploaded

        </div>

      )}

      {/* SONGS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">

        {songs?.map(

          (
            song
          ) => {

            

            const createUrl =

              `/create?youtube=${encodeURIComponent(song.youtube_url)}&title=${encodeURIComponent(song.title || "")}&artist=${encodeURIComponent(song.artist || "")}`;

            console.log(
              createUrl
            );

            return (

              <Link

                key={
                  song.id
                }

                href={
                  createUrl
                }

                className="group"

              >

                {/* THUMB */}
                <div className="aspect-[9/16] rounded-3xl overflow-hidden bg-zinc-900 relative">

                  <img

                    src={
                      song.thumbnail_url ||
                      "/placeholder.jpg"
                    }

                    alt={
                      song.title
                    }

                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"

                  />

                  {/* PLAY */}
                  <div className="absolute inset-0 flex items-center justify-center">

                    <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white text-3xl">

                      ▶

                    </div>

                  </div>

                </div>

                {/* INFO */}
                <div className="mt-3">

                  <h2 className="font-black text-lg line-clamp-1">

                    {song.title ||
                      "Untitled"}

                  </h2>

                  <p className="text-zinc-500 text-sm">

                    {song.artist ||
                      "Unknown Artist"}

                  </p>

                </div>

              </Link>

            );

          }

        )}

      </div>

    </main>

  );

}