/** @type {import('next').NextConfig} */

const CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://*.googleapis.com https://*.stripe.com https://*.paypal.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https://*.etsystatic.com https://*.etsy.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.stripe.com https://*.paypal.com https://*.r2.cloudflarestorage.com https://*.s3.amazonaws.com;
  connect-src 'self' https://api.etsy.com https://openapi.etsy.com https://*.googleapis.com https://*.stripe.com https://*.paypal.com https://*.safepay.com https://*.payfast.co.za https://*.payfast.io;
  frame-src 'self' https://*.stripe.com https://*.paypal.com https://*.safepay.com https://*.payfast.co.za https://*.payfast.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self' https://*.stripe.com https://*.paypal.com https://*.safepay.com https://*.payfast.co.za;
  object-src 'none';
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig = {
  output: "standalone", // produces a minimal server bundle, ideal for the Coolify Docker deploy
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.s3.amazonaws.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: CSP_HEADER,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
