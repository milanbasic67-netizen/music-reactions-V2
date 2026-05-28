const express =
  require("express");

const cors =
  require("cors");

const multer =
  require("multer");

const ffmpeg =
  require("fluent-ffmpeg");

const ytdlp =
  require(
    "yt-dlp-exec"
  );

const path =
  require("path");

const fs =
  require("fs");

const { exec }
  = require(
    "child_process"
  );

require("dotenv")
  .config();

const {
  createClient,
} = require(
  "@supabase/supabase-js"
);

const ws =
  require("ws");

console.log(
  "SERVER STARTING"
);

const app =
  express();

// ENV
const PORT =
  process.env.PORT || 5000;

const APP_URL =
  process.env.APP_URL ||
  `http://localhost:${PORT}`;

// CORS
app.use(

  cors({

    origin: "*",

    methods: [
      "GET",
      "POST",
    ],

  })

);

app.use(
  express.json({
    limit:
      "50mb",
  })
);

console.log(
  "MIDDLEWARE OK"
);

// SUPABASE
const supabase =
  createClient(

    process.env
      .SUPABASE_URL,

    process.env
      .SUPABASE_SERVICE_ROLE_KEY,

    {

      realtime: {

        transport:
          ws,

      },

    }

  );

console.log(
  "SUPABASE OK"
);

// FOLDERS
const uploadsDir =
  path.join(
    __dirname,
    "uploads"
  );

const rendersDir =
  path.join(
    __dirname,
    "renders"
  );

const tempDir =
  path.join(
    __dirname,
    "temp"
  );

// CREATE FOLDERS
[
  uploadsDir,
  rendersDir,
  tempDir,
].forEach(

  (
    dir
  ) => {

    if (
      !fs.existsSync(
        dir
      )
    ) {

      fs.mkdirSync(

        dir,

        {

          recursive:
            true,

        }

      );

    }

  }

);

// STATIC
app.use(

  "/renders",

  express.static(
    rendersDir
  )

);

app.use(

  "/uploads",

  express.static(
    uploadsDir
  )

);

app.use(

  "/temp",

  express.static(
    tempDir
  )

);

// MULTER
const storage =
  multer.diskStorage({

    destination:
      (
        req,
        file,
        cb
      ) => {

        cb(
          null,
          uploadsDir
        );

      },

    filename:
      (
        req,
        file,
        cb
      ) => {

        cb(

          null,

          `${Date.now()}-${file.originalname}`

        );

      },

  });

const upload =
  multer({
    storage,
  });

// HEALTH
app.get(

  "/",

  (
    req,
    res
  ) => {

    res.send(
      "OK"
    );

  }

);

// PREPARE SONG
app.post(

  "/prepare-song",

  async (
    req,
    res
  ) => {

    try {

      console.log(
        "PREPARE SONG"
      );

      const {
        youtubeUrl,
      } =
        req.body;

      if (
        !youtubeUrl
      ) {

        return res
          .status(400)
          .json({

            error:
              "Missing youtubeUrl",

          });

      }

      // UNIQUE ID
      const id =

        Date.now() +
        "-" +
        Math.random()
          .toString(
            36
          )
          .substring(
            2,
            8
          );

      // OUTPUT
      const outputPath =

        path.join(

          tempDir,

          `${id}.mp4`

        );

      console.log(
        "DOWNLOADING..."
      );

      // DOWNLOAD
      await ytdlp(

        youtubeUrl,

        {

          output:
            outputPath,

          format:
            "best[ext=mp4]",

          noCheckCertificates:
            true,

          preferFreeFormats:
            false,

          youtubeSkipDashManifest:
            true,

        }

      );

      // EXISTS?
      const exists =
        fs.existsSync(
          outputPath
        );

      if (!exists) {

        return res
          .status(500)
          .json({

            error:
              "Download failed",

          });

      }

      console.log(
        "DOWNLOAD DONE"
      );

      return res.json({

        success:
          true,

        videoUrl:

`${APP_URL}/temp/${id}.mp4`,

        tempFile:
          `${id}.mp4`,

      });

    } catch (
      err
    ) {

      console.log(
        err
      );

      return res
        .status(500)
        .json({

          error:
            "Prepare failed",

        });

    }

  }

);

// YOUTUBE IMPORT
app.post(

  "/import-youtube",

  async (
    req,
    res
  ) => {

    try {

      console.log(
        "IMPORT YOUTUBE HIT"
      );

      const {
        youtubeUrl,
      } = req.body;

      if (
        !youtubeUrl
      ) {

        return res
          .status(400)
          .json({

            error:
              "Missing URL",

          });

      }

      const id =
        Date.now();

      const outputPath =
        path.join(

          uploadsDir,

          `${id}.mp4`

        );

      console.log(
        "DOWNLOADING..."
      );

      // DOWNLOAD VIDEO
      await ytdlp(

        youtubeUrl,

        {

          output:
            outputPath,

          format:
            "best",

          noCheckCertificates:
            true,

          preferFreeFormats:
            false,

          youtubeSkipDashManifest:
            true,

        }

      );

      // FILE EXISTS?
      const exists =
        fs.existsSync(
          outputPath
        );

      if (!exists) {

        return res
          .status(500)
          .json({

            error:
              "Video not downloaded",

          });

      }

      // THUMB
      const thumbPath =
        path.join(

          uploadsDir,

          `${id}.jpg`

        );

      // GENERATE THUMB
      await new Promise(

        (
          resolve,
          reject
        ) => {

          ffmpeg(
            outputPath
          )

            .screenshots({

              timestamps:
                ["1"],

              filename:
                `${id}.jpg`,

              folder:
                uploadsDir,

              size:
                "720x1280",

            })

            .on(
              "end",
              resolve
            )

            .on(
              "error",
              reject
            );

        }

      );

      return res.json({

        success:
          true,

        localVideo:
          `${APP_URL}/uploads/${id}.mp4`,

        localThumb:
          `${APP_URL}/uploads/${id}.jpg`,

      });

    } catch (err) {

      console.log(
        err
      );

      return res
        .status(500)
        .json({

          error:
            err.message ||
            "Import failed",

        });

    }

  }

);

// RENDER
app.post(

  "/render-duet",

  upload.single(
    "reaction"
  ),

  async (
    req,
    res
  ) => {

    try {

      console.log(
        "RENDER START"
      );

      const reaction =
        req.file;

      const {
        tempFile,
      } =
        req.body;

      if (
        !reaction ||
        !tempFile
      ) {

        return res
          .status(400)
          .json({

            error:
              "Missing files",

          });

      }

      // ORIGINAL TEMP VIDEO
      const originalPath =

        path.join(

          tempDir,

          tempFile

        );

      // EXISTS?
      if (

        !fs.existsSync(
          originalPath
        )

      ) {

        return res
          .status(404)
          .json({

            error:
              "Temp video missing",

          });

      }

      console.log(
        originalPath
      );

      console.log(
        reaction.path
      );

      // OUTPUT
      const outputName =
        `duet-${Date.now()}.mp4`;

      const outputPath =
        path.join(

          rendersDir,

          outputName

        );

      ffmpeg()

        .input(
          originalPath
        )

        .input(
          reaction.path
        )

        .duration(
          15
        )

        .complexFilter([

          // MAIN REACTION
          {
            filter:
              "fps",

            options:
              30,

            inputs:
              "1:v",

            outputs:
              "reactionfps",
          },

          {
            filter:
              "scale",

            options:
              "1080:1920",

            inputs:
              "reactionfps",

            outputs:
              "reactionfull",
          },

          // SMALL ORIGINAL
          {
            filter:
              "fps",

            options:
              30,

            inputs:
              "0:v",

            outputs:
              "originalfps",
          },

          {
            filter:
              "scale",

            options:
              "320:568",

            inputs:
              "originalfps",

            outputs:
              "smalloriginal",
          },

          // OVERLAY
          {
            filter:
              "overlay",

            options:
              {

                x: 40,

                y: 40,

              },

            inputs:
              [

                "reactionfull",

                "smalloriginal",

              ],

            outputs:
              "v",
          },

          // SONG AUDIO
          {
            filter:
              "volume",

            options:
              "0.3",

            inputs:
              "0:a",

            outputs:
              "songquiet",
          },

          // MIC AUDIO
          {
            filter:
              "volume",

            options:
              "4",

            inputs:
              "1:a",

            outputs:
              "micboost",
          },

          // MIX
          {
            filter:
              "amix",

            options:
              {

                inputs: 2,

                duration:
                  "shortest",

                dropout_transition:
                  0,

              },

            inputs:
              [

                "songquiet",

                "micboost",

              ],

            outputs:
              "a",
          },

        ])

        .outputOptions([

          "-map [v]",

          "-map [a]",

          "-c:v libx264",

          "-c:a aac",

          "-preset ultrafast",

          "-crf 35",

          "-r 30",

          "-vsync 2",

          "-t 15",

          "-threads 2",

          "-movflags +faststart",

        ])

        .on(

          "end",

          () => {

            console.log(
              "DONE"
            );

            try {

              // DELETE TEMP FILES
              fs.unlinkSync(
                reaction.path
              );

              fs.unlinkSync(
                originalPath
              );

            } catch (
              cleanupErr
            ) {

              console.log(
                cleanupErr
              );

            }

            return res.json({

              success:
                true,

              videoUrl:
`${APP_URL}/renders/${outputName}`,

            });

          }

        )

        .on(

          "error",

          (
            err
          ) => {

            console.log(
              err
            );

            return res
              .status(500)
              .json({

                error:
                  "Render failed",

              });

          }

        )

        .save(
          outputPath
        );

    } catch (err) {

      console.log(
        err
      );

      return res
        .status(500)
        .json({

          error:
            "Server error",

        });

    }

  }

);

// START
app.listen(

  PORT,

  () => {

    console.log(

      `Server running on ${PORT}`

    );

  }

);