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

// CREATE FOLDERS
[
  uploadsDir,
  rendersDir,
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

// RENDER DUET
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

      // ORIGINAL URL
      const originalUrl =
        req.body.originalUrl;

      // REACTION FILE
      const reaction =
        req.file;

      if (
        !originalUrl ||
        !reaction
      ) {

        return res
          .status(400)
          .json({

            error:
              "Missing files",

          });

      }

      console.log(
        originalUrl
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

        // ORIGINAL SONG
        .input(
          originalUrl
        )

        // REACTION
        .input(
          reaction.path
        )

        .duration(
          15
        )

        .complexFilter([

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

              fs.unlinkSync(
                reaction.path
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