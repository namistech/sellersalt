import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchMarketplaceProducts } from "@/services/product-hunting";
import type { EtsySearchFilters } from "@/types/product-hunting";
import type { MarketplaceId } from "@/marketplaces/core/types";
import { checkQuota } from "@/services/plans/quota-enforcement";

function resolveMarketplace(raw: string | null): MarketplaceId {
  const supported: MarketplaceId[] = ["etsy", "shopify", "woocommerce", "amazon", "ebay", "tiktok_shop", "walmart"];
  return supported.includes(raw as MarketplaceId) ? (raw as MarketplaceId) : "etsy";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = (session?.user as any)?.organizationId as string | undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quota = await checkQuota(organizationId, "PRODUCT_RESEARCH");
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.upgradeMessage }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const filters: EtsySearchFilters = {
      keywords: typeof body.keywords === "string" ? body.keywords.trim() : undefined,
      keywordList: Array.isArray(body.keywordList)
        ? body.keywordList.filter((k: unknown): k is string => typeof k === "string" && k.trim().length > 0)
        : undefined,
      taxonomyId: typeof body.taxonomyId === "number" ? body.taxonomyId : undefined,
      minPrice: typeof body.minPrice === "number" ? body.minPrice : undefined,
      maxPrice: typeof body.maxPrice === "number" ? body.maxPrice : undefined,
      minReviews: typeof body.minReviews === "number" ? body.minReviews : undefined,
      maxReviews: typeof body.maxReviews === "number" ? body.maxReviews : undefined,
      minRating: typeof body.minRating === "number" ? body.minRating : undefined,
      maxRating: typeof body.maxRating === "number" ? body.maxRating : undefined,
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

    const quota = await checkQuota(organizationId, "PRODUCT_RESEARCH");
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.upgradeMessage }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const keywordListParam = searchParams.get("keywordList");
    const filters: EtsySearchFilters = {
      keywords: searchParams.get("keywords") || undefined,
      keywordList: keywordListParam
        ? keywordListParam.split(",").map((k) => k.trim()).filter(Boolean)
        : undefined,
      taxonomyId: searchParams.get("taxonomyId") ? Number(searchParams.get("taxonomyId")) : undefined,
      minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
      maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
      minReviews: searchParams.get("minReviews") ? Number(searchParams.get("minReviews")) : undefined,
      maxReviews: searchParams.get("maxReviews") ? Number(searchParams.get("maxReviews")) : undefined,
      minRating: searchParams.get("minRating") ? Number(searchParams.get("minRating")) : undefined,
      maxRating: searchParams.get("maxRating") ? Number(searchParams.get("maxRating")) : undefined,
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
