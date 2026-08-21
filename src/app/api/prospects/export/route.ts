import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { evaluateCanonicalOpportunity } from "@/services/intelligence/canonical-opportunity";
import type { MarketplaceId } from "@/marketplaces/core/types";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  if (!session || !organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const searchConfigId = url.searchParams.get("searchConfigId") || undefined;
  const keyword = url.searchParams.get("keyword") || undefined;
  const isFavorite = url.searchParams.get("favorite") === "1" ? true : undefined;

  const prospects = await prisma.prospect.findMany({
    where: {
      organizationId,
      searchConfigId,
      keyword: keyword ? { contains: keyword, mode: "insensitive" } : undefined,
      isFavorite,
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const headers = [
    "Listing Title",
    "Price (USD)",
    "Est Daily Sales",
    "Observed Total Sales",
    "Review Count",
    "Rating",
    "Shop Name",
    "Shop Age (Months)",
    "Discovered Niche",
    "Opportunity Score",
    "Demand Signal",
    "Competition Signal",
    "Why It Wins",
    "Listing URL",
    "Discovered At",
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = prospects.map((p) => {
    const marketplace = (p.marketplace?.toLowerCase() as MarketplaceId) || "etsy";
    const canonical = evaluateCanonicalOpportunity({
      marketplace,
      price: {
        value: p.price,
        availability: p.price !== null ? "OBSERVED" : "UNAVAILABLE",
        provenance: p.price !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
        source: "etsy_listing_price",
      },
      estDailySales: {
        value: p.estDailySales && p.estDailySales > 0 ? p.estDailySales : null,
        availability: p.estDailySales && p.estDailySales > 0 ? "ESTIMATED" : "UNAVAILABLE",
        provenance: p.estDailySales && p.estDailySales > 0 ? "ESTIMATED" : "UNAVAILABLE",
        source: "etsy_transaction_velocity",
      },
      shopReviewCount: {
        value: p.reviewCount,
        availability: p.reviewCount !== null ? "OBSERVED" : "UNAVAILABLE",
        provenance: p.reviewCount !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
        source: "etsy_shop_review_count",
      },
      listingAgeDays: {
        value: Math.max(1, Math.round((Date.now() - new Date(p.createdAt).getTime()) / (24 * 3600 * 1000))),
        availability: "OBSERVED",
        provenance: "ACTUAL_DATA",
        source: "prospect_created_at",
      },
      numFavorers: {
        value: p.numFavorers,
        availability: p.numFavorers !== null ? "OBSERVED" : "UNAVAILABLE",
        provenance: p.numFavorers !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
        source: "etsy_num_favorers",
      },
    });

    const score = canonical.overallScore !== null ? canonical.overallScore : "—";
    const demandSignal = canonical.signalBreakdown.velocity?.explanation || canonical.signalBreakdown.velocity?.name || "Estimated Demand";
    const competitionSignal = canonical.signalBreakdown.competition?.explanation || canonical.signalBreakdown.competition?.name || "Market Competition";
    const whyItWins = canonical.explanation.whyThisScore || canonical.summary || `Opportunity score: ${score}/100`;

    return [
      escapeCsv(p.listingTitle),
      p.price !== null ? p.price.toFixed(2) : "Unavailable",
      (p.estDailySales ?? 0).toFixed(1),
      p.totalSales ?? 0,
      p.reviewCount ?? "Unavailable",
      p.reviewAverage?.toFixed(1) ?? "—",
      escapeCsv(p.shopName),
      p.shopAgeMonths !== null ? Math.round(p.shopAgeMonths) : "Unavailable",
      escapeCsv(p.keyword),
      score,
      escapeCsv(demandSignal),
      escapeCsv(competitionSignal),
      escapeCsv(whyItWins),
      escapeCsv(p.listingUrl),
      escapeCsv(p.createdAt.toISOString()),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const filename = `sellersalt_prospects_${keyword ? keyword.replace(/\s+/g, "_") : "export"}_${Date.now()}.csv`;

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
