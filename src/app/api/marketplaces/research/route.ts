import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runAllMarketplaceProductResearch } from "@/marketplaces/core/research-pipeline";
import { buildCrossMarketplaceComparison } from "@/services/intelligence/cross-marketplace-comparison";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import type { MarketplaceId } from "@/marketplaces/core/types";

const ALL_MARKETPLACE_IDS: MarketplaceId[] = ["etsy", "amazon", "ebay", "walmart", "tiktok_shop", "shopify", "woocommerce"];

/**
 * "ALL MARKETPLACES" product research — fans a single search intent out
 * across every registered marketplace connector in parallel and returns one
 * independently status-tagged result per marketplace (AVAILABLE / PARTIAL /
 * UNAVAILABLE / NOT_IMPLEMENTED) plus canonical cross-marketplace comparisons.
 * Never fabricates results for a marketplace whose connector can't serve the
 * request — see src/marketplaces/core/research-pipeline.ts's runAllMarketplaceProductResearch.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const keywords = typeof body.keywords === "string" && body.keywords.trim() ? [body.keywords.trim()] : undefined;

    registerAllConnectors();
    const requested: MarketplaceId[] = Array.isArray(body.marketplaces) && body.marketplaces.length
      ? body.marketplaces.filter((m: string) => ALL_MARKETPLACE_IDS.includes(m as MarketplaceId))
      : MarketplaceRegistry.listActive().map((c) => c.marketplace);

    const results = await runAllMarketplaceProductResearch(requested, {
      type: "products",
      organizationId,
      keywords,
      minPrice: typeof body.minPrice === "number" ? body.minPrice : undefined,
      maxPrice: typeof body.maxPrice === "number" ? body.maxPrice : undefined,
      limit: typeof body.limit === "number" ? body.limit : 25,
    });

    const comparison = buildCrossMarketplaceComparison(keywords?.[0], results);

    return NextResponse.json({ results, comparison });
  } catch (error: any) {
    console.error("[AllMarketplaceResearchError]", error);
    return NextResponse.json({ error: error.message || "Failed to run cross-marketplace research" }, { status: 500 });
  }
}
