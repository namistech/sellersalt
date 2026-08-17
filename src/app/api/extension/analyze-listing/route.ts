import { NextResponse } from "next/server";
import { extractBearerToken, resolveExtensionSessionToken } from "@/lib/extension-pairing";
import { getOrgPackage } from "@/lib/plan-limits";
import type { PlanTierKey } from "@/services/plans/plan-capabilities";
import { auditListingSeo } from "@/services/seo-engine";
import { calculateCanonicalScore, calculateUnitEconomics } from "@/services/opportunity-memory";
import { getProductNextAction } from "@/services/intelligence/next-best-action";
import type { ExtensionAnalyzeListingRequest, ExtensionAnalyzeListingResponse } from "@/services/extension/contract";

export async function POST(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const identity = await resolveExtensionSessionToken(token);
  if (!identity) {
    return NextResponse.json({ error: "Session token is invalid or expired." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as ExtensionAnalyzeListingRequest;
  const { listingId, title, price, tags = [], description = "", shopAgeMonths = 12, shopReviewCount = 35, shopTotalSales = 450 } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required for listing analysis." }, { status: 400 });
  }

  const pkg = await getOrgPackage(identity.organizationId);
  const tierKey = (pkg.key as PlanTierKey) || "STARTED";

  // Deterministic server calculations
  const estDailySales = Math.max(0.5, shopTotalSales / (shopAgeMonths * 30.44));
  const activeListings = 40;
  
  const scoring = calculateCanonicalScore({
    estDailySales,
    activeListings,
    totalSales: shopTotalSales,
    reviewCount: shopReviewCount,
    shopAgeMonths,
    discoveredAt: new Date(),
  });

  const economics = calculateUnitEconomics(price || 25);
  const seoAudit = auditListingSeo({ title, tags, description });

  const nba = getProductNextAction({
    opportunityScore: scoring.score,
    estDailySales,
    shopReviewCount,
    price: economics.price,
    isShortlisted: false,
  });

  const response: ExtensionAnalyzeListingResponse = {
    opportunityScore: scoring.score,
    confidenceScore: 90,
    classification: scoring.classification as ExtensionAnalyzeListingResponse["classification"],
    classificationLabel: scoring.classificationLabel,
    demand: {
      estDailySales,
      estMonthlySales: Math.round(estDailySales * 30.44),
      estMonthlyRevenue: Math.round(estDailySales * 30.44 * economics.price),
      salesVelocityTrend: estDailySales >= 4 ? "ACCELERATING" : "STEADY",
    },
    competition: {
      reviewCount: shopReviewCount,
      activeListings,
      barrierLevel: activeListings <= 150 && shopReviewCount <= 100 ? "LOW" : "MODERATE",
    },
    economics: {
      price: economics.price,
      estCogs: economics.estCogs,
      estNetProfit: economics.estNetProfit,
      marginPercent: economics.marginPercent,
    },
    seoScore: seoAudit.overallScore,
    tagCount: tags.length,
    tagSlotsRemaining: Math.max(0, 13 - tags.length),
    isSavedToPlanner: false,
    provenance: "SELLERSALT_SCORE",
    planAccess: {
      currentTier: tierKey,
      isFullAccess: true,
    },
    nextBestAction: nba,
  };

  return NextResponse.json(response);
}
