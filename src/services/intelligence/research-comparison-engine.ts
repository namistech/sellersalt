/**
 * SellerSalt Research Comparison Engine
 * 
 * Compares research entities side-by-side (Products, Keywords, Niches, Marketplaces)
 * across empirical dimensions (Price, Demand, Competition, Momentum, Confidence)
 * without fabricating missing metrics as 0.
 */

import type { NormalizedProduct, MarketplaceId } from "@/marketplaces/core/types";

export interface EntityComparisonMetric {
  key: string;
  label: string;
  entityAValue: string | number | null;
  entityBValue: string | number | null;
  deltaText?: string;
  winner?: "A" | "B" | "TIE" | "INCOMPARABLE";
  provenance: string;
}

export interface EntityComparisonResult {
  comparisonType: "PRODUCT" | "KEYWORD" | "NICHE" | "MARKETPLACE";
  entityAName: string;
  entityBName: string;
  metrics: EntityComparisonMetric[];
  summary: string;
}

export class ResearchComparisonEngine {
  /**
   * Compares two normalized products side-by-side.
   */
  public static compareProducts(
    productA: NormalizedProduct,
    productB: NormalizedProduct
  ): EntityComparisonResult {
    const metrics: EntityComparisonMetric[] = [];

    // Price
    const pA = productA.price;
    const pB = productB.price;
    let priceWinner: "A" | "B" | "TIE" | "INCOMPARABLE" = "INCOMPARABLE";
    let priceDelta: string | undefined = undefined;

    if (pA !== null && pB !== null) {
      if (pA < pB) {
        priceWinner = "A";
        priceDelta = `Product A is $${(pB - pA).toFixed(2)} (${Math.round(((pB - pA) / pB) * 100)}%) lower`;
      } else if (pB < pA) {
        priceWinner = "B";
        priceDelta = `Product B is $${(pA - pB).toFixed(2)} (${Math.round(((pA - pB) / pA) * 100)}%) lower`;
      } else {
        priceWinner = "TIE";
        priceDelta = "Identical pricing";
      }
    }

    metrics.push({
      key: "price",
      label: "Observed Price",
      entityAValue: pA !== null ? `$${pA.toFixed(2)}` : null,
      entityBValue: pB !== null ? `$${pB.toFixed(2)}` : null,
      deltaText: priceDelta,
      winner: priceWinner,
      provenance: "OBSERVED / PUBLIC_WEB",
    });

    // Reviews
    const revA = productA.reviewCount ?? null;
    const revB = productB.reviewCount ?? null;
    let revWinner: "A" | "B" | "TIE" | "INCOMPARABLE" = "INCOMPARABLE";
    let revDelta: string | undefined = undefined;

    if (revA !== null && revB !== null) {
      if (revA > revB) {
        revWinner = "A";
        revDelta = `Product A has ${revA - revB} more observed reviews`;
      } else if (revB > revA) {
        revWinner = "B";
        revDelta = `Product B has ${revB - revA} more observed reviews`;
      } else {
        revWinner = "TIE";
      }
    }

    metrics.push({
      key: "reviews",
      label: "Observed Reviews",
      entityAValue: revA,
      entityBValue: revB,
      deltaText: revDelta,
      winner: revWinner,
      provenance: "OBSERVED / PUBLIC_WEB",
    });

    // Rating
    const ratA = productA.rating ?? null;
    const ratB = productB.rating ?? null;
    metrics.push({
      key: "rating",
      label: "Average Rating",
      entityAValue: ratA !== null ? `${ratA.toFixed(1)} / 5.0` : null,
      entityBValue: ratB !== null ? `${ratB.toFixed(1)} / 5.0` : null,
      winner: ratA && ratB ? (ratA > ratB ? "A" : ratB > ratA ? "B" : "TIE") : "INCOMPARABLE",
      provenance: "OBSERVED / PUBLIC_WEB",
    });

    // Marketplace
    metrics.push({
      key: "marketplace",
      label: "Marketplace",
      entityAValue: productA.marketplace,
      entityBValue: productB.marketplace,
      winner: "TIE",
      provenance: "SOURCE_METADATA",
    });

    return {
      comparisonType: "PRODUCT",
      entityAName: productA.title,
      entityBName: productB.title,
      metrics,
      summary: `Comparison between "${productA.title.slice(0, 30)}..." and "${productB.title.slice(0, 30)}...".`,
    };
  }
}
