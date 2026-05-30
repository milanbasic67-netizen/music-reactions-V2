"use client";

import {

  useEffect,

  useRef,

  useState,

} from "react";

import { supabase }
from "@/lib/supabase";

import { getProfile }
from "@/lib/getProfile";

type Props = {

  originalVideo: string;

  title: string;

  artist: string;

};

export default function DuetRecorder({

  originalVideo,

  title,

  artist,

}: Props) {

  const cameraRef =
    useRef<HTMLVideoElement>(
      null
    );

  const mediaRecorderRef =
    useRef<any>(
      null
    );

  const chunksRef =
    useRef<Blob[]>([]);
const startTimeRef =
  useRef(0);

  const [stream,
    setStream] =
    useState<MediaStream | null>(
      null
    );

  const [recording,
    setRecording] =
    useState(false);

  const [loading,
    setLoading] =
    useState(false);

  // CAMERA
  useEffect(() => {

    async function setup() {

      try {

        const media =
  await navigator.mediaDevices.getUserMedia({

    video: true,

    audio: {

      echoCancellation: true,

      noiseSuppression: true,

      autoGainControl: true,

    },

  });

        setStream(
          media
        );

        if (
          cameraRef.current
        ) {

          cameraRef.current.srcObject =
            media;

        }

      } catch (err) {

        console.log(
          err
        );

        alert(
          "Camera error"
        );

      }

    }

    setup();

  }, []);

  // START RECORDING
  async function startRecording() {

    try {

      if (!stream)
        return;

      // RESET CHUNKS
      chunksRef.current =
        [];

      // SONG VIDEO
      const songVideo =
        document.getElementById(
          "song-video"
        ) as HTMLVideoElement;

      // START SONG FROM BEGINNING
      if (songVideo) {

        songVideo.currentTime =
          0;

        await songVideo.play();

      }

      // RECORDER
      const recorder =
        new MediaRecorder(

          stream,

          {

            mimeType:
        "video/webm;codecs=vp8,opus",

      audioBitsPerSecond:
        128000,

      videoBitsPerSecond:
        2500000,

          }

        );

      mediaRecorderRef.current =
        recorder;

      recorder.ondataavailable =
        (
          e
        ) => {

          if (
            e.data.size > 0
          ) {

            chunksRef.current.push(
              e.data
            );

          }

        };

startTimeRef.current =
  Date.now();

      recorder.start();

      setRecording(
        true
      );

      console.log(
        "RECORDING"
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
  async function stopRecording() {

    try {

      if (
        !mediaRecorderRef.current
      ) {

        return;

      }

      setLoading(
        true
      );

      // PAUSE SONG
      const songVideo =
        document.getElementById(
          "song-video"
        ) as HTMLVideoElement;

      if (songVideo) {

        songVideo.pause();

      }

      // STOP CAMERA RECORDING
      mediaRecorderRef.current.stop();

      setRecording(
        false
      );

      setTimeout(

        async () => {

          try {

            // REACTION BLOB
            const reactionBlob =
              new Blob(

                chunksRef.current,

                {

                  type:
                    "video/webm",

                }

              );

            // REACTION FILE
            const reactionFile =
              new File(

                [reactionBlob],

                `reaction-${Date.now()}.webm`,

                {

                  type:
                    "video/webm",

                }

              );
const durationSeconds =

  (
    Date.now() -
    startTimeRef.current
  ) / 1000;

console.log(
  "DURATION",
  durationSeconds
);            

// FORM DATA
            const formData =
              new FormData();

            // ORIGINAL VIDEO URL
            formData.append(

              "originalUrl",

              originalVideo

            );

formData.append(

  "duration",

  String(
    durationSeconds
  )

);

            // REACTION FILE
            formData.append(

              "reaction",

              reactionFile

            );

            // RENDER
            const renderRes =
              await fetch(

`${process.env.NEXT_PUBLIC_API_URL}/render-duet`,

                {

                  method:
                    "POST",

                  body:
                    formData,

                }

              );

console.log(
  "SEND DURATION:",
  durationSeconds
);

for (
  const pair of formData.entries()
) {

  console.log(
    pair[0],
    pair[1]
  );

}

            const renderData =
              await renderRes.json();
if (
  !renderData.videoUrl
) {

  alert(
    "Render failed"
  );

  return;

}

 const {
  data: {
    user,
  },
} =
  await supabase
    .auth
    .getUser();

if (!user) {

  alert(
    "Login required"
  );

  return;

}

const profile =
  await getProfile();
            // DOWNLOAD FINAL VIDEO
            

            // INSERT REACTION
            const {
              error:
                insertError,
            } =
              await supabase
                .from(
                  "reactions"
                )
                .insert({

                  song:
                    title,

                  artist,

                  user_id:
                    user.id,

                  username:
                    profile?.username,

                  video_url:
                    renderData.videoUrl,

                });

            if (
              insertError
            ) {

              console.log(
                insertError
              );

              alert(

                JSON.stringify(
                  insertError
                )

              );

              return;

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
              "Upload failed"
            );

          }

          setLoading(
            false
          );

        },

        1000

      );

    } catch (err) {

      console.log(
        err
      );

    }

  }

  return (

    <div className="p-4">

      {/* CAMERA */}
      <div className="rounded-2xl overflow-hidden bg-black mb-4 h-[160px] max-w-[110px] mx-auto border border-zinc-800 shadow-2xl">

        <video

          ref={cameraRef}

          autoPlay

          muted

          playsInline

          className="w-full h-full object-cover"

        />

      </div>

      {/* START BUTTON */}
      {!recording && !loading && (

        <button

          onClick={
            startRecording
          }

          className="w-full bg-red-600 hover:bg-red-500 transition py-3 rounded-2xl font-black text-lg"

        >

          Start Recording

        </button>

      )}

      {/* STOP BUTTON */}
      {recording && (

        <button

          onClick={
            stopRecording
          }

          className="w-full bg-zinc-800 hover:bg-zinc-700 transition py-3 rounded-2xl font-black text-lg"

        >

          Stop Recording

        </button>

      )}

      {/* LOADING */}
      {loading && (

        <div className="text-center text-zinc-400 font-black mt-4">

          Rendering duet...

        </div>

      )}

    </div>

  );

}