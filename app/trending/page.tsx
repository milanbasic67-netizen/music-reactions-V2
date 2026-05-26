import VideoCard
from "@/components/VideoCard";

import { supabase }
from "@/lib/supabase";

export default async function TrendingPage() {

  const {
    data: reactions,
  } =
    await supabase
      .from(
        "reactions"
      )
      .select("*")
      .order(
        "likes_count",
        {
          ascending:
            false,
        }
      )
      .limit(20);

  return (
    <main className="h-screen pb-24 overflow-y-scroll snap-y snap-mandatory bg-black">

      {/* HEADER */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent px-5 py-5">

        <h1 className="text-white text-4xl font-black">

          Trending

        </h1>

        <p className="text-zinc-400 mt-2">

          Most liked reactions

        </p>

      </div>

      {/* FEED */}
      <div className="pt-24">

        {reactions?.map(
          (
            reaction
          ) => (

            <VideoCard
              key={
                reaction.id
              }
              reaction={
                reaction
              }
            />

          )
        )}

      </div>

    </main>
  );
}