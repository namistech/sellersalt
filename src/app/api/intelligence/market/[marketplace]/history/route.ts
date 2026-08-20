import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContinuousMarketMemoryEngine } from "@/services/intelligence/continuous-market-memory";
import type { MarketplaceId } from "@/marketplaces/core/types";

interface RouteParams {
  params: Promise<{ marketplace: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { marketplace } = await params;
  const searchParams = req.nextUrl.searchParams;
  const key = searchParams.get("key") || "overview";

  try {
    const history = ContinuousMarketMemoryEngine.getSnapshotHistory(
      key,
      marketplace as MarketplaceId | "all",
      20
    );

    return NextResponse.json({
      marketplace,
      key,
      count: history.length,
      history,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch market history" },
      { status: 500 }
    );
  }
}
