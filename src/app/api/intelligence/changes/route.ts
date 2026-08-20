import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContinuousMarketMemoryEngine } from "@/services/intelligence/continuous-market-memory";
import { MarketChangeDetectionEngine } from "@/services/intelligence/market-change-detection";
import type { MarketplaceId } from "@/marketplaces/core/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const key = searchParams.get("key") || "overview";
  const marketplace = (searchParams.get("marketplace") || "all") as MarketplaceId | "all";

  try {
    const history = ContinuousMarketMemoryEngine.getSnapshotHistory(key, marketplace, 2);
    const current = history.length > 0 ? history[0] : null;
    const previous = history.length > 1 ? history[1] : null;

    if (!current) {
      return NextResponse.json({
        hasPreviousComparison: false,
        message: "No snapshots available for the requested key.",
      });
    }

    const report = MarketChangeDetectionEngine.compareSnapshots(current, previous);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to compute market changes" },
      { status: 500 }
    );
  }
}
