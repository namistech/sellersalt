import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { DashboardShell } from "@/app/(dashboard)/dashboard-shell";
import { resolveWorkspaceContextForUser } from "@/services/session";
import { ShopsDirectoryClient, type PublicShopItem } from "./shops-client";

import { buildBreadcrumbListSchema } from "@/lib/seo-structured-data";

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
    siteName: "SellerSalt",
    title: "Etsy Shop Intelligence Directory — Top Sellers & Niches | SellerSalt",
    description:
      "Browse verified Etsy shops, daily sales velocity, and product opportunities uncovered by SellerSalt.",
    images: [
      {
        url: `${SITE_URL}/brand/og-image.png`,
        width: 1200,
        height: 630,
        alt: "SellerSalt Etsy Shop Directory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Etsy Shop Intelligence Directory — Top Sellers & Niches | SellerSalt",
    description: "Browse verified Etsy shop sales velocity and catalog yield.",
    images: [`${SITE_URL}/brand/og-image.png`],
  },
};

export default async function PublicShopsPage() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session);

  // Public, unauthenticated page — must never surface a paying customer's
  // own competitive research to anonymous visitors (including their
  // competitors). Scoped to admin-owned organizations only (the platform's
  // own showcase research, per CLAUDE.md's "Seller Salt Administration"
  // org), not every organization's Prospect rows. Previously had no
  // organizationId filter at all.
  const adminUsers = await prisma.user.findMany({ include: { memberships: true } });
  const adminOrgIds = Array.from(
    new Set(
      adminUsers
        .filter((u: (typeof adminUsers)[number]) => isAdminEmail(u.email))
        .flatMap((u: (typeof adminUsers)[number]) => u.memberships.map((m: (typeof u.memberships)[number]) => m.organizationId))
    )
  );

  // Fetch real prospect rows from the database to populate the public directory
  const prospects = adminOrgIds.length === 0
    ? []
    : await prisma.prospect.findMany({
        where: { organizationId: { in: adminOrgIds } },
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
      const activeListings = Math.max(1, p.activeListings ?? 1);
      const totalSales = p.totalSales ?? 0;
      // Batch 40: floored value used only as an internal denominator for
      // the derived estDailySales ratio below — the real, possibly-null
      // p.shopAgeMonths is what's actually stored/displayed (see
      // shopAgeMonths: p.shopAgeMonths below), so a genuinely unobserved
      // shop age is never shown as a fabricated "1 mos old".
      const shopAgeMonthsForMath = Math.max(1, p.shopAgeMonths ?? 1);
      const estDailySales = p.estDailySales ?? totalSales / (shopAgeMonthsForMath * 30.44);
      const avgSellingRatio = p.avgSellingRatio ?? totalSales / activeListings;

      shopMap.set(p.shopExternalId, {
        shopExternalId: p.shopExternalId,
        shopName: p.shopName,
        shopUrl: p.shopUrl,
        shopIconUrl: p.shopIconUrl,
        totalSales,
        activeListings,
        shopAgeMonths: p.shopAgeMonths,
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
    "@graph": [
      buildBreadcrumbListSchema(
        [
          { name: "Home", url: "/" },
          { name: "Etsy Shop Intelligence Directory", url: "/shops" },
        ],
        SITE_URL
      ),
      {
        "@type": "ItemList",
        name: "High-Performing Etsy Shops",
        itemListElement: shops.slice(0, 30).map((shop, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: shop.shopName,
          url: `${SITE_URL}/shops`,
          description: `${shop.shopName} on Etsy with ${shop.totalSales.toLocaleString()} sales and ${shop.activeListings} active listings.`,
        })),
      },
    ],
  };

  const content = (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ShopsDirectoryClient
        initialShops={shops}
        isAuthenticated={isAuthenticated}
      />
    </>
  );

  // Logged-in users get the real internal app shell (sidebar/topbar), not
  // marketing chrome — same pattern as /shops/[shopExternalId].
  if (session?.user) {
    const user = session.user as any;
    const context = await resolveWorkspaceContextForUser(user, isAdminEmail(user.email));
    return (
      <DashboardShell context={context}>
        <div className="max-w-6xl mx-auto w-full">{content}</div>
      </DashboardShell>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16]">
      <PublicHeader currentPath="/shops" />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">{content}</main>
      <PublicFooter />
    </div>
  );
}
