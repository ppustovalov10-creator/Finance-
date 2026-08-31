import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Бюджет — трекер для переменного дохода",
    short_name: "Бюджет",
    description: "Личные финансы для тех, чей доход зависит от продаж, а не от оклада",
    start_url: "/",
    display: "standalone",
    background_color: "#0e0f0c",
    theme_color: "#0e0f0c",
    orientation: "portrait",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
