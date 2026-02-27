import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  env: {
    NEXT_PUBLIC_API_URL: "https://ayeyr9vgsc.execute-api.us-east-1.amazonaws.com/prod",
    NEXT_PUBLIC_MANAGE_API_URL: "https://91iv3etr0h.execute-api.us-east-1.amazonaws.com/prod",
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    unoptimized: true,
    remotePatterns: [{ hostname: "i.pravatar.cc" }],
  },
};

export default nextConfig;
