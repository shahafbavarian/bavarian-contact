/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    minimumCacheTTL: 86400,
    // Every (source image × width × format) combination is billed as a separate
    // image transformation. The defaults emit 8 device widths (up to 3840px),
    // which multiplies fast across the fleet. These lists cover every layout we
    // actually render — the gallery frame never exceeds ~1000px CSS px — while
    // cutting the generated variants per image by half.
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [96, 256],
    remotePatterns: [
      { hostname: 'www.bavarian-motors.co.il' },
      { hostname: 'bavarian-motors.co.il' },
      { hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection',       value: '1; mode=block' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/go/ins',
        destination: '/?utm_source=ins-portal',
        permanent: false,
      },
      {
        // Printing moved onto the car page itself. Handled here rather than by
        // a route so old links and bookmarks get a real HTTP redirect at the
        // edge — no function invocation, no client-side hop.
        source: '/car/:recNo/print',
        destination: '/car/:recNo?print=1',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
