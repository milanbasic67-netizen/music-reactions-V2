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

  const cameraVideoRef =
    useRef<HTMLVideoElement>(
      null
    );

  const cameraRecorderRef =
    useRef<any>(
      null
    );

  const screenRecorderRef =
    useRef<any>(
      null
    );

  const cameraChunksRef =
    useRef<Blob[]>([]);

  const screenChunksRef =
    useRef<Blob[]>([]);

  const [cameraStream,
    setCameraStream] =
    useState<MediaStream | null>(
      null
    );

  const [screenStream,
    setScreenStream] =
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

        setCameraStream(
          media
        );

        if (
          cameraVideoRef.current
        ) {

          cameraVideoRef.current.srcObject =
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

      if (!cameraStream)
        return;

      // SCREEN SHARE
      const display =
        await navigator
          .mediaDevices
          .getDisplayMedia({

            video: true,

            audio: true,

          });

      setScreenStream(
        display
      );

      cameraChunksRef.current =
        [];

      screenChunksRef.current =
        [];

      // CAMERA RECORDER
      const cameraRecorder =
        new MediaRecorder(

          cameraStream,

          {

            mimeType:
              "video/webm",

          }

        );

      // SCREEN RECORDER
      const screenRecorder =
        new MediaRecorder(

          display,

          {

            mimeType:
              "video/webm",

          }

        );

      cameraRecorderRef.current =
        cameraRecorder;

      screenRecorderRef.current =
        screenRecorder;

      // CAMERA DATA
      cameraRecorder.ondataavailable =
        (
          e
        ) => {

          if (
            e.data.size > 0
          ) {

            cameraChunksRef.current.push(
              e.data
            );

          }

        };

      // SCREEN DATA
      screenRecorder.ondataavailable =
        (
          e
        ) => {

          if (
            e.data.size > 0
          ) {

            screenChunksRef.current.push(
              e.data
            );

          }

        };

      cameraRecorder.start();

      screenRecorder.start();

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
        "Screen share required"
      );

    }

  }

  // STOP
  async function stopRecording() {

    try {

      if (
        !cameraRecorderRef.current ||
        !screenRecorderRef.current
      ) {

        return;

      }

      setLoading(
        true
      );

      cameraRecorderRef.current.stop();

      screenRecorderRef.current.stop();

      screenStream?.getTracks().forEach(
        (
          track: any
        ) =>
          track.stop()
      );

      setTimeout(

        async () => {

          try {

            // CAMERA FILE
            const cameraBlob =
              new Blob(

                cameraChunksRef.current,

                {

                  type:
                    "video/webm",

                }

              );

            const cameraFile =
              new File(

                [cameraBlob],

                `reaction-${Date.now()}.webm`,

                {

                  type:
                    "video/webm",

                }

              );

            // SCREEN FILE
            const screenBlob =
              new Blob(

                screenChunksRef.current,

                {

                  type:
                    "video/webm",

                }

              );

            const screenFile =
              new File(

                [screenBlob],

                `original-${Date.now()}.webm`,

                {

                  type:
                    "video/webm",

                }

              );

            console.log(
              cameraFile
            );

            console.log(
              screenFile
            );

            // FORM DATA
            const formData =
              new FormData();

            formData.append(

              "original",

              screenFile

            );

            formData.append(

              "reaction",

              cameraFile

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

              setLoading(
                false
              );

              return;

            }

            // PROFILE
            const profile =
              await getProfile();

            // STORAGE NAME
            const finalName =

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

                  finalName,

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
                  finalName
                );

            // INSERT POST
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

        },

        1500

      );

    } catch (err) {

      console.log(
        err
      );

    }

  }

  return (

    <div className="p-5">

      {/* CAMERA */}
      <div className="rounded-3xl overflow-hidden bg-black mb-5 aspect-[9/16]">

        <video

          ref={cameraVideoRef}

          autoPlay

          muted

          playsInline

          className="w-full h-full object-cover"

        />

      </div>

      {/* INFO */}
      <div className="mb-5 text-zinc-500 text-sm">

        After clicking Start:
        choose current tab with
        YouTube audio enabled.

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

          Rendering duet...

        </div>

      )}

    </div>

  );

}