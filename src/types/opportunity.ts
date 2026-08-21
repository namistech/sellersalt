/**
 * SellerSalt Canonical Opportunity Model & Data Contracts
 * 
 * Formalizes a single canonical Opportunity object across all discovery surfaces:
 * Product Research, Keyword Research, Category Research, Shop Intelligence,
 * Competitor Surveillance, Market Intelligence, User's Own Shop, and Browser Extension.
 * 
 * Complies with Rule 1 (Never invent Etsy APIs), Rule 2 (Preserve data provenance),
 * Rule 3 (Multi-tenant scoping), and Rule 5 (Explainable inputs).
 */

import type { DataProvenanceType } from "./provenance";
import type { NextBestAction } from "@/services/intelligence/next-best-action";

export type OpportunitySource =
  | "PRODUCT_RESEARCH"
  | "KEYWORD_RESEARCH"
  | "CATEGORY_RESEARCH"
  | "SHOP_INTELLIGENCE"
  | "MARKET_RESEARCH"
  | "MARKET_INTELLIGENCE"
  | "OWN_SHOP"
  | "EXTENSION"
  | "MANUAL";

export type OpportunityMarketplace =
  | "etsy"
  | "amazon"
  | "ebay"
  | "tiktok_shop"
  | "walmart";

export type OpportunityPipelineStage =
  | "RESEARCHED"
  | "SHORTLISTED"
  | "OPPORTUNITY"
  | "KEYWORDS"
  | "STRATEGY"
  | "CONTENT"
  | "DRAFT"
  | "REVIEW"
  | "PUBLISHED"
  | "MONITORING"
  | "ARCHIVED"
  | "DISMISSED";

export type OpportunityLifecycleStatus =
  | "NEW"
  | "VIEWED"
  | "RESEARCHED"
  | "SHORTLISTED"
  | "PLANNED"
  | "STRATEGY_READY"
  | "CONTENT_READY"
  | "DRAFT_READY"
  | "PUBLISHED"
  | "MONITORING"
  | "ARCHIVED"
  | "DISMISSED";

export type OpportunityClassification =
  | "EMERGING_WINNER"
  | "HIDDEN_GEM"
  | "HIGH_DEMAND_CROWDED"
  | "CONSISTENT_GROWTH"
  | "UNDERPERFORMING_OWN_LISTING";

export interface OpportunityScoreBreakdown {
  velocityPoints: number;     // max 30 pts
  densityPoints: number;      // max 25 pts
  competitionPoints: number;  // max 20 pts
  momentumPoints: number;     // max 15 pts
  freshnessPoints: number;    // max 10 pts
  formula: string;
}

export interface OpportunityDemandSignals {
  estDailySales: number;
  estMonthlySales: number;
  estMonthlyRevenue: number;
  totalSales: number;
  salesVelocityTrend: "ACCELERATING" | "STEADY" | "DECELERATING" | "NEW";
  numFavorers: number | null;
}

export interface OpportunityCompetitionSignals {
  activeListings: number;
  reviewCount: number;
  reviewAverage: number | null;
  barrierLevel: "LOW" | "MODERATE" | "HIGH";
  reviewMoatEstimateDays: number;
  incumbentSaturation: string;
}

export interface OpportunityEconomics {
  price: number;
  currency: string;
  estCogs: number;
  estEtsyFees: number;
  estNetProfit: number;
  marginPercent: number;
  feeBreakdown: {
    transactionFee: number;
    paymentProcessingFee: number;
    listingFee: number;
  };
}

export interface OpportunityHistoricalSnapshot {
  capturedAt: string; // ISO
  price: number;
  estDailySales: number;
  activeListings: number;
  reviewCount: number;
  opportunityScore: number;
  observationNote?: string;
}

export interface OpportunityRelationLinks {
  plannerItemId?: string | null;
  listingDraftId?: string | null;
  listingWatchId?: string | null;
  shopWatchId?: string | null;
  etsyListingId?: string | null;
  sellerChannelId?: string | null;
}

export interface CanonicalOpportunity {
  id: string;
  organizationId: string;
  source: OpportunitySource;
  marketplace: OpportunityMarketplace;
  
  // Product / Listing Identity
  listingExternalId?: string | null;
  listingTitle: string;
  listingUrl?: string | null;
  listingImageUrl?: string | null;
  category?: string | null;
  
  // Shop Identity
  shopExternalId?: string | null;
  shopName?: string | null;
  shopUrl?: string | null;
  shopIconUrl?: string | null;
  shopAgeMonths?: number | null;
  
  // Target & Discovered Keywords
  primaryKeyword: string;
  targetKeywords: string[];
  
  // Scoring & Intelligence
  opportunityScore: number; // 0-100 composite [SELLERSALT SCORE]
  confidenceScore: number;  // 0-100
  classification: OpportunityClassification;
  classificationLabel: string;
  classificationEmoji: string;
  reason: string;
  scoreBreakdown: OpportunityScoreBreakdown;
  
  // Signal telemetry
  demand: OpportunityDemandSignals;
  competition: OpportunityCompetitionSignals;
  economics: OpportunityEconomics;
  
  // Data Provenance
  provenance: DataProvenanceType;
  
  // Pipeline Stage & Status
  stage: OpportunityPipelineStage;
  status: OpportunityLifecycleStatus;
  isDismissed: boolean;
  dismissedReason?: string | null;
  
  // Relational Links
  relations: OpportunityRelationLinks;
  
  // Immutable snapshots & memory
  historicalSnapshots: OpportunityHistoricalSnapshot[];
  
  // Explainable Next Best Action 2.0
  nextBestAction: NextBestAction;
  
  // Timestamps
  discoveredAt: string; // ISO
  updatedAt: string;    // ISO
  lastObservedAt: string; // ISO
}

export interface OpportunityComparisonTradeoffs {
  bestOpportunityId: string;
  bestMarginId: string;
  lowestCompetitionId: string;
  fastestMomentumId: string;
  safestEntryId: string;
  comparisonSummary: string;
}
