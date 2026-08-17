/**
 * SellerSalt Shop Intelligence & Reverse-Engineering Service
 * 
 * Provides deterministic 8-section shop intelligence profiling,
 * catalog yield analytics, long-tail tag frequency analysis, and
 * strategic reverse-engineering recommendations.
 */

import { prisma } from "@/lib/db";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { createEtsyClient } from "@/connectors/etsy";
import { computeShopWinningSignals } from "@/services/intelligence/winning-signals";
import { computeProductOpportunity } from "@/services/product-hunting";
import type {
  CompleteShopIntelligenceProfile,
  ShopIdentityOverview,
  ShopPerformanceKpis,
  CatalogYieldAnalysis,
  TagFrequencyItem,
  ShopWinningListing,
  StrategicShopVerdict,
  ShopSnapshotTrendPoint,
} from "@/types/shop-research";

// --------------------------------------------------------------------------
// Long-Tail Tag Frequency Analysis Algorithm
// --------------------------------------------------------------------------

export function extractLongTailTagFrequencies(
  listings: Array<{ title?: string; tags?: string[] }>,
  limit = 30
): TagFrequencyItem[] {
  if (!listings || listings.length === 0) return [];

  const counts = new Map<string, { display: string; count: number; wordCount: number }>();
  const totalListings = Math.max(1, listings.length);

  for (const item of listings) {
    const candidateTerms: string[] = [];

    // 1. Process explicit Etsy tags array (highest quality signal)
    if (Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        if (typeof tag === "string") candidateTerms.push(tag);
      }
    }

    // 2. Process delimited title segments (| , - / – —)
    if (typeof item.title === "string") {
      const segments = item.title.split(/[|,\-–—/]/);
      for (const seg of segments) {
        candidateTerms.push(seg);
      }
    }

    // Deduplicate candidate terms for this single listing so 1 listing cannot count 2x for same term
    const seenInThisListing = new Set<string>();

    for (const raw of candidateTerms) {
      const cleaned = raw
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!cleaned || cleaned.length < 3) continue;

      const words = cleaned.split(" ").filter(Boolean);
      const wordCount = words.length;

      // Filter out low-value generic stop words or single characters
      const key = cleaned.toLowerCase();
      if (seenInThisListing.has(key)) continue;
      seenInThisListing.add(key);

      const existing = counts.get(key);
      if (existing) {
        existing.count++;
      } else {
        // Form nice title case display
        const display = words
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        counts.set(key, { display, count: 1, wordCount });
      }
    }
  }

  return Array.from(counts.entries())
    .map(([_, data]) => ({
      tag: data.display,
      count: data.count,
      percentage: Math.round((data.count / totalListings) * 100),
      isLongTail: data.wordCount >= 2,
      wordCount: data.wordCount,
    }))
    .sort((a, b) => {
      // Prioritize higher count first, then long-tail multi-word terms
      if (b.count !== a.count) return b.count - a.count;
      return b.wordCount - a.wordCount;
    })
    .slice(0, limit);
}

// --------------------------------------------------------------------------
// Catalog Yield & Price Spread Calculator
// --------------------------------------------------------------------------

export function computeCatalogYield(
  listings: Array<{ price: number; taxonomyPath?: string; category?: string }>,
  totalSales: number,
  activeListings: number
): CatalogYieldAnalysis {
  const prices = listings.map((l) => l.price).filter((p) => typeof p === "number" && p > 0);

  let medianPrice = 18.0;
  let minPrice = 0;
  let maxPrice = 0;
  let priceSpread = 0;

  if (prices.length > 0) {
    const sorted = [...prices].sort((a, b) => a - b);
    minPrice = sorted[0];
    maxPrice = sorted[sorted.length - 1];
    priceSpread = Math.round((maxPrice - minPrice) * 100) / 100;

    const mid = Math.floor(sorted.length / 2);
    medianPrice =
      sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    medianPrice = Math.round(medianPrice * 100) / 100;
  }

  const yieldRatio = activeListings > 0 ? totalSales / activeListings : 0;
  const catalogEfficiency: CatalogYieldAnalysis["catalogEfficiency"] =
    yieldRatio >= 30 ? "HIGH_YIELD" : yieldRatio >= 10 ? "BALANCED" : "LOW_YIELD";

  // Category breakdown
  const categoryCounts = new Map<string, number>();
  for (const item of listings) {
    const rawCat = item.taxonomyPath || item.category || "General Products";
    const primaryCat = rawCat.split(">")[0].trim();
    categoryCounts.set(primaryCat, (categoryCounts.get(primaryCat) ?? 0) + 1);
  }

  const totalCatCount = Math.max(1, listings.length);
  const topCategories = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / totalCatCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    medianPrice,
    minPrice,
    maxPrice,
    priceSpread,
    catalogEfficiency,
    topCategories,
  };
}

// --------------------------------------------------------------------------
// Strategic Reverse-Engineering Verdict Generator
// --------------------------------------------------------------------------

export function computeStrategicShopVerdict(params: {
  opportunityScore: number;
  totalSales: number;
  activeListings: number;
  estDailySales: number;
  shopAgeMonths: number;
  reviewCount: number;
  avgObservedPrice: number;
}): StrategicShopVerdict {
  const {
    opportunityScore,
    totalSales,
    activeListings,
    estDailySales,
    shopAgeMonths,
    reviewCount,
    avgObservedPrice,
  } = params;

  const yieldRatio = activeListings > 0 ? totalSales / activeListings : 0;

  if (opportunityScore >= 75) {
    return {
      opportunityScore,
      verdictBadge: "EASY TO START",
      verdictLabel: "Breakout Emerging Winner",
      verdictColor: "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/30",
      summary: `Young shop (${Math.round(shopAgeMonths)} mos) generating exceptional daily velocity (${estDailySales.toFixed(1)} sales/day) with a lean ${activeListings}-listing catalog. Excellent benchmark for rapid market entry.`,
      whyInteresting: `High catalog efficiency (${yieldRatio.toFixed(1)} sales/listing) combined with low review saturation (${reviewCount} reviews). Demonstrates modern Etsy buyer demand.`,
      whatToStudy: "Study their top 3 bestselling listings, primary lifestyle thumbnail compositions, and long-tail tag clusters.",
      whatToAvoid: "Avoid competing on single commodity items; differentiate with higher-value bundle variations or specialized formats.",
      whatToDoNext: "Add this shop to ShopWatch tracking, extract high-frequency keyword clusters to the Planner, and draft an original competing product concept.",
    };
  }

  if (opportunityScore >= 45) {
    return {
      opportunityScore,
      verdictBadge: "MODERATE TO COMPETE",
      verdictLabel: "Consistent Market Performer",
      verdictColor: "text-[#B37800] bg-[#FFF8E6] border-[#FFB020]/30",
      summary: `Established shop with stable daily transaction volume (${estDailySales.toFixed(1)} sales/day) and balanced catalog yield across ${activeListings} listings.`,
      whyInteresting: `Steady recurring transactions and proven price tolerance around $${avgObservedPrice.toFixed(2)}.`,
      whatToStudy: "Examine their pricing tiers, seasonal tag updates, and review conversion incentives.",
      whatToAvoid: "Do not undercut pricing aggressively; focus on superior visual mockups, bundle depth, and clearer value propositions.",
      whatToDoNext: "Save top keywords into your Planner and monitor sales velocity over a 30-day window to evaluate seasonal surges.",
    };
  }

  return {
    opportunityScore,
    verdictBadge: "HIGH BARRIER",
    verdictLabel: "Established Legacy Authority",
    verdictColor: "text-[#525B55] bg-[#F4F3EF] border-[#E3E6E0]",
    summary: `Massive catalog (${activeListings} listings) and high review saturation (${reviewCount.toLocaleString()} reviews). High organic ranking defense built over ${Math.round(shopAgeMonths)} months.`,
    whyInteresting: `High lifetime volume (${totalSales.toLocaleString()} sales), but individual listing yield (${yieldRatio.toFixed(1)} sales/listing) is diluted across a large catalog.`,
    whatToStudy: "Identify their underserved sub-categories and weak long-tail listings where you can win on superior quality.",
    whatToAvoid: "Do not attempt a broad head-to-head catalog competition against this seller's high review moat.",
    whatToDoNext: "Target specific long-tail keywords where this shop ranks poorly, and build focused niche authority.",
  };
}

// --------------------------------------------------------------------------
// Full 8-Section Shop Intelligence Provider
// --------------------------------------------------------------------------

export async function fetchCompleteShopIntelligence(
  organizationId: string,
  shopExternalIdOrName: string
): Promise<CompleteShopIntelligenceProfile> {
  // 1. Resolve active Etsy credentials
  const active = await getActiveConnectorWithCredentials(organizationId, "ETSY");
  const apiKey = active?.credentials?.apiKey || process.env.ETSY_API_KEY || "";
  const sharedSecret = active?.credentials?.sharedSecret || process.env.ETSY_SHARED_SECRET || "";

  if (!apiKey) {
    throw new Error("No active Etsy API credentials configured. Please configure an Etsy connector in Settings.");
  }

  const client = createEtsyClient(apiKey, sharedSecret);

  // 2. Resolve Shop Profile
  let rawShop: any = null;
  const isNumericId = /^\d+$/.test(shopExternalIdOrName.trim());

  if (isNumericId) {
    try {
      rawShop = await client.getShop(Number(shopExternalIdOrName.trim()));
    } catch {
      // Fallback to name search if ID lookup fails
    }
  }

  if (!rawShop) {
    const searchRes = await client.searchShopsByName(shopExternalIdOrName.trim());
    rawShop = searchRes?.results?.[0];
  }

  if (!rawShop) {
    throw new Error(`Etsy shop "${shopExternalIdOrName}" could not be resolved on the marketplace.`);
  }

  const shopId = String(rawShop.shop_id);
  const shopName = rawShop.shop_name ?? `Shop ${shopId}`;
  const now = Date.now();
  const createdTimestamp = rawShop.create_date ?? Math.floor(now / 1000);
  const shopAgeMonths = Math.max(
    1,
    Math.round((now - createdTimestamp * 1000) / (30.44 * 24 * 3600 * 1000))
  );

  const totalSales = rawShop.transaction_sold_count ?? 0;
  const activeListingsCount = Math.max(1, rawShop.listing_active_count ?? 1);
  const reviewCount = rawShop.review_count ?? 0;
  const reviewAverage = rawShop.review_average ?? null;

  // 3. Ingest top 50 active listings from Etsy
  let rawListings: any[] = [];
  try {
    const listingRes = await client.getShopListings(rawShop.shop_id, 50);
    rawListings = listingRes?.results ?? [];
  } catch {
    rawListings = [];
  }

  // 4. Ingest recent reviews
  let rawReviews: any[] = [];
  try {
    const reviewRes = await client.getShopReviews(rawShop.shop_id, { limit: 10 });
    rawReviews = reviewRes?.results ?? [];
  } catch {
    rawReviews = [];
  }

  // 5. Compute KPIs
  const estDailySales = totalSales > 0 ? totalSales / (shopAgeMonths * 30.44) : 0;
  const estMonthlySales = Math.round(estDailySales * 30.44);
  const avgSellingRatio = totalSales > 0 ? totalSales / activeListingsCount : 0;

  // Calculate average observed price across top listings
  const parsedPrices = rawListings
    .map((l: any) => (l.price?.amount ?? 0) / (l.price?.divisor ?? 100))
    .filter((p: number) => p > 0);

  const avgObservedPrice =
    parsedPrices.length > 0
      ? parsedPrices.reduce((a, b) => a + b, 0) / parsedPrices.length
      : 18.5;

  const estMonthlyRevenue = Math.round(estMonthlySales * avgObservedPrice);
  const estGrossProfit = Math.round(estMonthlyRevenue * 0.68); // standard 68% digital/handmade gross margin

  const kpis: ShopPerformanceKpis = {
    totalSales,
    activeListings: activeListingsCount,
    reviewCount,
    reviewAverage,
    estDailySales: Math.round(estDailySales * 100) / 100,
    estMonthlySales,
    avgSellingRatio: Math.round(avgSellingRatio * 100) / 100,
    estMonthlyRevenue,
    estGrossProfit,
    avgObservedPrice: Math.round(avgObservedPrice * 100) / 100,
  };

  // 6. Compute Winning Signals & Strategic Verdict
  const shopSignals = computeShopWinningSignals({
    totalSales,
    activeListings: activeListingsCount,
    estDailySales,
    shopAgeMonths,
    reviewCount,
  });

  const verdict = computeStrategicShopVerdict({
    opportunityScore: shopSignals.opportunityScore,
    totalSales,
    activeListings: activeListingsCount,
    estDailySales,
    shopAgeMonths,
    reviewCount,
    avgObservedPrice,
  });

  // 7. Catalog Yield & Pricing Spread
  const normalizedCatalogItems = rawListings.map((l: any) => ({
    price: (l.price?.amount ?? 0) / (l.price?.divisor ?? 100),
    taxonomyPath: l.taxonomy_path,
    category: l.category,
  }));

  const catalog = computeCatalogYield(normalizedCatalogItems, totalSales, activeListingsCount);

  // 8. Long-Tail Tag Frequency Analysis
  const keywords = extractLongTailTagFrequencies(rawListings, 30);

  // 9. Normalize Top Winning Listings with individual opportunity scores
  const topListings: ShopWinningListing[] = rawListings.map((l: any) => {
    const listingId = String(l.listing_id);
    const priceAmount = (l.price?.amount ?? 0) / (l.price?.divisor ?? 100);
    const listingCreatedTimestamp = l.created_timestamp ?? Math.floor(now / 1000);
    const listingAgeDays = Math.max(
      1,
      Math.round((now - listingCreatedTimestamp * 1000) / (24 * 3600 * 1000))
    );

    const images: string[] = [];
    if (l.images && Array.isArray(l.images)) {
      for (const img of l.images) {
        const url = img.url_570xN || img.url_fullxfull || img.url_75x75 || img.url;
        if (url) images.push(url);
      }
    }
    if (l.Images && Array.isArray(l.Images)) {
      for (const img of l.Images) {
        const url = img.url_570xN || img.url_fullxfull || img.url_75x75 || img.url;
        if (url) images.push(url);
      }
    }
    const imageUrl = images[0] || l.image_url || l.thumbnail_url || l.listing_image_url || null;

    const opp = computeProductOpportunity({
      price: priceAmount,
      listingAgeDays,
      shopAgeMonths,
      totalSales,
      activeListings: activeListingsCount,
      reviewCount,
      reviewAverage,
      numFavorers: l.num_favorers ?? null,
      estDailySales,
      avgSellingRatio,
    });

    return {
      listingId,
      title: l.title ?? "Untitled Listing",
      price: priceAmount,
      currency: l.price?.currency_code ?? "USD",
      imageUrl,
      listingUrl: l.url ?? `https://www.etsy.com/listing/${listingId}`,
      createdTimestamp: listingCreatedTimestamp,
      listingAgeDays,
      tags: Array.isArray(l.tags) ? l.tags : [],
      materials: Array.isArray(l.materials) ? l.materials : [],
      estDailySales: Math.round((estDailySales / Math.max(1, rawListings.length)) * 200) / 100, // listing share proxy
      numFavorers: l.num_favorers ?? null,
      views: l.views ?? null,
      opportunityScore: opp.opportunityScore,
    };
  });

  // 10. Check ShopWatch & Historical Snapshots
  const watch = await prisma.shopWatch.findUnique({
    where: { organizationId_shopExternalId: { organizationId, shopExternalId: shopId } },
    include: { snapshots: { orderBy: { capturedAt: "asc" } } },
  });

  const snapshots: ShopSnapshotTrendPoint[] =
    watch?.snapshots.map((s: (typeof watch.snapshots)[number]) => ({
      capturedAt: s.capturedAt.toISOString(),
      totalSales: s.totalSales,
      reviewCount: s.reviewCount,
      reviewAverage: s.reviewAverage,
      activeListings: s.activeListings,
    })) ?? [];

  // Check if shop or its listings are favorited in local Prospect model
  const favoriteProspect = await prisma.prospect.findFirst({
    where: { organizationId, shopExternalId: shopId, isFavorite: true },
  });

  const identity: ShopIdentityOverview = {
    shopExternalId: shopId,
    shopName,
    shopUrl: rawShop.url ?? `https://www.etsy.com/shop/${shopName}`,
    shopIconUrl: rawShop.icon_url_fullxfull ?? null,
    // `banner_url_fullxfull` is not a real Etsy v3 Shop field (always
    // undefined) — the correct field, already used correctly in
    // src/connectors/etsy/index.ts, is `image_url_760x100`.
    shopBannerUrl: rawShop.image_url_760x100 ?? null,
    shopAgeMonths,
    createdDate: new Date(createdTimestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
    location: rawShop.digital_listing_count ? "Global (Digital Delivery)" : "Etsy Marketplace",
    isVacation: rawShop.is_vacation ?? false,
  };

  return {
    identity,
    kpis,
    verdict,
    snapshots,
    catalog,
    keywords,
    topListings,
    signals: shopSignals,
    isTracked: Boolean(watch?.isActive),
    isFavorite: Boolean(favoriteProspect),
  };
}
