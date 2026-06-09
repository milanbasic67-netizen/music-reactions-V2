"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, Send, MessageSquare } from "lucide-react";
import { getProfile } from "@/lib/getProfile";

type Props = { reactionId: string; onClose: () => void; onCommentAdded?: () => void; };

export default function CommentSection({ reactionId, onClose, onCommentAdded }: Props) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [reactionId]);

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("reaction_id", reactionId)
      .order("created_at", { ascending: false });
    setComments(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Please log in to comment");

    const profile = await getProfile();
    if (!profile?.username) return alert("Please complete your profile setup first.");

    setLoading(true);
    const { error } = await supabase.from("comments").insert({
      reaction_id: reactionId,
      username: profile.username,
      text: text.trim()
    });

    if (error) {
      alert("Failed to post comment. Please try again.");
    } else {
      setText("");
      fetchComments();
      onCommentAdded?.();
      const { data: owner } = await supabase.from("reactions").select("username").eq("id", reactionId).single();
      if (owner?.username && owner.username !== profile.username) {
        await supabase.from("notifications").insert({
          username: owner.username,
          actor: profile.username,
          type: "comment",
          reaction_id: Number(reactionId),
          read: false,
        });
      }
    }
    setLoading(false);
  }

  return (
    <div className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="mt-auto bg-[#0F0F1A] rounded-t-[2.5rem] h-[70%] flex flex-col border-t border-white/8 shadow-2xl">
        
        {/* HEADER */}
        <div className="p-6 flex justify-between items-center border-b border-white/5">
          <span className="font-black text-xs uppercase tracking-widest text-slate-400">
            {comments.length} Comments
          </span>
          <button onClick={onClose} className="p-2 hover:bg-white/8 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* COMMENTS LIST */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-700">
              <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
              <p className="font-bold text-xs uppercase tracking-tighter">Be the first to comment</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center font-black text-[10px]">
                  {c.username?.[0].toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">@{c.username}</span>
                  <p className="text-sm text-slate-200 mt-1 leading-relaxed">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* INPUT AREA */}
        <form onSubmit={handleSubmit} className="p-6 border-t border-white/5 bg-[#0F0F1A] pb-10">
          <div className="relative flex items-center">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment..."
              className="w-full bg-white/5 border border-white/8 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-violet-500 transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-3 p-2 bg-violet-600 rounded-xl text-white hover:bg-violet-500 disabled:opacity-50 transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}