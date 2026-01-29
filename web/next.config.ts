import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow importing Python files (for backtest script reference)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Server-side: allow access to files outside web/ directory
      config.resolve = {
        ...config.resolve,
        symlinks: false,
      };
    }
    return config;
  },
  // Ensure Python files are not processed by Next.js
  experimental: {
    serverComponentsExternalPackages: ['child_process'],
  },
};

export default nextConfig;
