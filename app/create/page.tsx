import DuetRecorder
from "@/components/DuetRecorder";

type Props = {

  searchParams: {

    youtube?: string;

    title?: string;

    artist?: string;

  };

};

export default function CreatePage({
  searchParams,
}: Props) {

  const youtube =
    searchParams.youtube;

  const title =
    searchParams.title;

  const artist =
    searchParams.artist;

  if (!youtube) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center">

        Missing YouTube URL

      </main>

    );

  }

  // VIDEO ID
  let videoId =
    "";

  try {

    const parsed =
      new URL(
        decodeURIComponent(
          youtube
        )
      );

    videoId =
      parsed.searchParams.get(
        "v"
      ) || "";

  } catch {}

  return (

    <main className="min-h-screen bg-black text-white">

      {/* PLAYER */}
      <div className="w-full aspect-video bg-black sticky top-0 z-40">

        <iframe

          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`}

          className="w-full h-full"

          allow="autoplay"

          allowFullScreen

        />

      </div>

      {/* INFO */}
      <div className="p-5 border-b border-zinc-900">

        <h1 className="text-3xl font-black">

          {decodeURIComponent(
            title || ""
          )}

        </h1>

        <p className="text-zinc-500 mt-2">

          {decodeURIComponent(
            artist || ""
          )}

        </p>

      </div>

      {/* RECORDER */}
      <DuetRecorder

        youtubeUrl={
          decodeURIComponent(
            youtube
          )
        }

        title={
          decodeURIComponent(
            title || ""
          )
        }

        artist={
          decodeURIComponent(
            artist || ""
          )
        }

      />

    </main>

  );

}