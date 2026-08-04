import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is for the Docker image only; Vercel builds its own bundle.
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
