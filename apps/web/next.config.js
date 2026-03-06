/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@repo/ui",
    "@repo/backend",
    "@repo/trpc",
    "@t3-oss/env-nextjs",
    "@t3-oss/env-core",
  ],
  experimental: {
    serverExternalPackages: [
      "@trpc/client",
      "@trpc/server",
      "@trpc/react-query",
      "@trpc/tanstack-react-query",
    ],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: "javascript/auto",
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        hostname: "placehold.co",
      },
    ],
  },
};
module.exports = nextConfig;
