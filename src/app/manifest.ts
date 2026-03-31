import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Butlers Inc. | Premium Concierge Service",
    short_name: "Butlers Inc.",
    description: "Your personal butler, on demand. Across England.",
    start_url: "/",
    display: "standalone",
    background_color: "#262F3D",
    theme_color: "#262F3D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
