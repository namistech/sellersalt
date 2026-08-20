import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MarketGraphEngine } from "@/services/intelligence/market-graph-engine";
import { LongitudinalIntelligenceEngine } from "@/marketplaces/core/acquisition/longitudinal";
import { GraphConfidenceEngine } from "@/services/intelligence/graph-confidence";
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
    const node = MarketGraphEngine.getNode(decodedId);
    
    // Extract marketplace and external ID if format is "prod:marketplace:externalId"
    const parts = decodedId.split(":");
    const marketplace = (parts.length >= 3 ? parts[1] : "etsy") as MarketplaceId;
    const externalId = parts.length >= 3 ? parts.slice(2).join(":") : decodedId;

    const longitudinal = await LongitudinalIntelligenceEngine.evaluateProduct(
      externalId,
      marketplace,
      session.user.organizationId
    );

    const confidence = GraphConfidenceEngine.evaluateConfidence({
      observationCount: longitudinal.observationCount || (node ? node.observationCount : 1),
      daysObserved: longitudinal.daysObserved,
      hasPrice: node ? (node as any).price !== null : true,
      hasRating: node ? (node as any).rating !== null : false,
      hasReviews: node ? (node as any).reviewCount !== null : false,
      hasSeller: node ? (node as any).sellerName !== null : false,
    });

    const relationships = MarketGraphEngine.getRelationships(decodedId, "both");

    return NextResponse.json({
      product: node || {
        id: decodedId,
        entityType: "PRODUCT",
        marketplace,
        externalId,
        title: externalId,
      },
      longitudinal,
      confidence,
      relationshipsCount: relationships.length,
      relationships,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch product intelligence" },
      { status: 500 }
    );
  }
}
