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
  price: number;
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
}

export interface NormalizedShopProfile {
  shopId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl: string | null;
  createdTimestamp: number;
  shopAgeMonths: number;
  totalSales: number;
  activeListings: number;
  reviewCount: number;
  reviewAverage: number | null;
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
  priceRange: { min: number; max: number; average: number };
}
