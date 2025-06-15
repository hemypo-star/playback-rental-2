
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'your-domain.com'], // Add your image domains here
    unoptimized: true // For development with external images
  },
  // Support for custom file extensions if needed
  pageExtensions: ['tsx', 'ts'],
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Redirect from root to catalog
  async redirects() {
    return [
      {
        source: '/',
        destination: '/catalog',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
