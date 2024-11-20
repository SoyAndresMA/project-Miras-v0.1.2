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

    if (!isServer) {
      // Don't bundle server-only modules on client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        sqlite3: false,
        net: false,
        tls: false,
      };
    }

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
    pagesBufferLength: 2,
  }
}

module.exports = nextConfig