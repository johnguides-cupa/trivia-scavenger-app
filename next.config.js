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
  // Ensure proper routing on Vercel
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
}

module.exports = nextConfig
