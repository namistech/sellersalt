import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreTotalSales, scoreReviewCount, scoreEstDailySales, overallCompetitionRating, levelMeta } from "@/lib/competition-scoring";

type MatchMode = "contains" | "exact" | "starts" | "ends";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const match = (url.searchParams.get("match") || "contains") as MatchMode;
  const wordFilter = url.searchParams.get("words"); // "1" | "2" | "3" | "4plus" | null

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  // Real Etsy-derived terms only — pulled from this org's own discovered
  // research data (Prospect rows), never generated/guessed. Capped so a
  // broad query on a large research dataset doesn't blow up memory; this
  // is an in-memory aggregation rather than a SQL GROUP BY because the
  // per-org dataset size doesn't warrant the complexity, and averaging
  // derived fields (competition rating) is easiest done in JS.
  const rows = await prisma.prospect.findMany({
    where: { organizationId },
    select: {
      keyword: true,
      listingUrl: true,
      listingTitle: true,
      price: true,
      totalSales: true,
      reviewCount: true,
      estDailySales: true,
      numFavorers: true,
      shopExternalId: true,
      shopName: true,
    },
    take: 5000,
  });

  const byKeyword = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.keyword) continue;
    const kw = r.keyword;
    const kwLower = kw.toLowerCase();

    let matches: boolean;
    switch (match) {
      case "exact":
        matches = kwLower === q;
        break;
      case "starts":
        matches = kwLower.startsWith(q);
        break;
      case "ends":
        matches = kwLower.endsWith(q);
        break;
      default:
        matches = kwLower.includes(q);
    }
    if (!matches) continue;

    const wordCount = kw.trim().split(/\s+/).length;
    if (wordFilter === "1" && wordCount !== 1) continue;
    if (wordFilter === "2" && wordCount !== 2) continue;
    if (wordFilter === "3" && wordCount !== 3) continue;
    if (wordFilter === "4plus" && wordCount < 4) continue;

    const bucket = byKeyword.get(kw) ?? [];
    bucket.push(r);
    byKeyword.set(kw, bucket);
  }

  const results = Array.from(byKeyword.entries())
    .map(([keyword, listings]) => {
      const n = listings.length;
      const priceListings = listings.filter((l) => typeof l.price === "number");
      const avgPrice = priceListings.length > 0 ? priceListings.reduce((s, l) => s + l.price!, 0) / priceListings.length : 0;

      const reviewListings = listings.filter((l) => typeof l.reviewCount === "number");
      const avgReviewCount = reviewListings.length > 0 ? reviewListings.reduce((s, l) => s + l.reviewCount!, 0) / reviewListings.length : 0;

      const salesListings = listings.filter((l) => typeof l.totalSales === "number");
      const avgTotalSales = salesListings.length > 0 ? salesListings.reduce((s, l) => s + l.totalSales!, 0) / salesListings.length : 0;

      const dailyListings = listings.filter((l) => typeof l.estDailySales === "number");
      const avgEstDaily = dailyListings.length > 0 ? dailyListings.reduce((s, l) => s + l.estDailySales!, 0) / dailyListings.length : 0;

      const favorerListings = listings.filter((l) => typeof l.numFavorers === "number");
      const avgFavorers = favorerListings.length > 0 ? favorerListings.reduce((s, l) => s + l.numFavorers!, 0) / favorerListings.length : 0;

      const competitionLevel = overallCompetitionRating([
        scoreTotalSales(avgTotalSales),
        scoreReviewCount(avgReviewCount),
        scoreEstDailySales(avgEstDaily),
      ]);

      const evidence = listings[0]!;
      const uniqueShops = new Set(listings.map((l) => l.shopExternalId)).size;

      return {
        keyword,
        wordCount: keyword.trim().split(/\s+/).length,
        listingCount: n,
        uniqueShopCount: uniqueShops,
        avgPrice: Math.round(avgPrice * 100) / 100,
        avgEstDailySales: Math.round(avgEstDaily * 10) / 10,
        // Etsy doesn't expose real search volume — this is an explicit
        // estimate (avg favorites across matching listings), never
        // presented as an actual search-volume figure.
        estimatedDemandSignal: Math.round(avgFavorers),
        competitionLevel,
        competitionLabel: levelMeta(competitionLevel).label,
        evidenceListingUrl: evidence.listingUrl,
        evidenceListingTitle: evidence.listingTitle,
        evidenceShopName: evidence.shopName,
      };
    })
    .sort((a, b) => b.listingCount - a.listingCount)
    .slice(0, 200);

  return NextResponse.json({ results });
}
