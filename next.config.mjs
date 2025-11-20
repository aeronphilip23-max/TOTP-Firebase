import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Handle all node: protocol imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'node:process': require.resolve('process/browser'),
      'node:path': require.resolve('path-browserify'),
      'node:buffer': require.resolve('buffer/'),
      'node:util': require.resolve('util/'),
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      "process": require.resolve("process/browser"),
      "path": require.resolve("path-browserify"),
      "buffer": require.resolve("buffer/"),
      "util": require.resolve("util/"),
    };

    return config;
  },
};

export default nextConfig;