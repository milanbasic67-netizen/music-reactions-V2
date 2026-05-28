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
  async function startRecording() {

    try {

      if (!stream)
        return;

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

      // AUTO STOP
      setTimeout(

        () => {

          stopRecording();

        },

        15000

      );

    } catch (err) {

      console.log(
        err
      );

    }

  }

  // STOP
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

            console.log(
              reactionFile
            );

            // FORM DATA
            const formData =
              new FormData();

            // SEND ORIGINAL URL
            formData.append(

              "originalUrl",

              originalVideo

            );

            // SEND REACTION
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

            const renderData =
              await renderRes.json();

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

            // DOWNLOAD FINAL VIDEO
            const finalVideoRes =
              await fetch(

                renderData.videoUrl

              );

            const finalBlob =
              await finalVideoRes.blob();

            const finalFile =
              new File(

                [finalBlob],

                `final-${Date.now()}.mp4`,

                {

                  type:
                    "video/mp4",

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

              return;

            }

            // PROFILE
            const profile =
              await getProfile();

            // STORAGE NAME
            const fileName =

`${Date.now()}-${finalFile.name}`;

            // UPLOAD FINAL VIDEO
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

                  finalFile,

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
                uploadError.message
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

        1200

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

          ref={videoRef}

          autoPlay

          muted

          playsInline

          className="w-full h-full object-cover"

        />

      </div>

      {/* BUTTON */}
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

      {/* RECORDING */}
      {recording && (

        <div className="text-center text-red-500 font-black">

          Recording...

        </div>

      )}

      {/* LOADING */}
      {loading && (

        <div className="text-center text-zinc-400 font-black">

          Rendering duet...

        </div>

      )}

    </div>

  );

}