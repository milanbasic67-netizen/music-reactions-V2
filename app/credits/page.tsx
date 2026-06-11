"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Script from "next/script";

const PADDLE_CLIENT_TOKEN = "test_b25e55650f4d0b9e4def38d1614";
const PRICE_ID = "pri_01kttvp8fkajnnvmmvvs6ksgjj";

export default function CreditsPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [paddleReady, setPaddleReady] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
      setCredits(data?.credits ?? 0);
    }
    load();
  }, []);

  function initPaddle() {
    const Paddle = (window as any).Paddle;
    if (!Paddle) return;
    Paddle.Environment.set("sandbox");
    Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
    setPaddleReady(true);
  }

  async function buyCredits() {
    if (!userId) return;
    setLoading(true);
    try {
      const Paddle = (window as any).Paddle;
      if (!Paddle) throw new Error("Paddle nije učitan, osvježi stranicu");
      Paddle.Checkout.open({
        items: [{ priceId: PRICE_ID, quantity: 1 }],
        customData: { user_id: userId },
        settings: {
          successUrl: `${window.location.origin}/credits?success=1`,
        },
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const success = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("success") === "1";

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        onLoad={initPaddle}
      />
      <main className="min-h-screen bg-[#0D0D14] text-white flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-md bg-white/5 p-8 rounded-[2.5rem] border border-white/10 text-center">
          <h1 className="text-3xl font-black mb-2">KREDITI</h1>
          <p className="text-white/50 mb-8">Svaki import ili reakcija troši 1 kredit</p>
          {success && (
            <div className="bg-green-500/20 border border-green-500/40 rounded-2xl p-4 mb-6 text-green-400 font-bold">
              Uspješno! Krediti su dodani na tvoj račun.
            </div>
          )}
          <div className="bg-violet-600/20 border border-violet-500/30 rounded-2xl p-6 mb-8">
            <p className="text-white/60 text-sm mb-1">Tvoji krediti</p>
            <p className="text-5xl font-black text-violet-400">{credits === null ? "..." : credits}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-5 mb-6 text-left">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">10 kredita</p>
                <p className="text-white/50 text-sm">Import + reakcije</p>
              </div>
              <p className="text-violet-400 font-black text-xl">$2</p>
            </div>
          </div>
          <button
            onClick={buyCredits}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 py-5 rounded-2xl font-black text-xl active:scale-95 transition"
          >
            {loading ? "UČITAVANJE..." : "KUPI 10 KREDITA — $2"}
          </button>
          <Link href="/" className="block mt-4 text-white/40 text-sm hover:text-white/60 transition">
            ← Nazad
          </Link>
        </div>
      </main>
    </>
  );
}
