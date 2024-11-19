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
  },
  // Mejorar el comportamiento de desarrollo
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  // Forzar la recompilación en cambios
  onDemandEntries: {
    // Periodo de tiempo que una página debe mantenerse en buffer
    maxInactiveAge: 25 * 1000,
    // Número de páginas que deben mantenerse en buffer
    pagesBufferLength: 5,
  },
  // Optimizar para desarrollo
  reactStrictMode: true,
  poweredByHeader: false,
}

module.exports = nextConfig