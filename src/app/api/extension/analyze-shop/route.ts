import { NextResponse } from "next/server";
import { extractBearerToken, resolveExtensionSessionToken } from "@/lib/extension-pairing";
import { getOrgPackage } from "@/lib/plan-limits";
import type { PlanTierKey } from "@/services/plans/plan-capabilities";
import { getCompetitorNextAction } from "@/services/intelligence/next-best-action";
import type { ExtensionAnalyzeShopRequest, ExtensionAnalyzeShopResponse } from "@/services/extension/contract";

export async function POST(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const identity = await resolveExtensionSessionToken(token);
  if (!identity) {
    return NextResponse.json({ error: "Session token is invalid or expired." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as ExtensionAnalyzeShopRequest;
  const { shopName, activeListingsCount = 45, reviewCount = 120, totalSales = 3400, shopAgeMonths = 18 } = body;

  if (!shopName) {
    return NextResponse.json({ error: "Shop name is required for shop analysis." }, { status: 400 });
  }

  const pkg = await getOrgPackage(identity.organizationId);
  const tierKey = (pkg.key as PlanTierKey) || "STARTED";

  // Deterministic server calculations
  const estDailySales = Math.max(0.5, totalSales / (shopAgeMonths * 30.44));
  const estMonthlyRevenue = Math.round(estDailySales * 30.44 * 32.0); // avg price $32
  const catalogYield = activeListingsCount > 0 ? Math.round((totalSales / activeListingsCount) * 10) / 10 : 0;
  const reviewMoatDays = Math.round(reviewCount / Math.max(0.1, estDailySales * 0.1));

  // Score 0-100
  const shopScore = Math.min(98, Math.max(20, Math.round(catalogYield * 1.5 + estDailySales * 8 + (reviewCount / 20))));

  const nba = getCompetitorNextAction({
    shopName,
    salesGrowth7dPercent: 18,
    newListingCount: 2,
  });

  const response: ExtensionAnalyzeShopResponse = {
    shopScore,
    estDailySales,
    estMonthlyRevenue,
    catalogYield,
    salesVelocityTrend: estDailySales >= 5 ? "ACCELERATING" : "STEADY",
    reviewMoatDays,
    isTrackedInSpy: false,
    winningListingHighlights: [
      { title: `Top Selling Item in ${shopName}`, estDailySales: Math.round(estDailySales * 0.4 * 10) / 10, price: 34.0 },
      { title: `Trending Release in ${shopName}`, estDailySales: Math.round(estDailySales * 0.25 * 10) / 10, price: 28.0 },
    ],
    provenance: "SELLERSALT_SCORE",
    planAccess: {
      currentTier: tierKey,
      canTrackMoreShops: true,
    },
    nextBestAction: nba,
  };

  return NextResponse.json(response);
}
