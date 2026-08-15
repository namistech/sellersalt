import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/pricing",
    "/shops",
    "/terms",
    "/privacy",
    "/contact",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/shops" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : route === "/pricing" || route === "/shops" ? 0.9 : 0.6,
  }));
}
