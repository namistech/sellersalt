/**
 * SellerSalt Canonical Product Validation & Commercial Decision Types
 * 
 * Sits above Acquisition -> Observations -> Intelligence -> Opportunities
 * and transforms observable market signals into structured commercial decision support.
 * 
 * ZERO-FABRICATION RULE:
 * - Missing metrics remain strictly null.
 * - Exact search volumes and exact private store revenues are strictly UNAVAILABLE.
 * - User-supplied economics are strictly marked USER_DERIVED and separated from marketplace observations.
 */

import type { MarketplaceId, SignalProvenance, NormalizedProduct } from "../types";
import type { FreshnessEvaluation } from "../acquisition/freshness";
import type { ResearchQualityTier } from "../acquisition/research-quality";
import type { MomentumState, EvidenceSignal } from "../discovery-types";

export type ValidationVerdict =
  | "STRONG_CANDIDATE"
  | "WORTH_INVESTIGATING"
  | "MIXED_SIGNALS"
  | "HIGH_COMPETITION"
  | "WEAK_DEMAND_SIGNAL"
  | "DECLINING_SIGNAL"
  | "INSUFFICIENT_DATA"
  | "UNAVAILABLE";

export type PricePositionTier =
  | "BELOW_MARKET"
  | "LOWER_MID_MARKET"
  | "MID_MARKET"
  | "UPPER_MID_MARKET"
  | "PREMIUM"
  | "OUTSIDE_OBSERVED_RANGE"
  | "INSUFFICIENT_DATA";

export type ValidationDepth = "QUICK" | "STANDARD" | "DEEP";

export interface DemandAssessment {
  state: "STRONG" | "MODERATE" | "WEAK" | "MIXED" | "INSUFFICIENT_DATA";
  demandProxyScore: number; // 0 - 100
  demandTier: string;
  observedListingsCount: number;
  observedReviewSum: number | null;
  observedFavoritesSum: number | null;
  reviewVelocityDaily: number | null;
  persistenceRating: string;
  signals: EvidenceSignal[];
  explanation: string;
}

export interface CompetitionAssessment {
  state: "LOW" | "MODERATE" | "HIGH" | "EXTREME" | "INSUFFICIENT_DATA";
  competitionScore: number; // 0 - 100 (higher = more intense incumbent competition)
  observedSellerCount: number;
  sellerConcentrationIndex: number | null; // Herfindahl-Hirschman index proxy (0 - 100)
  reviewBarrierRating: "LOW" | "MODERATE" | "HIGH" | "UNAVAILABLE";
  topSellersDominancePercent: number | null;
  signals: EvidenceSignal[];
  explanation: string;
}

export interface EconomicsAssessment {
  state: "STRONG" | "VIABLE" | "COMPRESSED" | "UNAVAILABLE";
  observedMinPrice: number | null;
  observedMedianPrice: number | null;
  observedMaxPrice: number | null;
  percentile10: number | null;
  percentile25: number | null;
  percentile75: number | null;
  percentile90: number | null;
  commonPriceBand: { min: number; max: number } | null;
  discountPrevalencePercent: number | null;
  candidatePrice?: number | null;
  candidatePricePosition?: PricePositionTier;
  explanation: string;
}

export interface UserUnitEconomicsInputs {
  sellingPrice: number;
  cogs: number;
  shippingCost?: number;
  packagingCost?: number;
  marketplaceFeePercent?: number; // e.g. 6.5 for Etsy, 15 for Amazon
  paymentProcessingFeePercent?: number; // e.g. 3.0 + fixed
  advertisingPercent?: number; // e.g. 10% target ACOS / spend
  returnAllowancePercent?: number; // e.g. 2%
  otherFixedCost?: number;
}

export interface UserUnitEconomicsReport {
  sellingPrice: number;
  totalDirectCosts: number;
  marketplaceFees: number;
  paymentFees: number;
  advertisingCost: number;
  grossProfit: number;
  contributionMargin: number;
  marginPercent: number;
  breakEvenPrice: number;
  maxAllowableCac: number;
  provenance: "USER_DERIVED";
  notes: string[];
}

export interface MomentumAssessment {
  state: MomentumState;
  productMomentum: MomentumState;
  keywordMomentum: MomentumState;
  nicheMomentum: MomentumState;
  categoryMomentum: MomentumState;
  reviewVelocityDaily: number | null;
  hasLongitudinalData: boolean;
  explanation: string;
}

export interface SaturationAssessment {
  state: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH" | "INSUFFICIENT_DATA";
  densityIndex: number; // 0 - 100
  observedListingCount: number;
  observedSellerCount: number;
  duplicateListingRatio: number | null;
  explanation: string;
}

export interface DifferentiationAssessment {
  commonAttributes: string[];
  underrepresentedAttributes: string[];
  priceGaps: string[];
  keywordGaps: string[];
  categoryGaps: string[];
  observableOpportunities: string[];
  explanation: string;
}

export interface ValidationScoreBreakdown {
  score: number | null; // 0 - 100
  confidence: number; // 0 - 100 calibrated signal completeness
  demandFactor: number | null;
  competitionFactor: number | null;
  economicsFactor: number | null;
  momentumFactor: number | null;
  freshnessFactor: number | null;
  dynamicWeights: Record<string, number>;
  explanation: string;
}

export interface ProductValidationReport {
  id: string;
  organizationId?: string;
  researchRunId?: string;
  productId?: string;
  productTitle: string;
  query: string;
  marketplace: MarketplaceId | "all";
  category?: string;
  niche?: string;
  depth: ValidationDepth;
  
  // Executive Decision
  verdict: ValidationVerdict;
  verdictLabel: string;
  verdictVariant: "success" | "warning" | "danger" | "info" | "neutral";
  recommendation: string;
  scoreBreakdown: ValidationScoreBreakdown;
  
  // Detailed Multi-Dimensional Assessments
  demand: DemandAssessment;
  competition: CompetitionAssessment;
  economics: EconomicsAssessment;
  momentum: MomentumAssessment;
  saturation: SaturationAssessment;
  differentiation: DifferentiationAssessment;
  freshness: FreshnessEvaluation;
  researchQuality: {
    score: number;
    tier: ResearchQualityTier;
  };
  
  // Optional User-Supplied Unit Economics
  userEconomics?: UserUnitEconomicsReport;
  
  // Cross-Marketplace Comparisons (if multi-marketplace observations exist)
  crossMarketplaceComparison?: {
    marketplaces: {
      marketplace: MarketplaceId;
      score: number | null;
      confidence: number | null;
      status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
      observedPrice: number | null;
      observedReviewCount: number | null;
    }[];
    leadMarketplace?: MarketplaceId;
  };
  
  // Qualitative Decision Blocks
  topReasonsToPursue: string[];
  strongestRisks: string[];
  unobservedSignals: string[];
  limitations: string[];
  recommendedNextActions: string[];
  
  // Lineage & Metadata
  sampleProducts: NormalizedProduct[];
  firstObservedAt: Date;
  lastObservedAt: Date;
  validatedAt: Date;
  durationMs: number;
}

export interface ProductValidationRequest {
  query?: string;
  productId?: string;
  marketplace?: MarketplaceId | "all";
  depth?: ValidationDepth;
  candidatePrice?: number;
  category?: string;
  niche?: string;
  userEconomics?: UserUnitEconomicsInputs;
  organizationId?: string;
}
