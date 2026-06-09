"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import VideoCard from "@/components/VideoCard";
import { AlertCircle } from "lucide-react";

export default function VideoPage() {
  const params = useParams();
  const router = useRouter();
  const [reaction, setReaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("reactions")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setReaction(data);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D14] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0D0D14] text-white flex flex-col items-center justify-center p-10 text-center">
        <AlertCircle className="w-16 h-16 text-slate-700 mb-4" />
        <h1 className="text-2xl font-black mb-2">VIDEO NOT FOUND</h1>
        <p className="text-slate-500 text-sm mb-8">This video may have been deleted.</p>
        <button onClick={() => router.push("/")} className="px-10 py-3 bg-white/5 rounded-full font-bold hover:bg-white/10 transition">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#0D0D14]">
      <VideoCard reaction={reaction} />
    </div>
  );
}
