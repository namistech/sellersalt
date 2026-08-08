import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";

// Long-tail phrase extraction: Etsy sellers commonly separate keyword phrases
// with |, commas, or dashes in listing titles (e.g. "Cheer Coach Binder |
// Cheer Coach Planner | Practice Planner"). Splitting on those delimiters
// pulls out the seller's own intended search phrases directly — a better,
// more honest signal than generating artificial word n-grams. Single-word
// fragments are dropped; only genuine multi-word phrases are kept.
function extractLongTailTerms(titles: string[], limit = 20): Array<{ term: string; count: number }> {
  const counts = new Map<string, { display: string; count: number }>();
  for (const title of titles) {
    const segments = title.split(/[|,\-–—/]/);
    for (const raw of segments) {
      const cleaned = raw.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
      if (!cleaned) continue;
      const wordCount = cleaned.split(" ").length;
      if (wordCount < 2) continue; // long-tail only, no single words
      const key = cleaned.toLowerCase();
      const existing = counts.get(key);
      if (existing) existing.count++;
      else counts.set(key, { display: cleaned, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((v) => ({ term: v.display, count: v.count }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ shopExternalId: string }> }) {
  const { shopExternalId } = await params;
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await getActiveConnectorWithCredentials(organizationId);
  if (!active || !active.connector.getShopStats) {
    return NextResponse.json({ error: "No active connector on this workspace." }, { status: 400 });
  }

  const liveStats = await active.connector.getShopStats(active.credentials, shopExternalId);
  if (!liveStats) {
    return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  }

  // Historical data (if any) — used for badges/trend context, not required for
  // the page to work. A shop pasted cold via "Spy on Competitor" will have none.
  const historicalProspects = await prisma.prospect.findMany({
    where: { organizationId, shopExternalId },
    orderBy: { createdAt: "asc" },
  });

  const topListings = active.connector.getShopTopListings
    ? await active.connector.getShopTopListings(active.credentials, shopExternalId, 12)
    : [];

  const titlesForKeywords = [
    ...historicalProspects.map((p: (typeof historicalProspects)[number]) => p.listingTitle),
    ...topListings.map((l) => l.title),
  ];
  const keywords = extractLongTailTerms(titlesForKeywords);

  const watch = await prisma.shopWatch.findUnique({
    where: { organizationId_shopExternalId: { organizationId, shopExternalId } },
    include: { snapshots: { orderBy: { capturedAt: "asc" } } },
  });

  const avgSellingRatio = liveStats.activeListings
    ? Math.round(((liveStats.totalSales ?? 0) / liveStats.activeListings) * 100) / 100
    : 0;
  const estDailySales = liveStats.shopAgeMonths
    ? Math.round(((liveStats.totalSales ?? 0) / (liveStats.shopAgeMonths * 30.44)) * 100) / 100
    : 0;

  const badges: string[] = [];
  if (liveStats.shopAgeMonths < 12) badges.push("New shop");
  if ((liveStats.reviewAverage ?? 0) >= 4.8) badges.push("Highly rated");
  if (historicalProspects.length > 1) {
    const earliest = historicalProspects[0];
    if ((liveStats.totalSales ?? 0) - (earliest.totalSales ?? 0) > 0) badges.push("Growing");
  }
  if (avgSellingRatio > 20) badges.push("High sell-through");

  return NextResponse.json({
    shop: {
      shopExternalId,
      shopName: liveStats.shopName,
      shopUrl: liveStats.shopUrl,
      shopIconUrl: liveStats.shopIconUrl,
      shopBannerUrl: liveStats.shopBannerUrl,
      shopAgeMonths: liveStats.shopAgeMonths,
      reviewCount: liveStats.reviewCount,
      reviewAverage: liveStats.reviewAverage,
      activeListings: liveStats.activeListings,
      totalSales: liveStats.totalSales,
      numFavorers: liveStats.numFavorers,
      avgSellingRatio,
      estDailySales,
      badges,
    },
    keywords,
    topListings,
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
