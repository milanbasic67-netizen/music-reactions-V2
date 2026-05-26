"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase }
from "@/lib/supabase";

type Props = {
  originalVideo: string;
  title?: string;
  artist?: string;
};

export default function DuetRecorder({

  originalVideo,

  title,

  artist,

}: Props) {

  const originalVideoRef =
    useRef<HTMLVideoElement>(
      null
    );

  const reactionVideoRef =
    useRef<HTMLVideoElement>(
      null
    );

  const mediaRecorderRef =
    useRef<any>(null);

  const recordedChunksRef =
    useRef<Blob[]>([]);

  const streamRef =
    useRef<MediaStream | null>(
      null
    );

  const [recording, setRecording] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [cameraReady, setCameraReady] =
    useState(false);

  const [previewUrl, setPreviewUrl] =
    useState("");

  // CAMERA
  useEffect(() => {

    async function setupCamera() {

      try {

        const stream =
          await navigator.mediaDevices.getUserMedia({

            video: true,

            audio: true,

          });

        streamRef.current =
          stream;

        if (
          reactionVideoRef.current
        ) {

          reactionVideoRef.current.srcObject =
            stream;

        }

        setCameraReady(
          true
        );

      } catch (err) {

        console.log(
          err
        );

        alert(
          "Camera access denied"
        );

      }

    }

    setupCamera();

    return () => {

      streamRef.current
        ?.getTracks()
        .forEach(
          (
            track
          ) => {

            track.stop();

          }
        );

    };

  }, []);

  // START RECORDING
  async function startRecording() {

    try {

      if (
        !streamRef.current
      ) {

        alert(
          "Camera not ready"
        );

        return;

      }

      setPreviewUrl("");

      recordedChunksRef.current =
        [];

      // PLAY SONG
      if (
        originalVideoRef.current
      ) {

        originalVideoRef.current.currentTime =
          0;

        originalVideoRef.current.play();

      }

      // RECORD CAMERA
      const recorder =
        new MediaRecorder(

          streamRef.current,

          {
            mimeType:
              "video/webm",
          }
        );

      mediaRecorderRef.current =
        recorder;

      recorder.ondataavailable =
        (
          event
        ) => {

          if (
            event.data.size > 0
          ) {

            recordedChunksRef.current.push(
              event.data
            );

          }

        };

      recorder.onstop =
        async () => {

          const blob =
            new Blob(

              recordedChunksRef.current,

              {
                type:
                  "video/webm",
              }
            );

          const preview =
            URL.createObjectURL(
              blob
            );

          setPreviewUrl(
            preview
          );

          await uploadAndRender(
            blob
          );

        };

      recorder.start();

      setRecording(
        true
      );

    } catch (err) {

      console.log(
        err
      );

      alert(
        "Recording failed"
      );

    }

  }

  // STOP RECORDING
  function stopRecording() {

    if (
      mediaRecorderRef.current &&
      recording
    ) {

      mediaRecorderRef.current.stop();

      if (
        originalVideoRef.current
      ) {

        originalVideoRef.current.pause();

      }

      setRecording(
        false
      );

    }

  }

  // UPLOAD + RENDER
  async function uploadAndRender(
    reactionBlob: Blob
  ) {

    try {

      setLoading(
        true
      );

      // DOWNLOAD ORIGINAL
      const originalResponse =
        await fetch(
          originalVideo
        );

      const originalBlob =
        await originalResponse.blob();

      const formData =
        new FormData();

      formData.append(

        "original",

        originalBlob,

        "original.mp4"
      );

      formData.append(

        "reaction",

        reactionBlob,

        "reaction.webm"
      );

      // RENDER
      const renderResponse =
        await fetch(

          "thriving-alignment-production.up.railway.app/render-duet",

          {
            method:
              "POST",

            body:
              formData,
          }
        );

      const renderData =
        await renderResponse.json();

      console.log(
        renderData
      );

      if (
        !renderData.videoUrl
      ) {

        alert(
          "Render failed"
        );

        setLoading(
          false
        );

        return;

      }

      // DOWNLOAD RENDERED VIDEO
      const renderedVideoResponse =
        await fetch(
          renderData.videoUrl
        );

      const renderedVideoBlob =
        await renderedVideoResponse.blob();

      const fileName =
        `${Date.now()}.mp4`;

      // UPLOAD TO SUPABASE
      const {
        data:
          uploadData,

        error:
          uploadError,

      } =
        await supabase
          .storage
          .from(
            "videos"
          )
          .upload(

            fileName,

            renderedVideoBlob,

            {
              cacheControl:
                "3600",

              upsert:
                false,

              contentType:
                "video/mp4",
            }
          );

      if (
        uploadError
      ) {

        console.log(
          uploadError
        );

        alert(
          "Upload failed"
        );

        setLoading(
          false
        );

        return;

      }

      // PUBLIC URL
      const {
        data:
          publicData,
      } =
        supabase
          .storage
          .from(
            "videos"
          )
          .getPublicUrl(
            fileName
          );

      // USER
      const {
        data: { user },
      } =
        await supabase
          .auth
          .getUser();

      const username =
        user?.email?.split(
          "@"
        )[0];

      // SAVE REACTION
      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "reactions"
          )
          .insert({

            username,

            song:
              title ||
              "Unknown Song",

            artist:
              artist ||
              "Unknown Artist",

            video_url:
              publicData.publicUrl,

            likes_count:
              0,

            comments_count:
              0,

          });

      if (
        insertError
      ) {

        console.log(
          insertError
        );

      }

      alert(
        "Reaction uploaded!"
      );

      window.location.href =
        "/";

    } catch (err) {

      console.log(
        err
      );

      alert(
        "Render failed"
      );

    }

    setLoading(
      false
    );

  }

  return (
    <main className="min-h-screen bg-black text-white p-5 pb-32">

      {/* HEADER */}
      <div className="mb-8">

        <h1 className="text-4xl font-black">

          Record Reaction

        </h1>

        <p className="text-zinc-400 mt-3 text-lg">

          {title}

        </p>

        <p className="text-zinc-600 text-sm mt-1">

          {artist}

        </p>

      </div>

      {/* VIDEOS */}
      <div className="grid grid-cols-2 gap-4">

        {/* ORIGINAL */}
        <div>

          <div className="text-sm font-bold mb-3 text-zinc-400">

            Original

          </div>

          <video
            ref={
              originalVideoRef
            }
            src={
              originalVideo
            }
            controls
            playsInline
            className="w-full aspect-[9/16] rounded-3xl object-cover bg-zinc-950"
          />

        </div>

        {/* CAMERA */}
        <div>

          <div className="text-sm font-bold mb-3 text-zinc-400">

            Your Reaction

          </div>

          <video
            ref={
              reactionVideoRef
            }
            autoPlay
            muted
            playsInline
            className="w-full aspect-[9/16] rounded-3xl object-cover bg-zinc-950"
          />

        </div>

      </div>

      {/* CONTROLS */}
      <div className="mt-8">

        {!recording ? (

          <button
            onClick={
              startRecording
            }
            disabled={
              !cameraReady ||
              loading
            }
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 transition text-white font-black py-5 rounded-3xl text-xl"
          >

            {loading
              ? "Processing..."
              : "Start Recording"}

          </button>

        ) : (

          <button
            onClick={
              stopRecording
            }
            className="w-full bg-zinc-800 hover:bg-zinc-700 transition text-white font-black py-5 rounded-3xl text-xl"
          >

            Stop Recording

          </button>

        )}

      </div>

      {/* PREVIEW */}
      {previewUrl && (

        <div className="mt-10">

          <h2 className="text-2xl font-black mb-5">

            Preview

          </h2>

          <video
            src={
              previewUrl
            }
            controls
            className="w-full rounded-3xl"
          />

        </div>

      )}

    </main>
  );
}