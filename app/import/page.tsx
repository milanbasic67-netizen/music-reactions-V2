"use client";

import {
  useState,
} from "react";

export default function ImportPage() {

  const [url, setUrl] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function importVideo() {

    try {

      setLoading(
        true
      );

      const response =
        await fetch(

          "http://localhost:5000/import-youtube",

          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                url,
              }),
          }
        );

      const data =
        await response.json();

      console.log(
        data
      );

      alert(
        "Imported!"
      );

      window.location.href =
        "/songs";

    } catch (err) {

      console.log(
        err
      );

      alert(
        "Import failed"
      );

    }

    setLoading(
      false
    );

  }

  return (
    <main className="min-h-screen bg-[#0D0D14] text-white flex items-center justify-center p-5">

      <div className="w-full max-w-2xl">

        <h1 className="text-5xl font-black">

          Import YouTube

        </h1>

        <p className="text-slate-400 mt-4">

          Paste a YouTube link to create a reaction song

        </p>

        <input
          value={url}
          onChange={(e) =>
            setUrl(
              e.target.value
            )
          }
          placeholder="https://youtube.com/..."
          className="w-full mt-8 bg-white/5 border border-white/8 rounded-3xl px-6 py-5 text-white text-xl outline-none focus:border-violet-500 transition"
        />

        <button
          onClick={
            importVideo
          }
          disabled={
            loading
          }
          className="w-full mt-6 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition rounded-3xl py-5 text-white text-xl font-black"
        >

          {loading
            ? "Importing..."
            : "Import Video"}

        </button>

      </div>

    </main>
  );
}