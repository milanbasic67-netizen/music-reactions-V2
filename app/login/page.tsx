"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
// Ako imaš Lucide ikonice instalirane:
// import { Chrome } from "lucide-react"; 

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // --- GOOGLE SIGN IN ---
  async function signInWithGoogle() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Ovo šalje korisnika nazad na tvoj sajt nakon prijave
          redirectTo: `${window.location.origin}`, 
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.log(err);
      alert("Google login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert("Account created! Check your email.");
    } catch (err: any) {
      alert("Signup failed");
    }
    setLoading(false);
  }

  async function signIn() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/";
    } catch (err) {
      alert("Login failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-white text-5xl font-black text-center">Duet</h1>
        <p className="text-zinc-400 text-center mt-3 font-medium uppercase tracking-widest text-xs">
          Music reaction platform
        </p>

        {/* GOOGLE BUTTON - DODATO */}
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-10 w-full bg-white hover:bg-zinc-200 transition text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border-b-4 border-zinc-300 active:border-b-0 active:translate-y-1"
        >
          {/* Ako nemaš Lucide, možeš staviti običan tekst ili sliku */}
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          SIGN IN WITH GOOGLE
        </button>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-950 px-2 text-zinc-500 font-bold">Or use email</span>
          </div>
        </div>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-red-600 transition"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-red-600 transition"
        />

        <button
          onClick={signIn}
          disabled={loading}
          className="mt-8 w-full bg-red-600 hover:bg-red-500 transition text-white font-black text-xl py-5 rounded-2xl shadow-lg shadow-red-900/20"
        >
          LOGIN
        </button>

        <button
          onClick={signUp}
          disabled={loading}
          className="mt-4 w-full text-zinc-400 hover:text-white transition font-bold text-sm py-2"
        >
          CREATE NEW ACCOUNT
        </button>
      </div>
    </div>
  );
}