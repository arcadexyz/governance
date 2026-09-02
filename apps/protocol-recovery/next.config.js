/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Ignore ESLint errors during build - this app is standalone
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't fail on TS errors during build
    ignoreBuildErrors: false,
  },
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
