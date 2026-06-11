/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [85],
    remotePatterns: [
      { hostname: 'www.bavarian-motors.co.il' },
      { hostname: 'bavarian-motors.co.il' },
      { hostname: '*.supabase.co' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/go/ins',
        destination: '/?utm_source=ins-portal',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
