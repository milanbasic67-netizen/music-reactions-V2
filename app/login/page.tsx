"use client";

import {
  useState,
} from "react";

import { supabase }
from "@/lib/supabase";

export default function LoginPage() {

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  async function signUp() {

    try {

      setLoading(true);

      const {
        error,
      } =
        await supabase.auth.signUp({
          email,

          password,
        });

      if (error) {
        throw error;
      }

      alert(
        "Account created!"
      );

    } catch (err) {

      console.log(err);

      alert(
        "Signup failed"
      );

    }

    setLoading(false);

  }

  async function signIn() {

    try {

      setLoading(true);

      const {
        error,
      } =
        await supabase.auth.signInWithPassword({
          email,

          password,
        });

      if (error) {
        throw error;
      }

      window.location.href =
        "/";

    } catch (err) {

      console.log(err);

      alert(
        "Login failed"
      );

    }

    setLoading(false);

  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">

      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-8">

        <h1 className="text-white text-5xl font-black text-center">

          Duet

        </h1>

        <p className="text-zinc-400 text-center mt-3">

          Music reaction platform

        </p>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
          className="mt-10 w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none"
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
          className="mt-4 w-full bg-zinc-900 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none"
        />

        {/* LOGIN */}
        <button
          onClick={
            signIn
          }
          disabled={
            loading
          }
          className="mt-8 w-full bg-red-600 hover:bg-red-500 transition text-white font-black text-xl py-5 rounded-2xl"
        >

          LOGIN

        </button>

        {/* SIGNUP */}
        <button
          onClick={
            signUp
          }
          disabled={
            loading
          }
          className="mt-4 w-full bg-white text-black font-black text-xl py-5 rounded-2xl"
        >

          CREATE ACCOUNT

        </button>

      </div>

    </div>
  );
}