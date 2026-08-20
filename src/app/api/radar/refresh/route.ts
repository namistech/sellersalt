import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AutonomousDiscoveryEngine } from "@/services/intelligence/autonomous-discovery-engine";
import type { MarketplaceId } from "@/marketplaces/core/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const marketplace = (body.marketplace || "all") as MarketplaceId | "all";
    const category = body.category || undefined;

    const discoveryResult = await AutonomousDiscoveryEngine.execute({
      organizationId: session.user.organizationId,
      marketplaces: marketplace === "all" ? ["etsy", "amazon", "ebay", "walmart"] : [marketplace],
      category,
      depth: "DEEP",
      generateProductIdeas: true,
      limit: 40,
    });

    return NextResponse.json(discoveryResult.radarFeed);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to refresh Opportunity Radar" },
      { status: 500 }
    );
  }
}
