import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TopBar from "@/components/TopBar";
import { Music, Play } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SongsPage() {
  const { data: songs, error } = await supabase
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#0D0D14] text-white pb-24">
      <TopBar />

      <div className="max-w-7xl mx-auto px-6 pt-24">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter">
              MUSIC <span className="text-violet-400">LIBRARY</span>
            </h1>
            <p className="text-slate-500 mt-4 text-lg max-w-md">
              Choose a track from our library or import your own via YouTube.
            </p>
          </div>

          <Link
            href="/admin/upload-song"
            className="inline-flex items-center justify-center bg-white/5 hover:bg-white/8 border border-white/8 px-6 py-4 rounded-2xl font-black text-sm transition group"
          >
            Don't see your song? <span className="text-violet-400 ml-2 group-hover:underline">Import here</span>
          </Link>
        </div>

        {/* EMPTY STATE */}
        {!songs?.length && (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/8 rounded-3xl">
            <Music size={48} className="text-slate-700 mb-4" />
            <p className="text-slate-500 font-bold">No songs available in the library yet.</p>
          </div>
        )}

        {/* RESPONSIVE GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
          {songs?.map((song) => {
            const createUrl = `/create?video=${encodeURIComponent(song.video_url || "")}&title=${encodeURIComponent(song.title || "")}&artist=${encodeURIComponent(song.artist || "")}`;

            return (
              <Link key={song.id} href={createUrl} className="group">
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-slate-900/50 border border-white/5 transition-all duration-300 group-hover:border-violet-500/40 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-violet-500/10">
                  
                  {/* THUMBNAIL / VIDEO PREVIEW */}
                  <div className="absolute inset-0">
                    {song.thumbnail_url ? (
                      <img
                        src={song.thumbnail_url}
                        alt={song.title}
                        className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Music className="text-slate-700 w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  </div>

                  {/* OVERLAY ICON */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-violet-600 p-4 rounded-full shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                      <Play className="text-white fill-current w-6 h-6" />
                    </div>
                  </div>

                  {/* INFO */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h2 className="font-black text-xl leading-tight line-clamp-2 group-hover:text-violet-400 transition-colors">
                      {song.title || "Untitled"}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-medium">
                      {song.artist || "Unknown Artist"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}