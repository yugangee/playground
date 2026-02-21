import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true,
    remotePatterns: [{ hostname: "i.pravatar.cc" }],
  },
  logging: {
    level: "error",
  },
};

export default nextConfig;
