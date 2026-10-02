import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Dev-Server auch über Tailscale erreichbar (IP im 100er-Bereich und MagicDNS-Name)
  allowedDevOrigins: ['100.*.*.*', '**.ts.net'],
  images: {
    // Bild-Optimierung aktivieren
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 Tage
  },
  // HTTP-Header für Caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        // Statische Assets: Lange Cache-Zeit
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Bilder: Mittlere Cache-Zeit mit Revalidation
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        // API-Routen: kein Caching für dynamische Daten; Kartenbilder setzen ihre Header selbst
        source: '/api/:path((?!card-images/).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
      {
        // HTML-Seiten: Kurze Cache-Zeit mit Revalidation (API-Routen haben eigene Regeln)
        source: '/:path((?!api/).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
