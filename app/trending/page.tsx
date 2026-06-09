import VideoCard from "@/components/VideoCard";
import { supabase } from "@/lib/supabase";
import { Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const { data: reactions } = await supabase
    .from("reactions")
    .select("*")
    .order("likes_count", { ascending: false })
    .limit(20);

  return (
    <main className="h-screen pb-24 overflow-y-scroll snap-y snap-mandatory bg-[#0D0D14]">
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#0D0D14]/90 to-transparent px-5 py-5 pointer-events-none">
        <h1 className="text-white text-4xl font-black">Trending</h1>
        <p className="text-slate-400 mt-2">Most liked reactions</p>
      </div>

      {!reactions?.length ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-10">
          <Flame className="w-16 h-16 text-slate-700 mb-4 opacity-20" />
          <p className="text-slate-500 font-black uppercase tracking-tighter text-xl">No trending videos yet</p>
          <p className="text-slate-600 text-sm mt-2">Be the first to post a reaction</p>
        </div>
      ) : (
        <div className="pt-24">
          {reactions.map((reaction) => (
            <VideoCard key={reaction.id} reaction={reaction} />
          ))}
        </div>
      )}
    </main>
  );
}
