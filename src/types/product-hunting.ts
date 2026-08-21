/**
 * SellerSalt Product Hunting & Opportunity Radar Domain Types
 * 
 * Defines normalized models for live Etsy listing searches,
 * enriched shop metadata, deterministic estimated signals, and
 * explainable Opportunity Radar scoring.
 */

import type { OpportunityType, OpportunitySignal } from "@/services/opportunities";

export type { OpportunityType, OpportunitySignal };

export interface EtsySearchFilters {
  keywords?: string;
  taxonomyId?: number;
  minPrice?: number;
  maxPrice?: number;
  shopLocation?: string;
  sortOn?: "created" | "price" | "score";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
  page?: number;
  /** Which marketplace to search — defaults to "etsy" server-side when
   * omitted. See src/marketplaces/core/types.ts's MarketplaceId. */
  marketplace?: string;
}

export interface NormalizedProductListing {
  listingId: string;
  title: string;
  description?: string;
  /** null when the source page didn't expose a price statically (e.g.
   * Amazon's current search-result markup renders price client-side) —
   * never coerced to 0, which would render as a real, observed "$0.00". */
  price: number | null;
  currency: string;
  images: string[];
  imageUrl: string | null;
  tags: string[];
  materials: string[];
  taxonomyId: number | null;
  taxonomyPath?: string;
  createdTimestamp: number;
  updatedTimestamp: number;
  listingAgeDays: number;
  listingAgeMonths: number;
  listingUrl: string;
  shopId: string;
  shopName: string;
  numFavorers: number | null;
  views: number | null;
  /** The PRODUCT's own rating/review count (e.g. Amazon/Walmart's per-
   * listing star rating) — distinct from `NormalizedShopProfile.
   * reviewAverage`/`reviewCount`, which are Etsy SHOP-level aggregates and
   * only populated when `shopMetricsObserved` is true. This pair must be
   * rendered independently of that flag — a real per-listing rating from
   * Amazon/Walmart is not a shop metric and must not be hidden behind a
   * gate meant for shop-level data it was never intended to satisfy. */
  rating: number | null;
  reviewCount: number | null;
  /** null when the marketplace/adapter doesn't attribute a brand at all
   * (never guessed from the title). */
  brand: string | null;
  /** Human-readable category label(s), most-general first, exactly as the
   * marketplace itself classifies the product — e.g.
   * ["Home", "Cups & Mugs"] for Walmart, or Amazon's full breadcrumb
   * trail. Empty when the source didn't expose one. */
  categoryPath: string[];
  /** Real on-page labels only (e.g. "Sponsored", "Best Seller", "Rollback",
   * a material/attribute chip) — never SellerSalt-invented merchandising
   * copy. */
  badges: string[];
  /** null when the source page didn't expose a stock-status signal. */
  availability: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNAVAILABLE" | null;
  /** A marketplace's own published sales-rank signal (e.g. Amazon's "Best
   * Sellers Rank"), never a SellerSalt-derived estimate. Empty when
   * unavailable. */
  bestSellerRank: Array<{ rank: number; category: string }>;
}

export interface NormalizedShopProfile {
  shopId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl: string | null;
  /** The marketplace's own seller/merchant ID when it legitimately exposes
   * one distinct from the shop name (e.g. Amazon's seller ID, Walmart's
   * sellerId) — null when unavailable, never derived from the name. */
  shopExternalId: string | null;
  createdTimestamp: number;
  shopAgeMonths: number;
  totalSales: number;
  activeListings: number;
  reviewCount: number;
  reviewAverage: number | null;
  /** false when shopAgeMonths/totalSales/activeListings/reviewCount above
   * are placeholder defaults, not real observations — true only for
   * marketplaces (Etsy today) whose research connector actually exposes
   * shop-level aggregate stats. Amazon/Walmart's public search results
   * carry no such shop-level data at all; UI must not render these
   * fields as if directly observed when this is false. */
  shopMetricsObserved: boolean;
}

export interface ProductCalculatedSignals {
  estDailySales: number;
  avgSellingRatio: number;
  salesVelocityProxy: "HIGH" | "MODERATE" | "EMERGING" | "LOW";
  reviewConversionRate: number;
}

export interface ProductOpportunityScore {
  opportunityScore: number; // 0–100 composite
  classification: OpportunityType;
  classificationLabel: string;
  classificationEmoji: string;
  reason: string;
  signals: {
    velocity: OpportunitySignal;
    density: OpportunitySignal;
    competition: OpportunitySignal;
    freshness: OpportunitySignal;
    momentum: OpportunitySignal;
  };
  evidence: string[];
  strengths: string[];
  weaknesses: string[];
  recommendedAction: "SHORTLIST" | "STUDY_PRICING" | "MONITOR_VELOCITY" | "IGNORE";
  strategicTakeaway: string;
}

export interface ProductHuntingResult {
  id: string; // listingId
  listing: NormalizedProductListing;
  shop: NormalizedShopProfile;
  signals: ProductCalculatedSignals;
  opportunity: ProductOpportunityScore;
  isSavedToPlanner?: boolean;
  plannerItemId?: string | null;
}

export interface ProductHuntingSearchResponse {
  results: ProductHuntingResult[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
  searchParams: EtsySearchFilters;
  source: "ETSY_LIVE_SEARCH" | "SEARCH_CONFIG_PROSPECTS";
  executionDurationMs: number;
}

export interface ProductComparisonSummary {
  items: ProductHuntingResult[];
  sharedTags: string[];
  uniqueTagsByProduct: Record<string, string[]>;
  highestVelocityProduct: ProductHuntingResult;
  lowestCompetitionProduct: ProductHuntingResult;
  highestOpportunityProduct: ProductHuntingResult;
  /** null when none of the compared items had an observed price
   * (e.g. all Amazon results, whose current search-card markup doesn't
   * expose price statically) — never a fabricated 0. */
  priceRange: { min: number; max: number; average: number } | null;
}
