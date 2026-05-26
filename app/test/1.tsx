"use client";

async function testRender() {

  try {

    // ORIGINAL
    const originalResponse =
      await fetch(
        "/videos/original.mp4"
      );

    const originalBlob =
      await originalResponse.blob();

    // REACTION
    const reactionResponse =
      await fetch(
        "/videos/reaction.mp4"
      );

    const reactionBlob =
      await reactionResponse.blob();

    // FORM DATA
    const formData =
      new FormData();

    formData.append(
      "original",

      new File(
        [originalBlob],
        "original.mp4"
      )
    );

    formData.append(
      "reaction",

      new File(
        [reactionBlob],
        "reaction.mp4"
      )
    );

    // BACKEND
    const response =
      await fetch(
        "http://localhost:5000/render-duet",
        {
          method:
            "POST",

          body:
            formData,
        }
      );

    const data =
      await response.json();

    console.log(data);

    alert(
      "RENDER SUCCESS"
    );

    // OPEN VIDEO
    window.open(
      data.videoUrl,
      "_blank"
    );

  } catch (err) {

    console.log(err);

    alert(
      "RENDER FAILED"
    );

  }
}

export default function TestPage() {

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">

      <button
        onClick={
          testRender
        }
        className="px-10 py-6 rounded-3xl bg-red-600 text-white text-3xl font-black"
      >

        TEST RENDER

      </button>

    </div>
  );
}