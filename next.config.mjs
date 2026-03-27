/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static-ca-cdn.eporner.com",
      },
      {
        protocol: "https",
        hostname: "static-eu-cdn.eporner.com",
      },
      {
        protocol: "https",
        hostname: "*.eporner.com",
      },
    ],
  },
}

export default nextConfig
