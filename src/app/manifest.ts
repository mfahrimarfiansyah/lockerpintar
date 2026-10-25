import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LockerPintar Kiosk",
    short_name: "LockerPintar",
    description: "Kiosk pinjam loker dengan scan kartu",
    start_url: "/kiosk",
    display: "fullscreen",
    orientation: "landscape",
    background_color: "#131211",
    theme_color: "#131211",
    icons: [{ src: "/ikon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
