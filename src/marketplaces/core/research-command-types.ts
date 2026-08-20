/**
 * SellerSalt Product Research Command Center Domain Types
 * 
 * Canonical contracts for the unified research session, market overview,
 * multi-marketplace coverage, keyword intelligence, competition density,
 * momentum, opportunity handoffs, validation, comparison, and research queue.
 */

import type { MarketplaceId, NormalizedProduct, SignalProvenance } from "./types";
import type { OpportunityItem } from "./discovery-types";
import type { ProductValidationReport } from "./validation/types";
import type { FreshnessEvaluation } from "./acquisition/freshness";
import type { ResearchQualityReport } from "./acquisition/research-quality";

export type ResearchDepthMode = "QUICK" | "STANDARD" | "DEEP";

export interface ProductResearchSessionRequest {
  query: string;
  marketplaces?: MarketplaceId[];
  depth?: ResearchDepthMode;
  maxProducts?: number;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  niche?: string;
  bypassCache?: boolean;
  includeHistorical?: boolean;
  organizationId?: string;
}

export interface MarketplaceResearchStatus {
  marketplace: MarketplaceId;
  status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";
  acquisitionMethod: string;
  itemCount: number;
  sampleCoverage: "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT";
  fieldCompletenessPercent: number;
  isLive: boolean;
  freshness: string;
  confidence: number;
  restrictions?: string[];
  limitations: string[];
}

export interface MarketOverviewStats {
  query: string;
  totalProductsObserved: number;
  marketplacesResearchedCount: number;
  marketplacesSuccessfulCount: number;
  minPrice: number | null;
  medianPrice: number | null;
  maxPrice: number | null;
  commonPriceBand: { min: number; max: number } | null;
  observedReviewSum: number | null;
  observedMedianReviews: number | null;
  uniqueSellersCount: number;
  sellerConcentrationIndex: number | null;
  overallDemandScore: number | null;
  overallCompetitionScore: number | null;
  overallOpportunityScore: number | null;
  overallMomentum: "RISING" | "ACCELERATING" | "STABLE" | "COOLING" | "DECLINING" | "INSUFFICIENT_DATA";
  overallConfidence: number;
  freshnessStatus: string;
}

export interface KeywordClusterItem {
  term: string;
  category: "MATERIAL_STYLE" | "RECIPIENT_OCCASION" | "PRODUCT_MODIFIER" | "GENERAL";
  listingPrevalencePercent: number;
  sellerPrevalencePercent: number;
  medianPrice: number | null;
  intent: "INFORMATIONAL" | "COMMERCIAL_INVESTIGATION" | "HIGH_PURCHASE_INTENT" | "TRANSACTIONAL";
  momentum: "RISING" | "STABLE" | "DECLINING" | "INSUFFICIENT_DATA";
  marketplacePresence: MarketplaceId[];
  searchVolume: null; // Strictly null per Zero-Fabrication Contract
  confidence: number;
  provenance: SignalProvenance;
}

export interface DominantSellerProfile {
  name: string;
  marketplace: MarketplaceId;
  observedListingsCount: number;
  observedTotalReviews: number | null;
  medianListingPrice: number | null;
  shareOfObservedCatalogPercent: number;
  establishedBarrier: "HIGH" | "MODERATE" | "LOW";
}

export interface CompetitionIntelligenceSummary {
  observedSellerCount: number;
  sellerConcentrationIndex: number | null;
  reviewBarrierRating: "HIGH" | "MODERATE" | "LOW";
  dominantSellers: DominantSellerProfile[];
  catalogConcentrationPercent: number | null;
  explanation: string;
}

export interface AcquisitionTraceStep {
  stepIndex: number;
  action: string;
  marketplace?: string;
  source: string;
  status: "SUCCESS" | "PARTIAL" | "SKIPPED" | "FAILED" | "RESTRICTED";
  durationMs: number;
  recordsAcquired: number;
  details: string;
}

export interface CommercialDecisionSummary {
  verdict: string;
  verdictLabel: string;
  verdictVariant: "success" | "warning" | "danger" | "info" | "neutral";
  recommendation: string;
  topReasons: string[];
  topRisks: string[];
  unobservedSignals: string[];
  recommendedNextActions: string[];
}

export interface ProductResearchSessionResult {
  sessionId: string;
  researchRunId?: string;
  organizationId?: string;
  query: string;
  normalizedQuery: string;
  variants: string[];
  marketplaces: MarketplaceId[];
  depth: ResearchDepthMode;
  overview: MarketOverviewStats;
  marketplaceCoverage: MarketplaceResearchStatus[];
  products: NormalizedProduct[];
  keywords: KeywordClusterItem[];
  competition: CompetitionIntelligenceSummary;
  opportunities: OpportunityItem[];
  validation?: ProductValidationReport;
  commercialDecision: CommercialDecisionSummary;
  researchQuality: ResearchQualityReport;
  freshness: FreshnessEvaluation;
  acquisitionTrace: AcquisitionTraceStep[];
  limitations: string[];
  isCached: boolean;
  durationMs: number;
  createdAt: Date;
}

export type ResearchQueueTargetType =
  | "PRODUCT"
  | "KEYWORD"
  | "NICHE"
  | "CATEGORY"
  | "SELLER"
  | "OPPORTUNITY";

export interface ResearchQueueItem {
  id: string;
  organizationId: string;
  targetType: ResearchQueueTargetType;
  identifier: string;
  title: string;
  marketplace: string;
  query: string;
  latestScore: number | null;
  latestMomentum: string | null;
  latestValidationStatus: string | null;
  notes?: string;
  savedAt: Date;
  lastResearchedAt: Date;
}
