import type { MetadataRoute } from "next";

// RF-50 criterio 1 · ADR-008. Colores = tokens claros de app/globals.css.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My-Deutsch",
    short_name: "My-Deutsch",
    description:
      "Lee libros de alemán con el significado de cada palabra y los colores de género.",
    lang: "es",
    display: "standalone",
    start_url: "/grupos",
    scope: "/",
    theme_color: "#f6f7fb",
    background_color: "#f6f7fb",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
