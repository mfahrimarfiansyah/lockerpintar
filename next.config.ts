import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Image Docker memakai output standalone (diaktifkan di Dockerfile).
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  // exceljs memakai require dinamis; biarkan Node yang memuatnya.
  serverExternalPackages: ["exceljs"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
