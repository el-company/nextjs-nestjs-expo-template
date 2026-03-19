/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ESLint plugins (turbo, react) use deprecated getFilename() API incompatible with ESLint v10
  // Run lint separately via `pnpm lint`
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: [
    "@repo/ui",
    "@repo/backend",
    "@repo/trpc",
    "@t3-oss/env-nextjs",
    "@t3-oss/env-core",
  ],
  experimental: {},
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
      { hostname: "placehold.co" },
      { hostname: "avatars.githubusercontent.com" },
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "*.amazonaws.com" },
    ],
  },
};
module.exports = nextConfig;
