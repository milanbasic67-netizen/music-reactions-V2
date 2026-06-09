"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import VideoCard from "@/components/VideoCard";

export default function VideoPage() {
  const params = useParams();
  const router = useRouter();
  const [reaction, setReaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("reactions")
        .select("*")
        .eq("id", params.id)
        .single();

      if (!data) {
        router.push("/");
        return;
      }
      setReaction(data);
      setLoading(false);
    }
    load();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D14] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#0D0D14]">
      <VideoCard reaction={reaction} />
    </div>
  );
}
