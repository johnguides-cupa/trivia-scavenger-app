/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Ensure all routes work properly on Vercel
  async rewrites() {
    return []
  },
}

module.exports = nextConfig
