import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Handle canvas package which requires native binaries
  // It's dynamically imported so won't break the build
  serverExternalPackages: ['canvas'],
};

export default nextConfig;
