/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Server Actions están habilitadas por defecto en Next.js 14
  },
  webpack: (config, { isServer }) => {
    // Suprimir la advertencia de punycode
    config.ignoreWarnings = [
      { module: /node_modules\/punycode/ }
    ];
    return config;
  }
}

module.exports = nextConfig