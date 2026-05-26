const express =
  require("express");

const cors =
  require("cors");

const multer =
  require("multer");

const ffmpeg =
  require("fluent-ffmpeg");

const path =
  require("path");

const fs =
  require("fs");

require("dotenv")
  .config();

const {
  createClient,
} = require(
  "@supabase/supabase-js"
);

console.log(
  "SERVER STARTING"
);

const app =
  express();

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
  express.json()
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
      .SUPABASE_SERVICE_ROLE_KEY
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

const songsDir =
  path.join(
    __dirname,
    "songs"
  );

const thumbnailsDir =
  path.join(
    __dirname,
    "thumbnails"
  );

// CREATE FOLDERS
[
  uploadsDir,
  rendersDir,
  songsDir,
  thumbnailsDir,
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

// RENDER
app.post(

  "/render-duet",

  upload.fields([
    {
      name:
        "original",
      maxCount: 1,
    },

    {
      name:
        "reaction",
      maxCount: 1,
    },
  ]),

  async (
    req,
    res
  ) => {

    try {

      const original =
        req.files[
          "original"
        ][0];

      const reaction =
        req.files[
          "reaction"
        ][0];

      if (
        !original ||
        !reaction
      ) {

        return res
          .status(400)
          .json({

            error:
              "Missing files",

          });

      }

      const outputName =
        `duet-${Date.now()}.mp4`;

      const outputPath =
        path.join(

          rendersDir,

          outputName
        );

      console.log(
        "FFMPEG START"
      );

      ffmpeg()

        .input(
          original.path
        )

        .input(
          reaction.path
        )

        .complexFilter([

          {
            filter:
              "scale",

            options:
              "540:1920:force_original_aspect_ratio=increase",

            inputs:
              "0:v",

            outputs:
              "leftScaled",
          },

          {
            filter:
              "crop",

            options:
              "540:1920",

            inputs:
              "leftScaled",

            outputs:
              "left",
          },

          {
            filter:
              "scale",

            options:
              "540:1920:force_original_aspect_ratio=increase",

            inputs:
              "1:v",

            outputs:
              "rightScaled",
          },

          {
            filter:
              "crop",

            options:
              "540:1920",

            inputs:
              "rightScaled",

            outputs:
              "right",
          },

          {
            filter:
              "hstack",

            options:
              {
                inputs:
                  2,
              },

            inputs: [
              "left",
              "right",
            ],

            outputs:
              "video",
          },

          {
            filter:
              "volume",

            options:
              "0.7",

            inputs:
              "0:a",

            outputs:
              "a0",
          },

          {
            filter:
              "volume",

            options:
              "1.2",

            inputs:
              "1:a",

            outputs:
              "a1",
          },

          {
            filter:
              "amix",

            options:
              "inputs=2:duration=shortest",

            inputs: [
              "a0",
              "a1",
            ],

            outputs:
              "audio",
          },

        ])

        .outputOptions([

          "-map [video]",

          "-map [audio]",

          "-c:v libx264",

          "-preset veryfast",

          "-crf 32",

          "-pix_fmt yuv420p",

          "-c:a aac",

          "-b:a 96k",

          "-movflags +faststart",

          "-shortest",

        ])

        .save(
          outputPath
        )

        .on(
          "end",

          () => {

            console.log(
              "FFMPEG DONE"
            );

            res.json({

              success:
                true,

              videoUrl:
                `${req.protocol}://${req.get("host")}/renders/${outputName}`,

            });

          }
        )

        .on(
          "error",

          (
            err
          ) => {

            console.log(
              "FFMPEG ERROR"
            );

            console.log(
              err
            );

            res
              .status(500)
              .json({

                error:
                  "Render failed",

              });

          }
        );

    } catch (err) {

      console.log(
        err
      );

      res
        .status(500)
        .json({

          error:
            "Server error",

        });

    }

  }
);

// START SERVER
const PORT =
  process.env.PORT || 5000;

app.listen(

  PORT,


    () => {

    console.log(

      `Server running on ${PORT}`

    );

  }

);