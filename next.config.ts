import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Permet de vérifier un build sans toucher au dossier du serveur de dev (NEXT_DIST_DIR=.next-check)
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
