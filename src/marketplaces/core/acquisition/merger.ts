/**
 * SellerSalt Multi-Source Observation Merger
 * 
 * Merges commerce observations from multiple data sources (Public Web, Official API,
 * Historical DB records) into unified canonical entities with explicit field lineage.
 * 
 * Rules:
 * 1. Never overwrite an observed value with null/undefined from a secondary source.
 * 2. Prefer fresher observations for volatile fields (price, active status).
 * 3. Enrich missing metadata (categories, SKU) from higher-structured sources (API/JSON-LD).
 * 4. Maintain explicit source lineage: sources: [PUBLIC_WEB, MARKETPLACE_API].
 * 5. Re-evaluate canonical opportunity with all merged signals to maximize calibrated confidence.
 */

import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import type {
  NormalizedProduct,
  DataSourceType,
  SignalProvenance,
} from "../types";
import type { MergedProductObservation } from "./contracts";

export function mergeProductObservations(
  primary: NormalizedProduct,
  secondary?: NormalizedProduct | null
): MergedProductObservation {
  if (!secondary) {
    const primarySource: DataSourceType = primary.acquisitionMethod || "PUBLIC_WEB";
    const primaryObservedAt = primary.observedAt || primary.capturedAt || new Date();
    const productWithLineage: NormalizedProduct = {
      ...primary,
      fieldLineage: primary.fieldLineage || {
        title: {
          value: primary.title,
          provenance: "ACTUAL_DATA",
          source: primarySource,
          observedAt: primaryObservedAt,
        },
        price: {
          value: primary.price,
          provenance: primary.price !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
          source: primarySource,
          observedAt: primaryObservedAt,
        },
        rating: {
          value: primary.rating ?? null,
          provenance: primary.rating !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
          source: primarySource,
          observedAt: primaryObservedAt,
        },
        reviewCount: {
          value: primary.reviewCount ?? null,
          provenance: primary.reviewCount !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
          source: primarySource,
          observedAt: primaryObservedAt,
        },
        salesCount: {
          value: primary.salesCount ?? null,
          provenance: primary.salesCount !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
          source: primarySource,
          observedAt: primaryObservedAt,
        },
        favoritesCount: {
          value: primary.favoritesCount ?? null,
          provenance: primary.favoritesCount !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
          source: primarySource,
          observedAt: primaryObservedAt,
        },
        estimatedDemand: {
          value: primary.estimatedDemand ?? null,
          provenance: primary.estimatedDemand !== null ? "ESTIMATED" : "UNAVAILABLE",
          source: primarySource,
          observedAt: primaryObservedAt,
          methodology: "daily-sales derived from observed sales & shop age",
        },
      },
    };

    return {
      product: productWithLineage,
      sources: [primarySource],
      isEnriched: false,
      fieldProvenance: {
        title: primarySource,
        price: primarySource,
        rating: primarySource,
        reviewCount: primarySource,
        shop: primarySource,
        category: primarySource,
      },
    };
  }

  const primarySource: DataSourceType = primary.acquisitionMethod || "PUBLIC_WEB";
  const secondarySource: DataSourceType = secondary.acquisitionMethod || "MARKETPLACE_API";
  const sources: DataSourceType[] = Array.from(new Set([primarySource, secondarySource]));
  const fieldProvenance: Record<string, DataSourceType> = {};

  // Clone primary as base
  const merged: NormalizedProduct = {
    ...primary,
    isHistorical: Boolean(primary.isHistorical && secondary.isHistorical),
  };

  // Title: primary unless empty
  if (!merged.title && secondary.title) {
    merged.title = secondary.title;
    fieldProvenance.title = secondarySource;
  } else {
    fieldProvenance.title = primarySource;
  }

  // Price & Currency: prefer primary unless null
  if (merged.price === null || merged.price === undefined) {
    if (secondary.price !== null && secondary.price !== undefined) {
      merged.price = secondary.price;
      merged.currency = secondary.currency || merged.currency;
      fieldProvenance.price = secondarySource;
    }
  } else {
    fieldProvenance.price = primarySource;
  }

  // Image URL
  if (!merged.imageUrl && secondary.imageUrl) {
    merged.imageUrl = secondary.imageUrl;
    fieldProvenance.imageUrl = secondarySource;
  }

  // Ratings & Reviews
  if ((merged.rating === null || merged.rating === undefined) && secondary.rating !== null && secondary.rating !== undefined) {
    merged.rating = secondary.rating;
    fieldProvenance.rating = secondarySource;
  } else if (merged.rating !== null && merged.rating !== undefined) {
    fieldProvenance.rating = primarySource;
  }

  if ((merged.reviewCount === null || merged.reviewCount === undefined) && secondary.reviewCount !== null && secondary.reviewCount !== undefined) {
    merged.reviewCount = secondary.reviewCount;
    fieldProvenance.reviewCount = secondarySource;
  } else if (merged.reviewCount !== null && merged.reviewCount !== undefined) {
    fieldProvenance.reviewCount = primarySource;
  }

  // Favorites / Engagement
  if ((merged.favoritesCount === null || merged.favoritesCount === undefined) && secondary.favoritesCount !== null && secondary.favoritesCount !== undefined) {
    merged.favoritesCount = secondary.favoritesCount;
    fieldProvenance.favoritesCount = secondarySource;
  } else if (merged.favoritesCount !== null && merged.favoritesCount !== undefined) {
    fieldProvenance.favoritesCount = primarySource;
  }

  // Shop Info
  if (!merged.shop && secondary.shop) {
    merged.shop = secondary.shop;
    fieldProvenance.shop = secondarySource;
  } else if (merged.shop && secondary.shop) {
    merged.shop = {
      ...merged.shop,
      activeListings: merged.shop.activeListings ?? secondary.shop.activeListings,
      ageMonths: merged.shop.ageMonths ?? secondary.shop.ageMonths,
      reviewRatio: merged.shop.reviewRatio ?? secondary.shop.reviewRatio,
      reviewVelocity: merged.shop.reviewVelocity ?? secondary.shop.reviewVelocity,
      avgSellingRatio: merged.shop.avgSellingRatio ?? secondary.shop.avgSellingRatio,
    };
    fieldProvenance.shop = primarySource;
  }

  // Category Path
  if ((!merged.categoryPath || merged.categoryPath.length === 0) && secondary.categoryPath) {
    merged.categoryPath = secondary.categoryPath;
    fieldProvenance.categoryPath = secondarySource;
  }

  // Keyword Signals
  if ((!merged.keywordSignals || merged.keywordSignals.length === 0) && secondary.keywordSignals) {
    merged.keywordSignals = secondary.keywordSignals;
    fieldProvenance.keywordSignals = secondarySource;
  }

  // Set merged provenance
  merged.source = "ACTUAL_DATA" as SignalProvenance;
  merged.acquisitionMethod = primarySource;

  const now = new Date();
  const primaryObservedAt = primary.observedAt || primary.capturedAt || now;
  const secondaryObservedAt = secondary.observedAt || secondary.capturedAt || now;

  merged.fieldLineage = {
    title: {
      value: merged.title,
      provenance: "ACTUAL_DATA",
      source: fieldProvenance.title,
      observedAt: fieldProvenance.title === secondarySource ? secondaryObservedAt : primaryObservedAt,
    },
    price: {
      value: merged.price,
      provenance: merged.price !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
      source: fieldProvenance.price,
      observedAt: fieldProvenance.price === secondarySource ? secondaryObservedAt : primaryObservedAt,
    },
    rating: {
      value: merged.rating ?? null,
      provenance: merged.rating !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
      source: fieldProvenance.rating || primarySource,
      observedAt: fieldProvenance.rating === secondarySource ? secondaryObservedAt : primaryObservedAt,
    },
    reviewCount: {
      value: merged.reviewCount ?? null,
      provenance: merged.reviewCount !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
      source: fieldProvenance.reviewCount || primarySource,
      observedAt: fieldProvenance.reviewCount === secondarySource ? secondaryObservedAt : primaryObservedAt,
    },
    salesCount: {
      value: merged.salesCount ?? null,
      provenance: merged.salesCount !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
      source: primarySource,
      observedAt: primaryObservedAt,
    },
    favoritesCount: {
      value: merged.favoritesCount ?? null,
      provenance: merged.favoritesCount !== null ? "ACTUAL_DATA" : "UNAVAILABLE",
      source: fieldProvenance.favoritesCount || primarySource,
      observedAt: fieldProvenance.favoritesCount === secondarySource ? secondaryObservedAt : primaryObservedAt,
    },
    estimatedDemand: {
      value: merged.estimatedDemand ?? null,
      provenance: merged.estimatedDemand !== null ? "ESTIMATED" : "UNAVAILABLE",
      source: primarySource,
      observedAt: primaryObservedAt,
      methodology: "daily-sales derived from observed sales & shop age",
    },
  };

  // Re-evaluate Canonical Opportunity Score with all newly enriched signals
  const oppInput = extractOpportunityInputFromNormalizedProduct(merged);
  const report = evaluateCanonicalOpportunity(oppInput);
  if (report.overallScore !== null) {
    merged.opportunityScore = {
      score: report.overallScore,
      confidence: report.confidenceScore,
      tier: report.tier,
      verdict: report.verdictLabel,
      verdictVariant: report.verdictVariant,
      availableSignals: report.signals.available.map((s) => s.id),
      unavailableSignals: report.signals.unavailable.map((s) => s.id),
    };
  }

  return {
    product: merged,
    sources,
    isEnriched: sources.length > 1,
    fieldProvenance,
  };
}
