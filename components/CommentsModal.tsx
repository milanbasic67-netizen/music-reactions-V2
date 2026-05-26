"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase }
from "@/lib/supabase";

type Props = {
  reactionId: number;

  open: boolean;

  onClose: () => void;
};

export default function CommentsModal({
  reactionId,
  open,
  onClose,
}: Props) {

  const [comments, setComments] =
    useState<any[]>([]);

  const [text, setText] =
    useState("");

  async function loadComments() {

    const {
      data,
    } =
      await supabase
        .from(
          "comments"
        )
        .select("*")
        .eq(
          "reaction_id",
          reactionId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    setComments(
      data || []
    );

  }

  useEffect(() => {

    if (open) {

      loadComments();

    }

  }, [open]);

  async function addComment() {

    if (!text) return;

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    await supabase
      .from(
        "comments"
      )
      .insert({

        reaction_id:
          reactionId,

        username:
          user?.email?.split(
            "@"
          )[0] || "user",

        text,

      });

    setText("");

    loadComments();

  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end">

      <div className="w-full h-[70vh] bg-zinc-950 rounded-t-3xl border-t border-white/10 p-5 overflow-y-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">

          <h2 className="text-white text-2xl font-black">

            Comments

          </h2>

          <button
            onClick={
              onClose
            }
            className="text-white text-xl"
          >

            ✕

          </button>

        </div>

        {/* COMMENTS */}
        <div className="space-y-5 pb-32">

          {comments.map(
            (
              comment
            ) => (

              <div
                key={
                  comment.id
                }
              >

                <div className="text-white font-bold">

                  @
                  {
                    comment.username
                  }

                </div>

                <div className="text-zinc-300 mt-1">

                  {
                    comment.text
                  }

                </div>

              </div>

            )
          )}

        </div>

        {/* INPUT */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-white/10 p-4 flex gap-3">

          <input
            value={text}
            onChange={(e) =>
              setText(
                e.target.value
              )
            }
            placeholder="Add comment..."
            className="flex-1 bg-zinc-900 rounded-2xl px-5 py-4 text-white outline-none"
          />

          <button
            onClick={
              addComment
            }
            className="bg-red-600 px-6 rounded-2xl text-white font-bold"
          >

            Send

          </button>

        </div>

      </div>

    </div>
  );
}