import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AutonomousDiscoveryEngine } from "@/services/intelligence/autonomous-discovery-engine";
import type { MarketplaceId } from "@/marketplaces/core/types";
import type {
  AutonomousOpportunityType,
  OpportunityRankingMode,
} from "@/marketplaces/core/autonomous-discovery-types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const marketplace = searchParams.get("marketplace") as MarketplaceId | null;
  const category = searchParams.get("category") || undefined;
  const type = searchParams.get("type") as AutonomousOpportunityType | null;
  const rankingMode = (searchParams.get("ranking") || "BEST_OPPORTUNITIES") as OpportunityRankingMode;
  const minScore = searchParams.get("minScore") ? Number(searchParams.get("minScore")) : undefined;
  const minConfidence = searchParams.get("minConfidence") ? Number(searchParams.get("minConfidence")) : undefined;
  const depth = (searchParams.get("depth") || "STANDARD") as "QUICK" | "STANDARD" | "DEEP";

  try {
    const result = await AutonomousDiscoveryEngine.execute({
      organizationId: session.user.organizationId,
      marketplaces: marketplace ? [marketplace] : undefined,
      category,
      opportunityType: type || undefined,
      rankingMode,
      minScore,
      minConfidence,
      depth,
      limit: 30,
    });

    return NextResponse.json({
      opportunities: result.opportunities,
      productIdeas: result.productIdeas,
      pulse: result.radarFeed.pulse,
      totalCount: result.opportunities.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}
