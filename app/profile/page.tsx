"use client";

import { useEffect, useState } from "react";

import { getProfile }
from "@/lib/getProfile";

import FollowButton
from "@/components/FollowButton";

export default function UserPage() {

  const [profile, setProfile] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    async function loadProfile() {

      const p =
        await getProfile();

      setProfile(p);

      setLoading(false);

    }

    loadProfile();

  }, []);

  if (loading) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center">

        Loading...

      </main>

    );

  }

  if (!profile) {

    return (

      <main className="min-h-screen bg-black text-white flex items-center justify-center">

        Login required

      </main>

    );

  }

  return (

    <main className="min-h-screen bg-black text-white">

      <div className="p-6 border-b border-zinc-900">

        <div className="flex items-center gap-5">

          <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-900">

            {profile.avatar_url ? (

              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />

            ) : (

              <div className="w-full h-full flex items-center justify-center text-3xl font-black">

                {profile.username?.[0]?.toUpperCase()}

              </div>

            )}

          </div>

          <div>

            <h1 className="text-2xl font-black">

              @{profile.username}

            </h1>

            <div className="flex gap-6 mt-3 text-sm">

              <div>

                <span className="font-black">

                  0

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

                  Followers

                </span>

              </div>

              <div>

                <span className="font-black">

                  0

                </span>

                <span className="text-zinc-500 ml-1">

                  Following

                </span>

              </div>

            </div>

            <div className="mt-4">

              <FollowButton
                profileId={profile.id}
              />

            </div>

          </div>

        </div>

      </div>

      <div className="flex items-center justify-center h-[60vh] text-zinc-500">

        Profile ready

      </div>

    </main>

  );

}