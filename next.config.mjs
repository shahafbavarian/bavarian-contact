/** @type {import('next').NextConfig} */
const nextConfig = {
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
