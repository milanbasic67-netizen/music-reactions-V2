import Link
from "next/link";

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

  console.log(
    songs
  );

  console.log(
    error
  );

  return (

    <main className="min-h-screen bg-black text-white p-4">

      {/* HEADER */}
      <div className="mb-8 flex items-center justify-between">

        <div>

          <h1 className="text-4xl font-black">

            Songs

          </h1>

          <p className="text-zinc-500 mt-2">

            Pick a song to react to

          </p>

        </div>

        <Link

          href="/upload-song"

          className="bg-red-600 hover:bg-red-500 transition px-5 py-3 rounded-2xl font-black"

        >

          Upload

        </Link>

      </div>

      {/* EMPTY */}
      {!songs?.length && (

        <div className="text-zinc-500 text-center mt-32">

          No songs uploaded

        </div>

      )}

      {/* SONGS */}
      <div className="grid grid-cols-2 gap-4">

        {songs?.map(
          (
            song
          ) => {

            const createUrl =

`/create?video=${encodeURIComponent(song.video_url || "")}&title=${encodeURIComponent(song.title || "")}&artist=${encodeURIComponent(song.artist || "")}`;

            return (

              <Link

                key={
                  song.id
                }

                href={
                  createUrl
                }

                className="block"

              >

                <div className="rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition">

                  {/* THUMB */}
                  <div className="aspect-video bg-black">

                    {song.thumbnail_url ? (

                      <img
  src={song.thumbnail_url}
  alt={song.title}
  style={{
    width: "100%",
    height: "300px",
    border: "3px solid red"
  }}
/>

                    ) : (

                      <video

                        src={
                          song.video_url
                        }

                        className="w-full h-full object-cover"

                        muted

                        autoPlay

                        loop

                        playsInline

                      />

                    )}

                  </div>

                  {/* INFO */}
                  <div className="p-4">

                    <h2 className="font-black text-lg line-clamp-1">

                      {song.title ||
                        "Untitled"}

                    </h2>

                    <p className="text-zinc-500 mt-1 line-clamp-1">

                      {song.artist ||
                        "Unknown"}

                    </p>

                  </div>

                </div>

              </Link>

            );

          }

        )}

      </div>

    </main>

  );

}