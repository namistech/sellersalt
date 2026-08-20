import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OpportunityDiscoveryEngine } from "@/services/intelligence/opportunity-discovery-engine";
import type { OpportunityType, MomentumState } from "@/marketplaces/core/discovery-types";
import type { MarketplaceId } from "@/marketplaces/core/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "popular items";
  const marketplace = (searchParams.get("marketplace") || "all") as MarketplaceId | "all";
  const typeParam = searchParams.get("type");
  const types = typeParam ? (typeParam.split(",") as OpportunityType[]) : undefined;
  const minScore = searchParams.get("minScore") ? parseFloat(searchParams.get("minScore")!) : undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

  try {
    const discoveryRes = await OpportunityDiscoveryEngine.discover({
      query,
      marketplace,
      types,
      minScore,
      limit,
      organizationId: session.user.organizationId,
    });

    return NextResponse.json(discoveryRes);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}
