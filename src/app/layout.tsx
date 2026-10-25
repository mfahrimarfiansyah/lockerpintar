import type { Metadata, Viewport } from "next";
import { Barlow, Big_Shoulders_Stencil, Bungee, Sedgwick_Ave_Display } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Barlow: teks isi (rambu jalan) · Bungee: judul (papan nama kota) · Sedgwick: tag grafiti · Big Shoulders Stencil: kode loker.
const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const bungee = Bungee({ variable: "--font-bungee", subsets: ["latin"], weight: "400" });
const sedgwick = Sedgwick_Ave_Display({ variable: "--font-sedgwick", subsets: ["latin"], weight: "400" });
const stensil = Big_Shoulders_Stencil({
  variable: "--font-stencil",
  subsets: ["latin"],
  // Next tidak punya metrik pengganti untuk font ini; cadangan biasa sudah cukup untuk kode loker.
  adjustFontFallback: false,
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "LockerPintar", template: "%s · LockerPintar" },
  description: "Cek loker kosong dan pinjam loker dengan scan kartu.",
  applicationName: "LockerPintar",
};

export const viewport: Viewport = {
  themeColor: "#131211",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${barlow.variable} ${bungee.variable} ${sedgwick.variable} ${stensil.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
