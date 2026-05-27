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

    origin: [

      "http://localhost:3000",

      "https://mreact.vercel.app",

    ],

    methods: [
      "GET",
      "POST",
    ],

    credentials:
      true,

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

// HEALTH CHECK
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

  upload.fields([

    {



    },

    {

      name:
        "reaction",

      maxCount:
        1,

    },

  ]),

  async (
    req,
    res
  ) => {

    try {

      console.log(
        "RENDER START"
      );

      const original =
        req.files[
          "original"
        ]?.[0];

      const reaction =
        req.files[
          "reaction"
        ]?.[0];

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

      console.log(
        "ORIGINAL:",
        original.path
      );

      console.log(
        "REACTION:",
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

      // FFMPEG
      ffmpeg()

        .input(
          originalUrl
        )

        .input(
          reaction.path
        )

        .complexFilter([

          "[0:v]scale=540:960[left]",

          "[1:v]scale=540:960[right]",

          "[left][right]hstack=inputs=2[v]"

        ])

        .outputOptions([

          "-map [v]",

          "-map 0:a?",

          "-c:v libx264",

          "-c:a aac",

          "-preset veryfast",

          "-movflags +faststart",

          "-shortest",

        ])

        .save(
          outputPath
        )

        .on(

          "start",

          (
            command
          ) => {

            console.log(
              "FFMPEG COMMAND"
            );

            console.log(
              command
            );

          }

        )

        .on(

          "end",

          () => {

            console.log(
              "FFMPEG DONE"
            );

            // CLEANUP
            try {

              fs.unlinkSync(
                original.path
              );

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
              "FFMPEG ERROR"
            );

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

        );

    } catch (err) {

      console.log(
        "SERVER ERROR"
      );

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