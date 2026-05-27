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
    useRef<MediaRecorder | null>(
      null
    );

  const streamRef =
    useRef<MediaStream | null>(
      null
    );

  const chunksRef =
    useRef<Blob[]>([]);

  const [cameraReady,
    setCameraReady] =
    useState(false);

  const [recording,
    setRecording] =
    useState(false);

  const [loading,
    setLoading] =
    useState(false);

  const [previewUrl,
    setPreviewUrl] =
    useState("");

  // CAMERA
  useEffect(() => {

    async function initCamera() {

      try {

        console.log(
          "REQUEST CAMERA"
        );

        // FORCE CAMERA ACCESS
        const stream =
          await navigator
            .mediaDevices
            .getUserMedia({

              video: {

                width: 1280,

                height: 720,

              },

              audio: false,

            });

        console.log(
          "CAMERA OK"
        );

        streamRef.current =
          stream;

        if (
          reactionVideoRef.current
        ) {

          reactionVideoRef.current.srcObject =
            stream;

          reactionVideoRef.current.muted =
            true;

          reactionVideoRef.current.autoplay =
            true;

          reactionVideoRef.current.playsInline =
            true;

          await reactionVideoRef.current.play();

        }

        setCameraReady(
          true
        );

      } catch (err) {

        console.log(
          "CAMERA ERROR",
          err
        );

        alert(
          "Camera access denied"
        );

      }

    }

    initCamera();

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

      chunksRef.current =
        [];

      setPreviewUrl(
        ""
      );

      // PLAY ORIGINAL
      if (
        originalVideoRef.current
      ) {

        originalVideoRef.current.currentTime =
          0;

        await originalVideoRef.current.play();

      }

      // RECORDER
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

            chunksRef.current.push(
              event.data
            );

          }

        };

      recorder.onstop =
        async () => {

          try {

            const blob =
              new Blob(

                chunksRef.current,

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

            await renderDuet(
              blob
            );

          } catch (err) {

            console.log(
              err
            );

          }

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

    try {

      if (
        mediaRecorderRef.current &&
        recording
      ) {

        mediaRecorderRef.current.stop();

      }

      if (
        originalVideoRef.current
      ) {

        originalVideoRef.current.pause();

      }

      setRecording(
        false
      );

    } catch (err) {

      console.log(
        err
      );

    }

  }

  // RENDER
  async function renderDuet(
    reactionBlob: Blob
  ) {

    try {

      setLoading(
        true
      );

      // FETCH ORIGINAL
      

      // FORM DATA
      const formData =
        new FormData();

      formData.append(

        "originalUrl",

        originalVideo

      );

      formData.append(

        "reaction",

        reactionBlob,

        "reaction.webm"

      );

      // RENDER API
      const response =
        await fetch(

          "https://music-reactions-v2-production.up.railway.app//render-duet",

          {

            method:
              "POST",

            body:
              formData,

          }

        );

      const data =
        await response.json();

      console.log(
        data
      );

      if (
        !data.videoUrl
      ) {

        alert(
          "Render failed"
        );

        setLoading(
          false
        );

        return;

      }

      // DOWNLOAD VIDEO
      const renderedResponse =
        await fetch(
          data.videoUrl
        );

      const renderedBlob =
        await renderedResponse.blob();

      // FILE
      const fileName =
        `${Date.now()}.mp4`;

      // UPLOAD
      const {
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

            renderedBlob,

            {

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
        data: {
          user,
        },
      } =
        await supabase
          .auth
          .getUser();

      // SAVE DB
      await supabase
        .from(
          "reactions"
        )
        .insert({

          username:
            user?.email?.split(
              "@"
            )[0],

          song:
            title ||
            "Unknown",

          artist:
            artist ||
            "Unknown",

          video_url:
            publicData.publicUrl,

          likes_count:
            0,

          comments_count:
            0,

        });

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

        <p className="text-zinc-400 mt-3">

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

          <div className="text-sm mb-3 text-zinc-500">

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
            className="w-full aspect-[9/16] object-cover rounded-3xl bg-zinc-900"
          />

        </div>

        {/* REACTION */}
        <div>

          <div className="text-sm mb-3 text-zinc-500">

            Reaction

          </div>

          <video
            ref={
              reactionVideoRef
            }
            autoPlay
            muted
            playsInline
            className="w-full aspect-[9/16] object-cover rounded-3xl bg-zinc-900"
          />

        </div>

      </div>

      {/* BUTTONS */}
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
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 transition py-5 rounded-3xl text-xl font-black"
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
            className="w-full bg-zinc-800 hover:bg-zinc-700 transition py-5 rounded-3xl text-xl font-black"
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