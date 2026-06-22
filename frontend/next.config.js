/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tanstack/react-virtual'],
  webpack: (config) => {
    // Allows loading web workers in Next.js
    config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';
    return config;
  }
};

module.exports = nextConfig;
