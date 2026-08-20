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
    return {
      product: primary,
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
  if (merged.rating === null && secondary.rating !== null) {
    merged.rating = secondary.rating;
    fieldProvenance.rating = secondarySource;
  } else if (merged.rating !== null) {
    fieldProvenance.rating = primarySource;
  }

  if (merged.reviewCount === null && secondary.reviewCount !== null) {
    merged.reviewCount = secondary.reviewCount;
    fieldProvenance.reviewCount = secondarySource;
  } else if (merged.reviewCount !== null) {
    fieldProvenance.reviewCount = primarySource;
  }

  // Favorites / Engagement
  if (merged.favoritesCount === null && secondary.favoritesCount !== null) {
    merged.favoritesCount = secondary.favoritesCount;
    fieldProvenance.favoritesCount = secondarySource;
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
