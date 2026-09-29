import type { NextConfig } from 'next'

/**
 * Security headers applied to every route. A Content-Security-Policy is not
 * set yet: wallet extensions and Next's inline runtime need a nonce-based CSP
 * (middleware) to be added safely — tracked in the README roadmap.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'dd.dexscreener.com' },
      { protocol: 'https', hostname: 'cdn.dexscreener.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  async redirects() {
    // Legacy routes from the previous Achilyon terminal.
    return [
      { source: '/markets', destination: '/discover', permanent: true },
      { source: '/launchpad', destination: '/launch', permanent: true },
      { source: '/trade', destination: '/portfolio', permanent: false },
    ]
  },
}

export default nextConfig
