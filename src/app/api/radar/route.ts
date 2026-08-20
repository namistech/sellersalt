import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AutonomousDiscoveryEngine } from "@/services/intelligence/autonomous-discovery-engine";
import type { MarketplaceId } from "@/marketplaces/core/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const marketplace = (searchParams.get("marketplace") || "all") as MarketplaceId | "all";
  const category = searchParams.get("category") || undefined;

  try {
    const discoveryResult = await AutonomousDiscoveryEngine.execute({
      organizationId: session.user.organizationId,
      marketplaces: marketplace === "all" ? ["etsy", "amazon", "ebay", "walmart"] : [marketplace],
      category,
      depth: "STANDARD",
      generateProductIdeas: true,
      limit: 30,
    });

    return NextResponse.json(discoveryResult.radarFeed);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch Opportunity Radar feed" },
      { status: 500 }
    );
  }
}
