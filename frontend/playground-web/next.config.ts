import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
    remotePatterns: [{ hostname: "i.pravatar.cc" }],
  },
  logging: {
    level: "error",
  },
};

export default nextConfig;
