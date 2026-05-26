import { supabase }
from "@/lib/supabase";

import DuetRecorder
from "@/components/DuetRecorder";

export default async function CreateSongPage({
  params,
}: any) {

  const {
    data: song,
  } =
    await supabase
      .from(
        "songs"
      )
      .select("*")
      .eq(
        "id",
        params.id
      )
      .single();

  if (!song) {

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-4xl font-black">

        Song not found

      </div>
    );

  }

  return (
    <DuetRecorder
      originalVideo={
        song.video_url
      }
      song={
        song.title
      }
      artist={
        song.artist
      }
    />
  );

}