import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  env: {
    NEXT_PUBLIC_API_URL: "https://ayeyr9vgsc.execute-api.us-east-1.amazonaws.com/prod",
    NEXT_PUBLIC_MANAGE_API_URL: "https://91iv3etr0h.execute-api.us-east-1.amazonaws.com/prod",
    NEXT_PUBLIC_COGNITO_DOMAIN: "playground-sedaily.auth.us-east-1.amazoncognito.com",
    NEXT_PUBLIC_COGNITO_CLIENT_ID: "2m16g04t6prj9p79m7h12adn11",
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: "23338190756-lamc6koq6548eag3i0issk8f88vvl0ju.apps.googleusercontent.com",
  },
  typescript: { ignoreBuildErrors: true },
  turbopack: { root: "." },
  images: {
    unoptimized: true,
    remotePatterns: [{ hostname: "i.pravatar.cc" }],
  },
};

export default nextConfig;
