import { supabase }
from "@/lib/supabase";

export default async function ProfilePage() {

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-3xl font-black">

        Login required

      </div>
    );

  }

  const username =
    user.email?.split(
      "@"
    )[0];

  // POSTS
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
        username
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  // FOLLOWERS
  const {
    data: followers,
  } =
    await supabase
      .from(
        "follows"
      )
      .select("*")
      .eq(
        "following_username",
        username
      );

  // FOLLOWING
  const {
    data: following,
  } =
    await supabase
      .from(
        "follows"
      )
      .select("*")
      .eq(
        "follower_username",
        username
      );

  // TOTAL LIKES
  const totalLikes =
    reactions?.reduce(
      (
        sum,
        post
      ) =>

        sum +
        (
          post.likes_count ||
          0
        ),

      0
    ) || 0;

  return (
    <main className="min-h-screen pb-24 bg-black text-white">

      {/* HEADER */}
      <div className="px-6 pt-16 pb-10">

        <div className="flex items-center gap-5">

          {/* AVATAR */}
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white text-5xl font-black border border-white/10 shadow-2xl">

            {username?.[0]?.toUpperCase()}

          </div>

          {/* INFO */}
          <div>

            <h1 className="text-4xl font-black">

              @
              {username}

            </h1>

            <p className="text-zinc-400 mt-2">

              Music Reaction Creator

            </p>

          </div>

        </div>

        {/* STATS */}
        <div className="grid grid-cols-4 gap-4 mt-10">

          {/* POSTS */}
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-5 text-center">

            <div className="text-3xl font-black">

              {
                reactions?.length ||
                0
              }

            </div>

            <div className="text-zinc-500 mt-2 text-sm">

              Posts

            </div>

          </div>

          {/* LIKES */}
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-5 text-center">

            <div className="text-3xl font-black">

              {totalLikes}

            </div>

            <div className="text-zinc-500 mt-2 text-sm">

              Likes

            </div>

          </div>

          {/* FOLLOWERS */}
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-5 text-center">

            <div className="text-3xl font-black">

              {
                followers?.length ||
                0
              }

            </div>

            <div className="text-zinc-500 mt-2 text-sm">

              Followers

            </div>

          </div>

          {/* FOLLOWING */}
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-5 text-center">

            <div className="text-3xl font-black">

              {
                following?.length ||
                0
              }

            </div>

            <div className="text-zinc-500 mt-2 text-sm">

              Following

            </div>

          </div>

        </div>

      </div>

      {/* POSTS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1">

        {reactions?.map(
          (
            reaction
          ) => (

            <img
  key={
    reaction.id
  }
  src={
    reaction.thumbnail_url ||
    reaction.video_url
  }
  alt="thumbnail"
  className="aspect-[9/16] object-cover bg-black w-full"
/>

          )
        )}

      </div>

    </main>
  );
}