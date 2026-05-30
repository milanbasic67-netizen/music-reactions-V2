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

      // GET REACTION DURATION
      

          const duration =
  Number(
    req.body.duration
  ) || 15;

console.log(
  "REACTION DURATION:",
  duration
);

          // START FFMPEG
          ffmpeg()

            // ORIGINAL SONG
            .input(
              originalUrl
            )

            // REACTION
            .input(
              reaction.path
            )            
            
             .duration(duration + 0.5)

            // LIMIT TO REACTION LENGTH
            

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
                  "720:1280",

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
                  "0.8",

                inputs:
                  "0:a",

                outputs:
                  "songquiet",
              },

// MIC DELAY
{
  filter: "adelay",
  options: "250|250",
  inputs: "1:a",
  outputs: "micdelayed",
},
              // MIC AUDIO
              {
                filter:
                  "volume",

                options:
                  "3.0",

                inputs:
                  "micdelayed",


                outputs:
                  "micboost",
              },

              // MIX AUDIO
              {
                filter:
                  "amix",

                options:
                  {

                    inputs: 2,

                    duration:
                      "shortest",
                    normalize: 1,

                    dropout_transition:
                      2,

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

  "-pix_fmt yuv420p",

  "-profile:v baseline",

  "-level 3.0",

  "-preset ultrafast",

  "-crf 35",

  "-r 30",

  "-shortest",

  "-threads 2",

  "-movflags +faststart",

            ])

            .on(

              "start",

              (
                command
              ) => {

                console.log(
                  command
                );

              }

            )

            .on(

              "progress",

              (
                progress
              ) => {

                console.log(
                  progress.percent
                );

              }

            )

            .on(

              "stderr",

              (
                line
              ) => {

                console.log(
                  line
                );

              }

            )

            .on(

  "end",

  async () => {

    try {

      console.log(
        "DONE"
      );

      const fileBuffer =
        fs.readFileSync(
          outputPath
        );

      const storageName =

        `duets/${Date.now()}.mp4`;

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

            storageName,

            fileBuffer,

            {

              contentType:
                "video/mp4",

              upsert:
                false,

            }

          );

      if (
        uploadError
      ) {

        console.log(
          uploadError
        );

        return res
          .status(500)
          .json({

            error:
              uploadError.message,

          });

      }

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
            storageName
          );

console.log(
  "STORAGE NAME:",
  storageName
);

console.log(
  "RETURN URL:",
  publicData.publicUrl
);

      try {

        fs.unlinkSync(
          reaction.path
        );

      } catch {}

      try {

        fs.unlinkSync(
          outputPath
        );

      } catch {}

      return res.json({

        success:
          true,

        videoUrl:
          publicData.publicUrl,

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
            "Upload failed",

        });

    }

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