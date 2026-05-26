import VideoCard
from "@/components/VideoCard";

import TopBar
from "@/components/TopBar";

import { supabase }
from "@/lib/supabase";

export default async function HomePage() {

  const {
    data: reactions,
    error,
  } =
    await supabase
      .from(
        "reactions"
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
    reactions
  );

  console.log(
    error
  );

  return (

    <main className="h-screen pb-24 overflow-y-scroll snap-y snap-mandatory bg-black">

      {/* TOP BAR */}
      <TopBar />

      {/* FEED */}
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

    </main>

  );

}