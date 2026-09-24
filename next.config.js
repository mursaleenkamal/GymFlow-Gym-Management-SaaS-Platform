const isProd = process.env.NODE_ENV === 'production'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://content-crawdad-120459.upstash.io https://*.sentry.io${isProd ? '' : ' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:* ws: wss:'}`,
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'none'",
      "worker-src 'self' blob:",
    ].join('; '),
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  experimental: {
    // Issue 4 fix: Set staleTimes to enable client-side router cache for
    // dynamic routes. Next.js 15 defaults to 0s for dynamic routes, meaning
    // every single navigation (even back to a page just visited) triggers a
    // full RSC round-trip. 30s is conservative: all mutation paths in this app
    // already call invalidateMembersCache() / router.refresh(), so stale
    // RSC payloads will not be served after data-mutating user actions.
    staleTimes: {
      dynamic: 30,   // cache dynamic route RSC payloads 30s client-side
      static: 180,   // cache static route RSC payloads 3min client-side
    },
    serverActions: {
      bodySizeLimit: '2mb',
      allowedOrigins: [
        'localhost:3004',
        '127.0.0.1:3004',
        'localhost:3000',
        '*.lhr.life',
        '*.trycloudflare.com',
        '*.localtunnel.me',
        '192.168.0.101:3004',
        '192.168.0.105:3004',
        '192.168.0.106:3004',
        process.env.NEXT_PUBLIC_APP_URL,
      ].filter(Boolean),
    },
    // Tree-shake lucide-react and date-fns — only import used icons/functions
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },

  // Keep ExcelJS server-side only — prevents it from being bundled into client chunks
  serverExternalPackages: ['exceljs'],

  compiler: {
    // Remove console.log in production builds
    removeConsole: isProd ? { exclude: ['error', 'warn'] } : false,
  },

  // Aggressive chunk splitting for better caching in production builds only.
  // In development, Next.js handles chunking in-memory for fast HMR and compilation.
  webpack(config, { dev, isServer }) {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Isolate supabase into its own chunk — rarely changes
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 20,
          },
          // date-fns into its own chunk
          dateFns: {
            test: /[\\/]node_modules[\\/]date-fns[\\/]/,
            name: 'date-fns',
            chunks: 'all',
            priority: 15,
          },
        },
      }
    }
    return config
  },
}

// In production, wrap with Sentry for error tracking and monitoring.
// In development, export raw config to avoid ~30-60s compilation overhead per route.
if (isProd) {
  const { withSentryConfig } = require("@sentry/nextjs/config");
  module.exports = withSentryConfig(nextConfig, {
    org: "gym-flow",
    project: "gymflow-production",
    silent: !process.env.CI,
    widenClientFileUpload: true,
    webpack: {
      automaticVercelMonitors: true,
      treeshake: {
        removeDebugLogging: true,
      },
    },
  });
} else {
  module.exports = nextConfig;
}
