import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "with", "to", "of", "in", "on", "at",
  "by", "from", "is", "are", "your", "you", "this", "that", "it", "as", "be",
  "digital", "download", "printable", "pdf", "instant", "custom", "set",
]);

function extractKeywords(titles: string[], limit = 15): Array<{ term: string; count: number }> {
  const counts = new Map<string, number>();
  for (const title of titles) {
    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w));
    for (const w of words) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ shopExternalId: string }> }) {
  const { shopExternalId } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allProspects = await prisma.prospect.findMany({
    where: { organizationId, shopExternalId },
    orderBy: { createdAt: "desc" },
  });

  if (allProspects.length === 0) {
    return NextResponse.json({ error: "Shop not found in your data." }, { status: 404 });
  }

  const latest = allProspects[0];
  const earliest = allProspects[allProspects.length - 1];

  const listingMap = new Map<string, (typeof allProspects)[number]>();
  for (const p of allProspects) {
    if (!listingMap.has(p.listingExternalId)) listingMap.set(p.listingExternalId, p);
  }
  const listings = [...listingMap.values()];

  const keywords = extractKeywords(listings.map((l) => l.listingTitle));

  const watch = await prisma.shopWatch.findUnique({
    where: { organizationId_shopExternalId: { organizationId, shopExternalId } },
    include: { snapshots: { orderBy: { capturedAt: "asc" } } },
  });

  const badges: string[] = [];
  if (earliest.shopAgeMonths < 12) badges.push("New shop");
  if ((latest.reviewAverage ?? 0) >= 4.8) badges.push("Highly rated");
  if ((latest.totalSales ?? 0) - (earliest.totalSales ?? 0) > 0 && allProspects.length > 1) {
    badges.push("Growing");
  }
  if ((latest.avgSellingRatio ?? 0) > 20) badges.push("High sell-through");

  return NextResponse.json({
    shop: {
      shopExternalId,
      shopName: latest.shopName,
      shopUrl: latest.shopUrl,
      shopIconUrl: latest.shopIconUrl,
      shopAgeMonths: latest.shopAgeMonths,
      reviewCount: latest.reviewCount,
      reviewAverage: latest.reviewAverage,
      activeListings: latest.activeListings,
      totalSales: latest.totalSales,
      numFavorers: latest.numFavorers,
      avgSellingRatio: latest.avgSellingRatio,
      estDailySales: latest.estDailySales,
      badges,
    },
    keywords,
    listings: listings.map((l) => ({
      listingExternalId: l.listingExternalId,
      listingTitle: l.listingTitle,
      listingUrl: l.listingUrl,
      listingImageUrl: l.listingImageUrl,
      price: l.price,
      lastSeenAt: l.createdAt,
    })),
    watch: watch
      ? {
          isActive: watch.isActive,
          startedAt: watch.createdAt,
          snapshots: watch.snapshots.map((s: (typeof watch.snapshots)[number]) => ({
            capturedAt: s.capturedAt,
            totalSales: s.totalSales,
            reviewCount: s.reviewCount,
            activeListings: s.activeListings,
          })),
        }
      : null,
  });
}
