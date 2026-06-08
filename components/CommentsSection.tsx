"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, Send } from "lucide-react";

type Props = {
  reactionId: number;
  onClose: () => void;
};

export default function CommentSection({ reactionId, onClose }: Props) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState<any>(null);

  // 1. Učitaj korisnika i komentare
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("reaction_id", reactionId)
        .order("created_at", { ascending: false });

      if (data) setComments(data);
    }
    load();
  }, [reactionId]);

  // 2. Slanje komentara
  async function postComment() {
    if (!newComment.trim() || !user) return;

    // Dobijamo profil da bismo imali username
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    const { data, error } = await supabase.from("comments").insert({
      reaction_id: reactionId,
      text: newComment,
      username: profile?.username || "anonymous",
    }).select().single();

    if (data) {
      setComments([data, ...comments]);
      setNewComment("");
    }
  }

  return (
    <div className="absolute inset-0 z-[100] flex flex-col justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-zinc-900 w-full h-[70%] rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* HEADER */}
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
          <span className="text-white font-bold text-sm">Komentari ({comments.length})</span>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* LISTA KOMENTARA */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {comments.map((c) => (
            <div key={c.id} className="flex flex-col">
              <span className="text-zinc-500 text-xs font-bold">@{c.username}</span>
              <p className="text-white text-sm mt-1">{c.text}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <div className="text-center text-zinc-600 mt-10 text-sm italic">
              Još uvek nema komentara. Budi prvi!
            </div>
          )}
        </div>

        {/* INPUT */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900 pb-10">
          <div className="flex items-center gap-2 bg-zinc-800 rounded-full px-4 py-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Napiši komentar..."
              className="bg-transparent flex-1 text-white text-sm outline-none"
            />
            <button onClick={postComment} className="text-red-500">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {/* Click outside to close */}
      <div className="absolute top-0 left-0 w-full h-[30%]" onClick={onClose} />
    </div>
  );
}