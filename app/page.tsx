import VideoCard
from "@/components/VideoCard";

import TopBar
from "@/components/TopBar";

import { supabase }
from "@/lib/supabase";

// DISABLE CACHE
export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

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
    "REACTIONS"
  );

  console.log(
    reactions
  );

  console.log(
    "ERROR"
  );

  console.log(
    error
  );

  return (

    <main className="h-screen overflow-y-scroll snap-y snap-mandatory bg-black">

      {/* TOP BAR */}
      <TopBar />

      {/* EMPTY */}
      {(!reactions ||
        reactions.length === 0) && (

        <div className="h-screen flex items-center justify-center text-zinc-500 text-xl">

          No reactions yet

        </div>

      )}

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