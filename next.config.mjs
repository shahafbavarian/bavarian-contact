/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    minimumCacheTTL: 86400,
    // Every (source image × width × format) combination is billed as a separate
    // image transformation, and the defaults emit 8 device widths up to 3840px.
    // This ladder is trimmed to the widths our layouts actually select, keeping
    // 2560 because the car gallery on a retina desktop genuinely needs it —
    // without it that hero image gets upscaled and looks soft. Variants are
    // only generated when a device actually requests one, so phones never pay
    // for the large end of this list.
    deviceSizes: [640, 828, 1200, 1920, 2560],
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
