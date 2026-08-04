import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone so the Docker image ships without node_modules.
  output: "standalone",
};

export default nextConfig;
