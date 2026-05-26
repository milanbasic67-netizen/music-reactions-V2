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
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-5">

      <div className="w-full max-w-2xl">

        <h1 className="text-5xl font-black">

          Import YouTube

        </h1>

        <p className="text-zinc-400 mt-4">

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
          className="w-full mt-8 bg-zinc-900 border border-white/10 rounded-3xl px-6 py-5 text-white text-xl outline-none"
        />

        <button
          onClick={
            importVideo
          }
          disabled={
            loading
          }
          className="w-full mt-6 bg-red-600 hover:bg-red-500 disabled:opacity-50 transition rounded-3xl py-5 text-white text-xl font-black"
        >

          {loading
            ? "Importing..."
            : "Import Video"}

        </button>

      </div>

    </main>
  );
}