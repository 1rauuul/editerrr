import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "edtr",
    short_name: "edtr",
    description: "Combina fotos en lienzos de dos mitades, todo en tu dispositivo.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#111111",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
