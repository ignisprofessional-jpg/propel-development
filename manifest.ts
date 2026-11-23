import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Propel Development",
    short_name: "Propel",
    description: "Islam, agence Propel et développement personnel, au même endroit.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050505",
    theme_color: "#0a0a0b",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Prière", url: "/islam/priere" },
      { name: "To-do", url: "/perso/taches" },
      { name: "Prospects", url: "/agence/prospects" },
    ],
  };
}
