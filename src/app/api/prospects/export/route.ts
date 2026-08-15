import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeProductWinningSignals } from "@/services/intelligence/winning-signals";

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
    const signals = computeProductWinningSignals({
      estDailySales: p.estDailySales,
      totalSales: p.totalSales,
      activeListings: p.activeListings,
      reviewCount: p.reviewCount,
      reviewAverage: p.reviewAverage,
      price: p.price,
      shopAgeMonths: p.shopAgeMonths,
    });

    return [
      escapeCsv(p.listingTitle),
      p.price.toFixed(2),
      (p.estDailySales ?? 0).toFixed(1),
      p.totalSales ?? 0,
      p.reviewCount,
      p.reviewAverage?.toFixed(1) ?? "5.0",
      escapeCsv(p.shopName),
      Math.round(p.shopAgeMonths),
      escapeCsv(p.keyword),
      signals.opportunityScore,
      signals.demandSignal,
      signals.competitionSignal,
      escapeCsv(signals.whyItWins),
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
