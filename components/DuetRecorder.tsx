async function renderDuet(
  reactionBlob: Blob
) {

  try {

    setLoading(
      true
    );

    // FORM
    const formData =
      new FormData();

    // IMPORTANT
    // convert relative path
    // to full URL
    const fullOriginalUrl =

      originalVideo.startsWith(
        "http"
      )

        ? originalVideo

        : `${window.location.origin}${originalVideo}`;

    console.log(
      "ORIGINAL URL",
      fullOriginalUrl
    );

    formData.append(

      "originalUrl",

      fullOriginalUrl

    );

    formData.append(

      "reaction",

      reactionBlob,

      "reaction.webm"

    );

    // BACKEND
    const response =
      await fetch(

        "https://music-reactions-v2-production.up.railway.app/render-duet",

        {

          method:
            "POST",

          body:
            formData,

        }

      );

    console.log(
      response.status
    );

    // DEBUG
    const text =
      await response.text();

    console.log(
      text
    );

    // JSON
    const data =
      JSON.parse(
        text
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

    // DOWNLOAD
    const renderedResponse =
      await fetch(
        data.videoUrl
      );

    const renderedBlob =
      await renderedResponse.blob();

    // FILE NAME
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

    // SAVE
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