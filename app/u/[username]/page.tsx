import { supabase }
from "@/lib/supabase";

import VideoCard
from "@/components/VideoCard";

type Props = {

  params: {

    username: string;

  };

};

export const dynamic =
  "force-dynamic";

export default async function UserPage({
  params,
}: Props) {

  // PROFILE
  const {
    data: profile,
  } =
    await supabase

      .from(
        "profiles"
      )

      .select("*")

      .eq(
        "username",
        params.username
      )

      .single();

  // REACTIONS
  const {
    data: reactions,
  } =
    await supabase

      .from(
        "reactions"
      )

      .select("*")

      .eq(
        "username",
        params.username
      )

      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (!profile) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center">

        User not found

      </main>

    );

  }

  return (

    <main className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <div className="p-6 border-b border-zinc-900">

        <div className="flex items-center gap-5">

          {/* AVATAR */}
          <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-900">

            {profile.avatar_url ? (

              <img

                src={
                  profile.avatar_url
                }

                className="w-full h-full object-cover"

              />

            ) : (

              <div className="w-full h-full flex items-center justify-center text-3xl font-black">

                {profile.username?.[0]
                  ?.toUpperCase()}

              </div>

            )}

          </div>

          {/* INFO */}
          <div>

            <h1 className="text-4xl font-black">

              @
              {profile.username}

            </h1>

            <p className="text-zinc-500 mt-2">

              {profile.role}

            </p>

          </div>

        </div>

      </div>

      {/* VIDEOS */}
      <div className="snap-y snap-mandatory overflow-y-scroll h-[calc(100vh-140px)]">

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
const {
  count: followersCount,
} =
  await supabase

    .from(
      "followers"
    )

    .select(
      "*",
      {
        count:
          "exact",
        head:
          true,
      }
    )

    .eq(
      "following_id",
      profile.id
    );

const {
  count: followingCount,
} =
  await supabase

    .from(
      "followers"
    )

    .select(
      "*",
      {
        count:
          "exact",
        head:
          true,
      }
    )

    .eq(
      "follower_id",
      profile.id
    );
}