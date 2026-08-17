import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during production builds (lint separately in CI if needed)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript build errors (type-check separately)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
