import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.OPC_NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  output: "standalone"
};

export default nextConfig;
