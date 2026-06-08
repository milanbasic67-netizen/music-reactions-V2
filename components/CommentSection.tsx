"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, Send, MessageSquare } from "lucide-react";

type Props = { reactionId: string; onClose: () => void; };

export default function CommentSection({ reactionId, onClose }: Props) {
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

    setLoading(true);
    const { error } = await supabase.from("comments").insert({
      reaction_id: reactionId,
      user_id: user.id,
      username: user.user_metadata.username || "user",
      content: text.trim()
    });

    if (!error) {
      setText("");
      fetchComments();
    }
    setLoading(false);
  }

  return (
    <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="mt-auto bg-zinc-950 rounded-t-[2.5rem] h-[70%] flex flex-col border-t border-zinc-800 shadow-2xl">
        
        {/* HEADER */}
        <div className="p-6 flex justify-between items-center border-b border-zinc-900">
          <span className="font-black text-xs uppercase tracking-widest text-zinc-400">
            {comments.length} Comments
          </span>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* COMMENTS LIST */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-700">
              <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
              <p className="font-bold text-xs uppercase tracking-tighter">Be the first to comment</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center font-black text-[10px]">
                  {c.username?.[0].toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">@{c.username}</span>
                  <p className="text-sm text-zinc-200 mt-1 leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* INPUT AREA */}
        <form onSubmit={handleSubmit} className="p-6 border-t border-zinc-900 bg-zinc-950 pb-10">
          <div className="relative flex items-center">
            <input 
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-red-600 transition"
            />
            <button 
              type="submit"
              disabled={loading}
              className="absolute right-3 p-2 bg-red-600 rounded-xl text-white hover:bg-red-500 disabled:opacity-50 transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}