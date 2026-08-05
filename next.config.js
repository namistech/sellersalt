/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // produces a minimal server bundle, ideal for the Coolify Docker deploy
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
