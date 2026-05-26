import { supabase }
from "@/lib/supabase";

export default async function NotificationsPage() {

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  const username =
    user?.email?.split(
      "@"
    )[0];

  const {
    data: notifications,
  } =
    await supabase
      .from(
        "notifications"
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

  return (
    <main className="min-h-screen pb-24 bg-black text-white p-5">

      <div className="max-w-3xl mx-auto">

        <h1 className="text-5xl font-black">

          Notifications

        </h1>

        <div className="mt-10 space-y-4">

          {notifications?.map(
            (
              notification
            ) => (

              <div
                key={
                  notification.id
                }
                className="bg-zinc-950 border border-white/10 rounded-3xl p-5"
              >

                <div className="text-white text-lg font-bold">

                  @
                  {
                    notification.actor
                  }

                  {" "}

                  {notification.type ===
                  "like" &&
                    "liked your reaction"}

                  {notification.type ===
                  "follow" &&
                    "followed you"}

                  {notification.type ===
                  "comment" &&
                    "commented on your reaction"}

                </div>

                <div className="text-zinc-500 mt-2 text-sm">

                  {
                    new Date(
                      notification.created_at
                    ).toLocaleString()
                  }

                </div>

              </div>

            )
          )}

        </div>

      </div>

    </main>
  );
}