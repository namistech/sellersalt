import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LongitudinalIntelligenceEngine } from "@/marketplaces/core/acquisition/longitudinal";
import { OpportunityPersistenceEngine } from "@/services/intelligence/opportunity-persistence";
import type { MarketplaceId } from "@/marketplaces/core/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  try {
    const parts = decodedId.split(":");
    const marketplace = (parts.length >= 3 ? parts[1] : "etsy") as MarketplaceId;
    const externalId = parts.length >= 3 ? parts.slice(2).join(":") : decodedId;

    const longitudinal = await LongitudinalIntelligenceEngine.evaluateProduct(
      externalId,
      marketplace,
      session.user.organizationId
    );

    const persistence = OpportunityPersistenceEngine.evaluatePersistence({
      opportunityId: decodedId,
      targetTitle: externalId,
      marketplace,
      observations: longitudinal.snapshotsSummary.map((s) => ({
        observedAt: s.observedAt,
        score: s.price ? Math.min(95, Math.round(s.price * 2)) : 50,
        confidence: 80,
      })),
    });

    return NextResponse.json({
      productId: decodedId,
      marketplace,
      externalId,
      longitudinal,
      persistence,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch product history" },
      { status: 500 }
    );
  }
}
