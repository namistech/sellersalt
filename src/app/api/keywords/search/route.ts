import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchMarketplaceKeywordResearch, fetchAllMarketplaceKeywordResearch } from "@/services/keyword-research";
import type { KeywordSearchRequest } from "@/types/keyword-research";
import type { MarketplaceId } from "@/marketplaces/core/types";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";

const SUPPORTED: MarketplaceId[] = ["etsy", "shopify", "woocommerce", "amazon", "ebay", "tiktok_shop"];

function resolveMarketplace(raw: unknown): MarketplaceId {
  return SUPPORTED.includes(raw as MarketplaceId) ? (raw as MarketplaceId) : "etsy";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as KeywordSearchRequest;

    if (!body.query || typeof body.query !== "string" || !body.query.trim()) {
      return NextResponse.json({ error: "Query keyword is required." }, { status: 400 });
    }

    const rawMarketplace = (body as any).marketplace;
    const request: KeywordSearchRequest = {
      query: body.query.trim(),
      limit: body.limit || 50,
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
      categoryTaxonomyId: body.categoryTaxonomyId,
    };

    if (rawMarketplace === "all") {
      registerAllConnectors();
      const marketplaces = MarketplaceRegistry.list().map((c) => c.marketplace);
      const results = await fetchAllMarketplaceKeywordResearch(marketplaces, organizationId, request);
      return NextResponse.json({ results });
    }

    const marketplace = resolveMarketplace(rawMarketplace);
    const response = await fetchMarketplaceKeywordResearch(marketplace, organizationId, request);

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Keyword search failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute standalone keyword research" },
      { status: 500 }
    );
  }
}
