/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // produces a minimal server bundle, ideal for the Coolify Docker deploy
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.etsystatic.com",
      },
      {
        protocol: "https",
        hostname: "i.etsystatic.com",
      },
      {
        protocol: "https",
        hostname: "img0.etsystatic.com",
      },
      {
        protocol: "https",
        hostname: "img1.etsystatic.com",
      },
      {
        protocol: "https",
        hostname: "**.etsy.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
