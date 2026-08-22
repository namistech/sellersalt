import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://sellersalt.com";

interface PublicRouteConfig {
  path: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const cleanBase = SITE_URL.replace(/\/+$/, "");

  const publicRoutes: PublicRouteConfig[] = [
    { path: "", changeFrequency: "daily", priority: 1.0 },
    { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
    { path: "/how-it-works", changeFrequency: "weekly", priority: 0.9 },
    { path: "/shops", changeFrequency: "daily", priority: 0.8 },
    { path: "/trust", changeFrequency: "weekly", priority: 0.7 },
    { path: "/marketplaces", changeFrequency: "weekly", priority: 0.7 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
    { path: "/terms", changeFrequency: "monthly", priority: 0.5 },
    { path: "/privacy", changeFrequency: "monthly", priority: 0.5 },
    { path: "/trademarks", changeFrequency: "monthly", priority: 0.5 },
  ];

  return publicRoutes.map((route) => ({
    url: `${cleanBase}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

