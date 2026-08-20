/**
 * SellerSalt Canonical Opportunity Discovery 2.0 Types
 * 
 * Standardized data contracts for multi-domain opportunity discovery,
 * structured evidence graphs, deterministic explanations, momentum states,
 * and zero-fabrication provenance.
 */

import type { MarketplaceId, SignalProvenance, NormalizedProduct, NicheOpportunity } from "./types";
import type { FreshnessEvaluation } from "./acquisition/freshness";
import type { ResearchQualityTier } from "./acquisition/research-quality";
import type { PublicCategoryIntelligenceResult } from "./acquisition/categories";
import type { PublicShopResearchResult } from "./acquisition/shops";
import type { CanonicalKeywordObservation } from "./acquisition/keywords";

export type OpportunityType = "PRODUCT" | "KEYWORD" | "NICHE" | "CATEGORY" | "SELLER" | "MARKETPLACE";

export type MomentumState = "RISING" | "ACCELERATING" | "STABLE" | "COOLING" | "DECLINING" | "INSUFFICIENT_DATA";

export interface EvidenceSignal {
  id: string;
  name: string;
  value: any;
  provenance: SignalProvenance;
  impact: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "UNAVAILABLE";
  description: string;
}

export interface EvidenceSignalGroup {
  score: number | null; // 0 - 100
  status: "STRONG" | "MODERATE" | "WEAK" | "UNAVAILABLE";
  signals: EvidenceSignal[];
}

export interface OpportunityEvidenceGraph {
  demand: EvidenceSignalGroup;
  competition: EvidenceSignalGroup;
  economics: EvidenceSignalGroup;
  freshness: EvidenceSignalGroup;
  momentum: EvidenceSignalGroup;
}

export interface OpportunityExplanation {
  headline: string;
  whyPositive: string[];
  watchNegative: string[];
  unknownSignals: string[];
  confidenceReasoning: string;
  freshnessReasoning: string;
  recommendedAction: string;
}

export interface OpportunityItem {
  id: string;
  type: OpportunityType;
  targetId: string; // e.g. listingExternalId, keyword, category name, shop name, niche id
  title: string;
  subtitle?: string;
  marketplace: MarketplaceId;
  score: number | null; // 0 - 100, null if insufficient signals
  confidence: number; // 0 - 100 calibrated data completeness
  tier: string;
  verdict: string;
  verdictVariant: "success" | "warning" | "danger" | "info" | "neutral";
  explanation: OpportunityExplanation;
  evidence: OpportunityEvidenceGraph;
  supportingSignals: string[];
  negativeSignals: string[];
  unknownSignals: string[];
  provenance: SignalProvenance;
  freshness: FreshnessEvaluation;
  momentum: MomentumState;
  sampleSize: number;
  coverageQuality: {
    score: number;
    tier: ResearchQualityTier;
  };
  limitations: string[];
  recommendedNextActions: string[];
  rawDetails?: {
    product?: NormalizedProduct;
    niche?: NicheOpportunity;
    category?: PublicCategoryIntelligenceResult;
    shop?: PublicShopResearchResult;
    keyword?: CanonicalKeywordObservation;
  };
  isSaved?: boolean;
  savedAt?: Date;
  generatedAt: Date;
  observedAt: Date;
}

export interface OpportunityDiscoveryRequest {
  query?: string;
  marketplace?: MarketplaceId | "all";
  types?: OpportunityType[];
  minScore?: number;
  minConfidence?: number;
  momentumFilter?: MomentumState[];
  organizationId?: string;
  limit?: number;
  useCache?: boolean;
}

export interface OpportunityDiscoveryResponse {
  query?: string;
  marketplace: MarketplaceId | "all";
  totalOpportunitiesFound: number;
  opportunities: OpportunityItem[];
  topOpportunity?: OpportunityItem;
  breakdownByType: Record<OpportunityType, number>;
  sourceLineage: {
    liveObservations: number;
    historicalObservations: number;
    sourcesUsed: string[];
  };
  marketLimitations: string[];
  generatedAt: Date;
  durationMs: number;
}
