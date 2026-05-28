import DuetRecorder
from "@/components/DuetRecorder";

type Props = {
  searchParams: {

    video?: string;

    title?: string;

    artist?: string;

  };
};

export default function CreatePage({
  searchParams,
}: Props) {

  const video =
    searchParams.video;

  const title =
    searchParams.title;

  const artist =
    searchParams.artist;

  if (!video) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center">

        Missing video URL

      </main>

    );

  }

  return (

    <main className="min-h-screen bg-black">

      <DuetRecorder

        originalVideo={
          decodeURIComponent(
            video
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