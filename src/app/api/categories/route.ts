import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchMarketplaceCategoryTree, fetchAllMarketplaceCategoryTree, searchCategories } from "@/services/category-hunting";
import { checkMarketplaceCapability } from "@/marketplaces/core/availability";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import type { MarketplaceId } from "@/marketplaces/core/types";

const SUPPORTED: MarketplaceId[] = ["etsy", "shopify", "woocommerce", "amazon", "ebay", "tiktok_shop"];

function resolveMarketplace(raw: string | null): MarketplaceId {
  return SUPPORTED.includes(raw as MarketplaceId) ? (raw as MarketplaceId) : "etsy";
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("search") || searchParams.get("q") || "";
  const rawMarketplace = searchParams.get("marketplace");

  try {
    // "All Marketplaces" only applies to the category-tree view — a
    // free-text taxonomy search across every marketplace at once isn't a
    // meaningful request (each marketplace's tree is independent; there's
    // nothing to merge), so it's intentionally not supported here.
    if (rawMarketplace === "all" && !query.trim()) {
      registerAllConnectors();
      const marketplaces = MarketplaceRegistry.list().map((c) => c.marketplace);
      const results = await fetchAllMarketplaceCategoryTree(marketplaces, organizationId);
      return NextResponse.json({ results });
    }

    const marketplace = resolveMarketplace(rawMarketplace);

    if (query.trim()) {
      const unavailable = checkMarketplaceCapability(marketplace, "categoryTaxonomy");
      if (unavailable) return NextResponse.json(unavailable);

      const results = await searchCategories(organizationId, query.trim(), 30);
      return NextResponse.json({ results, total: results.length });
    }

    const result = await fetchMarketplaceCategoryTree(marketplace, organizationId);
    if (!("roots" in result)) {
      return NextResponse.json(result);
    }
    return NextResponse.json({ roots: result.roots, totalNodes: result.totalNodes });
  } catch (err: any) {
    console.error("Failed to load category taxonomy:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load category taxonomy" },
      { status: 500 }
    );
  }
}
