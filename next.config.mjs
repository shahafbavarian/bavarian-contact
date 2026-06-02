/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: 'www.bavarian-motors.co.il' }],
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
