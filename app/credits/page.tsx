"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Script from "next/script";

const PAYPAL_CLIENT_ID = "AY6gT52rjGSyd8_Wy3TLx1_XuRWyc7VsDLVCNvyqSuHbfJ6cjRkzZUxznBwAKmXBPjNb1AZg2kvuOvtv";

export default function CreditsPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const buttonRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
      setCredits(data?.credits ?? 0);
    }
    load();

    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("success") === "1") {
      setSuccess(true);
    }
  }, []);

  function renderPayPal() {
    const paypal = (window as any).paypal;
    if (!paypal) { console.error("PayPal SDK not found"); return; }
    if (!buttonRef.current || rendered.current) return;
    rendered.current = true;

    paypal.Buttons({
      createOrder: (_: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            amount: { value: "2.00", currency_code: "USD" },
            description: "10 Credits",
          }],
        });
      },
      onApprove: async (_: any, actions: any) => {
        try {
          await actions.order.capture();
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/add-credits`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ amount: 10 }),
          });
          if (!res.ok) throw new Error("Failed to add credits");
          setSuccess(true);
          const { data } = await supabase.from("profiles").select("credits").eq("id", userId!).single();
          setCredits(data?.credits ?? 0);
        } catch (err: any) {
          setError("Plaćanje uspješno ali krediti nisu dodani. Kontaktirajte podršku.");
        }
      },
      onError: () => {
        setError("Plaćanje neuspješno. Pokušajte ponovo.");
      },
    }).render(buttonRef.current);
  }

  return (
    <>
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture`}
        onLoad={renderPayPal}
        onError={() => alert("PayPal SDK nije učitan. Provjeri konzolu.")}
      />
      <main className="min-h-screen bg-[#0D0D14] text-white flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-md bg-white/5 p-8 rounded-[2.5rem] border border-white/10 text-center">
          <h1 className="text-3xl font-black mb-2">KREDITI</h1>
          <p className="text-white/50 mb-8">Svaki import troši 1 kredit</p>

          {success && (
            <div className="bg-green-500/20 border border-green-500/40 rounded-2xl p-4 mb-6 text-green-400 font-bold">
              Uspješno! Krediti su dodani na tvoj račun.
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4 mb-6 text-red-400 text-sm">
              {error}
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

          <div ref={buttonRef} />

          <Link href="/" className="block mt-4 text-white/40 text-sm hover:text-white/60 transition">
            ← Nazad
          </Link>
        </div>
      </main>
    </>
  );
}
