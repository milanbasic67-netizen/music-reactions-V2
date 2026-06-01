import { supabase }
from "@/lib/supabase";

import VideoCard
from "@/components/VideoCard";

import FollowButton
from "@/components/FollowButton";


export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

{

  // PROFILE
  const {
  data: {
    user,
  },
} =
  await supabase.auth.getUser();

if (!user) {

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">

      Login required

    </main>
  );

}

const {
  data: profile,
} =
  await supabase

    .from("profiles")

    .select("*")

    .eq("id", user.id)

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
        
      )

      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  // FOLLOWERS COUNT
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
        profile?.id
      );

  // FOLLOWING COUNT
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
        profile?.id
      );
console.log(
  "PROFILE:",
  profile
);

console.log(
  "PARAMS:",
  params
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
          <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-900">

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

           

  {/* USERNAME */}
<h1 className="text-2xl font-black">

  @{profile.username}

</h1>

<div className="flex gap-6 mt-2 text-sm">

  <div>

    <span className="font-black">
      {reactions?.length || 0}
    </span>

    <span className="text-zinc-500 ml-1">
      Duets
    </span>

  </div>

  <div>

    <span className="font-black">
      0
    </span>

    <span className="text-zinc-500 ml-1">
      Likes
    </span>

  </div>



  <div>

    <span className="font-black text-white">

      0

    </span>

    <span className="text-zinc-500 ml-1">

      Likes

    </span>

  </div>

</div>

            <h1 className="text-2xl font-black">

  @{profile.username}

            </h1>

            

            {/* FOLLOW STATS */}
            <div className="flex gap-6 mt-4 text-sm text-zinc-400">

              <div>

                <span className="font-black text-white">

                  {followersCount || 0}

                </span>

                {" "}
                followers

              </div>

              <div>

                <span className="font-black text-white">

                  {followingCount || 0}

                </span>

                {" "}
                following

              </div>

            </div>

            {/* FOLLOW BUTTON */}
            <FollowButton
              profileId={
                profile.id
              }
            />

          </div>

        </div>

      </div>

      {/* EMPTY */}
      {(!reactions ||
        reactions.length === 0) && (

        <div className="flex items-center justify-center h-[60vh] text-zinc-500 text-xl">

          No reactions yet

        </div>

      )}

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

}