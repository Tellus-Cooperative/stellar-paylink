import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HareLink",
    short_name: "HareLink",
    description: "Open-source payment links on Stellar",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#161616",
    theme_color: "#161616",
    lang: "en",
    dir: "ltr",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/favicon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
