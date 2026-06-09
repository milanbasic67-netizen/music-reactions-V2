import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DuetApp",
    short_name: "DuetApp",
    description: "Record and share musical duets",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0D0D14",
    theme_color: "#7C3AED",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
