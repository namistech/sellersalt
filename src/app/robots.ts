import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";

export default function robots(): MetadataRoute.Robots {
  const cleanBase = SITE_URL.replace(/\/+$/, "");

  const publicAllowedPaths = [
    "/",
    "/pricing",
    "/how-it-works",
    "/shops",
    "/trust",
    "/marketplaces",
    "/contact",
    "/terms",
    "/privacy",
    "/trademarks",
    "/llms.txt",
    "/sitemap.xml",
  ];

  const privateDisallowedPaths = [
    "/api/",
    "/admin/",
    "/dashboard/",
    "/settings/",
    "/prospects/",
    "/radar/",
    "/categories/",
    "/seo/",
    "/planner/",
    "/studio/",
    "/shop-intelligence/",
    "/spy/",
    "/trends/",
    "/inactive/",
    "/favorites/",
    "/jobs/",
    "/connectors/",
    "/onboarding/",
    "/accept-invite/",
    "/reset-password/",
    "/verify-email/",
    "/checkout/",
  ];

  // Standard and AI/Answer Engine User-Agents for GEO/AEO discovery
  const crawlerUserAgents = [
    "*",
    "Googlebot",
    "Bingbot",
    "GPTBot",
    "ClaudeBot",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
    "cohere-ai",
    "Bytespider",
  ];

  return {
    rules: crawlerUserAgents.map((userAgent) => ({
      userAgent,
      allow: publicAllowedPaths,
      disallow: privateDisallowedPaths,
    })),
    sitemap: `${cleanBase}/sitemap.xml`,
  };
}

