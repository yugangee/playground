import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typescript: { ignoreBuildErrors: true },
  turbopack: { root: "." },
  images: {
    unoptimized: true,
    remotePatterns: [{ hostname: "i.pravatar.cc" }],
  },
};

export default nextConfig;
