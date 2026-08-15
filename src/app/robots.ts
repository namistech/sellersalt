import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/shops", "/terms", "/privacy", "/contact"],
        disallow: ["/api/", "/admin", "/dashboard", "/settings", "/prospects", "/radar", "/spy", "/trends", "/inactive", "/favorites", "/jobs", "/connectors"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
