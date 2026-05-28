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

  youtubeUrl: string;

  title: string;

  artist: string;

};

export default function DuetRecorder({

  youtubeUrl,

  title,

  artist,

}: Props) {

  const videoRef =
    useRef<HTMLVideoElement>(
      null
    );

  const mediaRecorderRef =
    useRef<any>(
      null
    );

  const chunksRef =
    useRef<Blob[]>([]);

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
          await navigator
            .mediaDevices
            .getUserMedia({

              video: true,

              audio: true,

            });

        setStream(
          media
        );

        if (
          videoRef.current
        ) {

          videoRef.current.srcObject =
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

  // START
  function startRecording() {

    if (!stream) return;

    chunksRef.current =
      [];

    const recorder =
      new MediaRecorder(
        stream,
        {

          mimeType:
            "video/webm",

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

    recorder.start();

    setRecording(
      true
    );

    console.log(
      "RECORDING"
    );

  }

  // STOP
  async function stopRecording() {

    if (
      !mediaRecorderRef.current
    ) return;

    setLoading(
      true
    );

    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop =
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

          console.log(
            blob
          );

          const file =
            new File(

              [blob],

              `reaction-${Date.now()}.webm`,

              {

                type:
                  "video/webm",

              }

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

          if (!user) {

            alert(
              "Login required"
            );

            setLoading(
              false
            );

            return;

          }

          // PROFILE
          const profile =
            await getProfile();

          // FILE NAME
          const fileName =

            `${Date.now()}-${file.name}`;

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

                file,

                {

                  contentType:
                    "video/webm",

                }

              );

          if (
            uploadError
          ) {

            console.log(
              uploadError
            );

            alert(
              uploadError.message
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

          // INSERT
          const {
            error:
              insertError,
          } =
            await supabase
              .from(
                "reactions"
              )
              .insert({

                username:
                  profile?.username,

                user_id:
                  user.id,

                song:
                  title,

                artist,

                youtube_url:
                  youtubeUrl,

                video_url:
                  publicData.publicUrl,

              });

          if (
            insertError
          ) {

            console.log(
              insertError
            );

            alert(
              insertError.message
            );

            setLoading(
              false
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

        setRecording(
          false
        );

      };

  }

  return (

    <div className="p-5">

      {/* CAMERA */}
      <div className="rounded-3xl overflow-hidden bg-black mb-5 aspect-[9/16]">

        <video

          ref={videoRef}

          autoPlay

          muted

          playsInline

          className="w-full h-full object-cover"

        />

      </div>

      {/* BUTTONS */}
      <div className="flex gap-4">

        {!recording ? (

          <button

            onClick={
              startRecording
            }

            className="flex-1 bg-red-600 hover:bg-red-500 transition py-5 rounded-3xl font-black text-xl"

          >

            Start Recording

          </button>

        ) : (

          <button

            onClick={
              stopRecording
            }

            className="flex-1 bg-white text-black py-5 rounded-3xl font-black text-xl"

          >

            Stop Recording

          </button>

        )}

      </div>

      {/* LOADING */}
      {loading && (

        <div className="mt-5 text-center text-zinc-500">

          Uploading...

        </div>

      )}

    </div>

  );

}