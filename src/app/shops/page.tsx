import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { ShopsDirectoryClient, type PublicShopItem } from "./shops-client";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "Etsy Shop Intelligence Directory — Top Sellers & Niches | SellerSalt",
  description:
    "Explore high-performing Etsy shops, daily sales velocity, catalog density, and high-demand product niches discovered with SellerSalt's intelligence engine.",
  keywords:
    "Etsy shop directory, top Etsy sellers, Etsy competitor analysis, Etsy sales tracker, high velocity Etsy shops, Etsy niche research",
  alternates: { canonical: `${SITE_URL}/shops` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/shops`,
    title: "Etsy Shop Intelligence Directory — Top Sellers & Niches | SellerSalt",
    description:
      "Browse verified Etsy shops, daily sales velocity, and product opportunities uncovered by SellerSalt.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Etsy Shop Intelligence Directory — Top Sellers & Niches | SellerSalt",
    description: "Browse verified Etsy shop sales velocity and catalog yield.",
  },
};

export default async function PublicShopsPage() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session);

  // Fetch real prospect rows from the database to populate the public directory
  const prospects = await prisma.prospect.findMany({
    select: {
      shopExternalId: true,
      shopName: true,
      shopUrl: true,
      shopIconUrl: true,
      totalSales: true,
      activeListings: true,
      shopAgeMonths: true,
      estDailySales: true,
      avgSellingRatio: true,
      reviewCount: true,
      reviewAverage: true,
      keyword: true,
      price: true,
      listingTitle: true,
      listingImageUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Aggregate by shopExternalId into distinct unique shop profiles
  const shopMap = new Map<string, PublicShopItem>();

  for (const p of prospects) {
    if (!shopMap.has(p.shopExternalId)) {
      const activeListings = Math.max(1, p.activeListings);
      const totalSales = p.totalSales ?? 0;
      const shopAgeMonths = Math.max(1, p.shopAgeMonths);
      const estDailySales = p.estDailySales ?? totalSales / (shopAgeMonths * 30.44);
      const avgSellingRatio = p.avgSellingRatio ?? totalSales / activeListings;

      shopMap.set(p.shopExternalId, {
        shopExternalId: p.shopExternalId,
        shopName: p.shopName,
        shopUrl: p.shopUrl,
        shopIconUrl: p.shopIconUrl,
        totalSales,
        activeListings,
        shopAgeMonths,
        estDailySales: Math.round(estDailySales * 10) / 10,
        avgSellingRatio: Math.round(avgSellingRatio * 10) / 10,
        reviewCount: p.reviewCount,
        reviewAverage: p.reviewAverage,
        keywords: p.keyword ? [p.keyword] : [],
        topListing: p.listingTitle
          ? {
              title: p.listingTitle,
              price: p.price,
              imageUrl: p.listingImageUrl,
            }
          : null,
        discoveredAt: p.createdAt.toISOString(),
      });
    } else {
      const existing = shopMap.get(p.shopExternalId)!;
      if (p.keyword && !existing.keywords.includes(p.keyword)) {
        existing.keywords.push(p.keyword);
      }
      if ((p.totalSales ?? 0) > existing.totalSales) {
        existing.totalSales = p.totalSales ?? 0;
      }
    }
  }

  const shops = Array.from(shopMap.values());

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: shops.slice(0, 30).map((shop, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: shop.shopName,
      url: `${SITE_URL}/shops`,
      description: `${shop.shopName} on Etsy with ${shop.totalSales.toLocaleString()} sales and ${shop.activeListings} active listings.`,
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHeader currentPath="/shops" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <ShopsDirectoryClient
          initialShops={shops}
          isAuthenticated={isAuthenticated}
        />
      </main>

      <PublicFooter />
    </div>
  );
}
