/**
 * SellerSalt Autonomous Opportunity Discovery & Market Radar 2.0 Types
 * 
 * Formal domain models for autonomous market discovery, signal taxonomy,
 * deterministic detection rules, Opportunity Scoring 3.0, Product Idea Engine,
 * Radar 2.0, and Watchlist Alerting.
 * 
 * ZERO-FABRICATION CONTRACT:
 * - Missing marketplace metrics are strictly null with provenance UNAVAILABLE.
 * - Search volume is disclosed as UNAVAILABLE without synthetic estimates.
 * - Unobserved private store revenues remain UNAVAILABLE.
 * - Historical deltas require n >= 2 snapshots; otherwise null / INSUFFICIENT_DATA.
 */

import type { MarketplaceId, SignalProvenance } from "./types";
import type { FreshnessEvaluation } from "./acquisition/freshness";
import type { ResearchQualityReport } from "./acquisition/research-quality";
import type { AcquisitionTraceStep } from "./research-command-types";

// ============================================================================
// 1. OPPORTUNITY TYPES
// ============================================================================

export type AutonomousOpportunityType =
  | "EMERGING_PRODUCT"
  | "PERSISTENT_PRODUCT"
  | "RISING_KEYWORD"
  | "EMERGING_KEYWORD"
  | "UNDERSERVED_ATTRIBUTE"
  | "PRICE_GAP"
  | "CATEGORY_OPPORTUNITY"
  | "NICHE_OPPORTUNITY"
  | "LOW_CONCENTRATION_MARKET"
  | "CROSS_MARKETPLACE_OPPORTUNITY"
  | "IMPROVING_OPPORTUNITY"
  | "MOMENTUM_OPPORTUNITY"
  | "DIFFERENTIATION_OPPORTUNITY"
  | "NO_ACTIONABLE_OPPORTUNITY"
  | "INSUFFICIENT_DATA";

export type OpportunityRankingMode =
  | "BEST_OPPORTUNITIES"
  | "FASTEST_RISING"
  | "LOWEST_COMPETITION"
  | "BEST_DIFFERENTIATION"
  | "BEST_PRICE_GAP"
  | "MOST_PERSISTENT"
  | "NEWEST_EMERGING"
  | "CROSS_MARKETPLACE";

// ============================================================================
// 2. SIGNAL TAXONOMY
// ============================================================================

export interface SignalMetric<T = number | string | null> {
  value: T;
  provenance: SignalProvenance;
  label: string;
  isAvailable: boolean;
  explanation?: string;
}

export interface OpportunitySignalTaxonomy {
  demand: {
    observedReviewCount: SignalMetric<number | null>;
    observedReviewVelocityDaily: SignalMetric<number | null>;
    observedFavoritesCount: SignalMetric<number | null>;
    listingPrevalencePercent: SignalMetric<number | null>;
    persistenceDays: SignalMetric<number | null>;
    repeatedObservationCount: SignalMetric<number>;
  };
  competition: {
    observedSellerCount: SignalMetric<number | null>;
    sellerConcentrationHHI: SignalMetric<number | null>;
    dominantSellerCatalogShare: SignalMetric<number | null>;
    medianCompetitorReviews: SignalMetric<number | null>;
    establishedBarrierLevel: SignalMetric<"LOW" | "MODERATE" | "HIGH" | "VERY_HIGH" | null>;
  };
  market: {
    observedPriceMedian: SignalMetric<number | null>;
    observedPriceMin: SignalMetric<number | null>;
    observedPriceMax: SignalMetric<number | null>;
    priceSpreadPercent: SignalMetric<number | null>;
    freshnessRatio: SignalMetric<number | null>;
    marketMomentumStatus: SignalMetric<string>;
  };
  keyword: {
    dominantKeywords: Array<{ term: string; prevalencePercent: number }>;
    risingKeywords: Array<{ term: string; velocityDelta: number }>;
  };
  differentiation: {
    underrepresentedAttributes: string[];
    observedAttributeGaps: string[];
    materialStyleOpportunities: string[];
  };
  crossMarketplace: {
    matchedMarketplaces: MarketplaceId[];
    priceDisparityPercent: SignalMetric<number | null>;
    sharedSellerIdentified: SignalMetric<boolean | null>;
  };
}

// ============================================================================
// 3. OPPORTUNITY ITEM & SCORING 3.0
// ============================================================================

export interface OpportunityScore3Breakdown {
  compositeScore: number; // 0 - 100
  demandScore: number; // 0 - 25
  competitionAttractivenessScore: number; // 0 - 25
  momentumScore: number; // 0 - 15
  differentiationScore: number; // 0 - 15
  pricePositioningScore: number; // 0 - 10
  evidenceDepthScore: number; // 0 - 10
  weightsApplied: {
    demand: number;
    competition: number;
    momentum: number;
    differentiation: number;
    price: number;
    depth: number;
  };
}

export interface OpportunityConfidenceReport {
  confidenceScore: number; // 0 - 100
  confidenceTier: "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT";
  confidenceDrivers: string[];
  unknownSignals: string[];
  limitations: string[];
}

export interface StructuredOpportunityExplanation {
  whatIsIt: string;
  whyFound: string;
  observedEvidence: string[];
  derivedSignals: string[];
  unknowns: string[];
  whyAttractive: string[];
  potentialRisks: string[];
  recommendedNextAction: string;
  verdict: "HIGH_OPPORTUNITY" | "WORTH_INVESTIGATING" | "COMPETITIVE" | "WEAK_SIGNALS" | "INSUFFICIENT_DATA";
}

export interface AutonomousOpportunityItem {
  id: string; // Deterministic canonical ID
  canonicalEntityId: string;
  type: AutonomousOpportunityType;
  title: string;
  subtitle: string;
  marketplace: MarketplaceId | "all";
  marketplaces: MarketplaceId[];
  category?: string;
  niche?: string;
  score: OpportunityScore3Breakdown;
  confidence: OpportunityConfidenceReport;
  explanation: StructuredOpportunityExplanation;
  signals: OpportunitySignalTaxonomy;
  momentum: "RISING" | "ACCELERATING" | "STABLE" | "COOLING" | "DECLINING" | "INSUFFICIENT_DATA";
  firstObservedAt: Date;
  lastObservedAt: Date;
  observationCount: number;
  isSaved?: boolean;
  isWatched?: boolean;
  freshness: FreshnessEvaluation;
}

// ============================================================================
// 4. PRODUCT IDEA MODEL
// ============================================================================

export interface ProductIdea {
  id: string;
  title: string;
  targetCategory: string;
  targetNiche: string;
  targetMarketplaces: MarketplaceId[];
  ideaScore: number; // 0 - 100
  confidenceScore: number; // 0 - 100
  whyThisIdea: string;
  observedEvidence: {
    dominantKeywords: string[];
    priceRangeObserved: { min: number | null; median: number | null; max: number | null };
    sellerLandscape: string;
    sampleListingCount: number;
  };
  derivedEvidence: {
    attributeGap: string;
    differentiationAngle: string;
    pricingWindow: string;
  };
  unknowns: string[];
  risks: string[];
  nextSteps: string[];
  provenance: SignalProvenance;
  generatedAt: Date;
}

// ============================================================================
// 5. RADAR 2.0 FEED
// ============================================================================

export interface OpportunityRadarSection {
  id: string;
  title: string;
  description: string;
  badgeLabel: string;
  opportunities: AutonomousOpportunityItem[];
}

export interface OpportunityRadar2Pulse {
  totalOpportunitiesDiscovered: number;
  emergingCount: number;
  risingCount: number;
  underservedCount: number;
  priceGapCount: number;
  crossMarketplaceCount: number;
  persistentCount: number;
  averageScore: number;
  dominantCategories: Array<{ category: string; count: number; avgScore: number }>;
  generatedAt: Date;
}

export interface OpportunityRadar2Feed {
  pulse: OpportunityRadar2Pulse;
  sections: OpportunityRadarSection[];
  productIdeas: ProductIdea[];
  marketCoverage: {
    requested: MarketplaceId[];
    available: MarketplaceId[];
  };
  limitations: string[];
}

// ============================================================================
// 6. AUTONOMOUS DISCOVERY REQUEST / RESPONSE
// ============================================================================

export interface AutonomousDiscoveryRequest {
  organizationId?: string;
  marketplaces?: MarketplaceId[]; // default ["etsy", "amazon", "ebay", "walmart"]
  category?: string;
  niche?: string;
  priceRange?: { min?: number; max?: number };
  opportunityType?: AutonomousOpportunityType;
  rankingMode?: OpportunityRankingMode;
  minScore?: number;
  minConfidence?: number;
  depth?: "QUICK" | "STANDARD" | "DEEP";
  limit?: number;
  generateProductIdeas?: boolean;
}

export interface AutonomousDiscoveryResult {
  runId: string;
  organizationId?: string;
  requestedAt: Date;
  completedAt: Date;
  durationMs: number;
  scope: {
    marketplaces: MarketplaceId[];
    category?: string;
    niche?: string;
    priceRange?: { min?: number; max?: number };
    depth: "QUICK" | "STANDARD" | "DEEP";
  };
  summary: {
    seedsEvaluated: string[];
    totalProductsObserved: number;
    totalUniqueSellersObserved: number;
    totalKeywordsHarvested: number;
    totalOpportunitiesFound: number;
    totalOpportunitiesRejected: number;
    averageOpportunityScore: number;
  };
  opportunities: AutonomousOpportunityItem[];
  productIdeas: ProductIdea[];
  radarFeed: OpportunityRadar2Feed;
  quality: ResearchQualityReport;
  acquisitionTrace: AcquisitionTraceStep[];
  limitations: string[];
}

// ============================================================================
// 7. WATCHLIST & ALERT MODEL
// ============================================================================

export type WatchItemType = "PRODUCT" | "KEYWORD" | "NICHE" | "CATEGORY" | "SELLER" | "OPPORTUNITY";

export interface OpportunityWatchItem {
  id: string;
  organizationId: string;
  type: WatchItemType;
  targetId: string;
  title: string;
  marketplace: MarketplaceId | "all";
  initialScore: number | null;
  currentScore: number | null;
  scoreDelta: number | null;
  momentum: string;
  alertConditions: {
    notifyOnScoreChange?: boolean;
    notifyOnPriceMove?: boolean;
    notifyOnMomentumShift?: boolean;
    minScoreThreshold?: number;
  };
  firstObservedAt: Date;
  lastObservedAt: Date;
  lastCheckedAt: Date;
}

export interface OpportunityAlertRecord {
  id: string;
  watchItemId: string;
  organizationId: string;
  type: "SCORE_CHANGED" | "PRICE_MOVED" | "MOMENTUM_SHIFTED" | "OPPORTUNITY_EMERGED" | "OPPORTUNITY_DETERIORATED";
  title: string;
  description: string;
  previousValue: string | number | null;
  currentValue: string | number | null;
  severity: "INFO" | "WARNING" | "OPPORTUNITY";
  triggeredAt: Date;
  isRead: boolean;
}
