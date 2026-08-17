import { NextResponse } from "next/server";
import { extractBearerToken, resolveExtensionSessionToken } from "@/lib/extension-pairing";
import { getOrgPackage } from "@/lib/plan-limits";
import type { PlanTierKey } from "@/services/plans/plan-capabilities";
import { calculateCanonicalScore } from "@/services/opportunity-memory";
import type { ExtensionScanSearchRequest, ExtensionScanSearchResponse } from "@/services/extension/contract";

export async function POST(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const identity = await resolveExtensionSessionToken(token);
  if (!identity) {
    return NextResponse.json({ error: "Session token is invalid or expired." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as ExtensionScanSearchRequest;
  const { searchQuery = "", items = [] } = body;

  const pkg = await getOrgPackage(identity.organizationId);
  const tierKey = (pkg.key as PlanTierKey) || "FREE";

  // Freemium partial access limits (Batch 18 Section 12)
  const isFree = tierKey === "FREE";
  const unlockedCount = isFree ? Math.min(items.length, 5) : items.length;
  const activeItems = items.slice(0, unlockedCount);

  const totalPrice = activeItems.reduce((acc, it) => acc + (it.price || 0), 0);
  const averagePrice = activeItems.length > 0 ? Math.round((totalPrice / activeItems.length) * 100) / 100 : 0;

  const breakoutItems = activeItems.map((it) => {
    const estDailySales = Math.max(1.0, Math.round(((it.reviewCount || 10) / 15) * 10) / 10);
    const scoring = calculateCanonicalScore({
      estDailySales,
      activeListings: 45,
      totalSales: (it.reviewCount || 10) * 12,
      reviewCount: it.reviewCount || 10,
      shopAgeMonths: 14,
      discoveredAt: new Date(),
    });

    return {
      listingId: it.listingId,
      title: it.title,
      price: it.price,
      opportunityScore: scoring.score,
      estDailySales,
      reason: scoring.reason,
    };
  });

  const response: ExtensionScanSearchResponse = {
    searchQuery,
    totalScanned: items.length,
    averagePrice,
    topOpportunitiesCount: breakoutItems.filter((b) => b.opportunityScore >= 75).length,
    breakoutItems,
    suggestedLongTailKeywords: [
      `${searchQuery} gift`,
      `personalized ${searchQuery}`,
      `handmade ${searchQuery} custom`,
      `${searchQuery} aesthetic`,
    ],
    provenance: "SELLERSALT_SCORE",
    planAccess: {
      currentTier: tierKey,
      resultsUnlocked: unlockedCount,
      totalResultsAvailable: items.length,
      upgradeBanner: isFree && items.length > unlockedCount
        ? `Showing ${unlockedCount} of ${items.length} search results (Free tier). Upgrade to Growth & Pro for full scanning depth.`
        : undefined,
    },
  };

  return NextResponse.json(response);
}
