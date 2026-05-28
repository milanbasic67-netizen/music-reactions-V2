const express =
  require(
    "express"
  );

const router =
  express.Router();

const path =
  require(
    "path"
  );

const fs =
  require(
    "fs"
  );

const { exec }
  = require(
    "child_process"
  );

router.post(
  "/prepare-song",
  async (
    req,
    res
  ) => {

    try {

      const {
        youtubeUrl,
      } =
        req.body;

      if (
        !youtubeUrl
      ) {

        return res
          .status(
            400
          )
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

      // TEMP DIR
      const tempDir =

        path.join(
          __dirname,
          "..",
          "temp"
        );

      if (
        !fs.existsSync(
          tempDir
        )
      ) {

        fs.mkdirSync(
          tempDir
        );

      }

      // OUTPUT
      const outputPath =

        path.join(
          tempDir,
          `${id}.mp4`
        );

      // YT-DLP
      const command =

        `yt-dlp -f mp4 -o "${outputPath}" "${youtubeUrl}"`;

      console.log(
        command
      );

      exec(

        command,

        async (
          error,
          stdout,
          stderr
        ) => {

          if (
            error
          ) {

            console.log(
              error
            );

            return res
              .status(
                500
              )
              .json({

                error:
                  "Download failed",

              });

          }

          console.log(
            stdout
          );

          console.log(
            stderr
          );

          return res
            .json({

              success:
                true,

              videoUrl:

`${process.env.API_URL}/temp/${id}.mp4`,

              tempFile:
                `${id}.mp4`,

            });

        }

      );

    } catch (
      err
    ) {

      console.log(
        err
      );

      res
        .status(
          500
        )
        .json({

          error:
            "Server error",

        });

    }

  }
);

module.exports =
  router;