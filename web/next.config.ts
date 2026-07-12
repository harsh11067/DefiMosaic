import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for artifact deploys (EC2); unset on Vercel/Render
  ...(process.env.BUILD_STANDALONE ? { output: "standalone" as const } : {}),

  // Allow server-side packages
  serverExternalPackages: ['child_process', 'pino-pretty'],

  // ESLint config for build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScript config for build  
  typescript: {
    ignoreBuildErrors: true,
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Webpack config to handle react-native modules from MetaMask SDK
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Provide fallbacks for react-native modules used by MetaMask SDK
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'react-native': false,
      };
    }

    // Ignore pino-pretty optional dependency warning
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': 'pino-pretty',
    };

    return config;
  },
};

export default nextConfig;
