import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchMarketplaceProducts } from "@/services/product-hunting";
import type { EtsySearchFilters } from "@/types/product-hunting";
import type { MarketplaceId } from "@/marketplaces/core/types";

function resolveMarketplace(raw: string | null): MarketplaceId {
  const supported: MarketplaceId[] = ["etsy", "shopify", "woocommerce", "amazon", "ebay", "tiktok_shop"];
  return supported.includes(raw as MarketplaceId) ? (raw as MarketplaceId) : "etsy";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const filters: EtsySearchFilters = {
      keywords: typeof body.keywords === "string" ? body.keywords.trim() : undefined,
      taxonomyId: typeof body.taxonomyId === "number" ? body.taxonomyId : undefined,
      minPrice: typeof body.minPrice === "number" ? body.minPrice : undefined,
      maxPrice: typeof body.maxPrice === "number" ? body.maxPrice : undefined,
      shopLocation: typeof body.shopLocation === "string" ? body.shopLocation.trim() : undefined,
      sortOn: ["created", "price", "score"].includes(body.sortOn) ? body.sortOn : "score",
      sortOrder: ["asc", "desc"].includes(body.sortOrder) ? body.sortOrder : "desc",
      limit: typeof body.limit === "number" ? Math.min(50, Math.max(1, body.limit)) : 25,
      page: typeof body.page === "number" ? Math.max(1, body.page) : 1,
    };

    const marketplace = resolveMarketplace(body.marketplace ?? null);
    const response = await searchMarketplaceProducts(marketplace, organizationId, filters);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[ProductSearchError]", error);
    const statusCode = error.statusCode || (error.message?.includes("credentials") ? 400 : 500);
    return NextResponse.json(
      {
        error: error.message || "Failed to search Etsy marketplace",
        isRetryable: error.isRetryable ?? false,
      },
      { status: statusCode }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const filters: EtsySearchFilters = {
      keywords: searchParams.get("keywords") || undefined,
      taxonomyId: searchParams.get("taxonomyId") ? Number(searchParams.get("taxonomyId")) : undefined,
      minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
      maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
      shopLocation: searchParams.get("shopLocation") || undefined,
      sortOn: (searchParams.get("sortOn") as any) || "score",
      sortOrder: (searchParams.get("sortOrder") as any) || "desc",
      limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 25,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    };

    const marketplace = resolveMarketplace(searchParams.get("marketplace"));
    const response = await searchMarketplaceProducts(marketplace, organizationId, filters);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[ProductSearchGetError]", error);
    const statusCode = error.statusCode || (error.message?.includes("credentials") ? 400 : 500);
    return NextResponse.json(
      {
        error: error.message || "Failed to search Etsy marketplace",
      },
      { status: statusCode }
    );
  }
}
