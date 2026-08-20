/**
 * SellerSalt — Batch 21 Domain Contracts
 * 
 * Proprietary Product Opportunity → Sourcing → Launch Intelligence Engine.
 * Complete domain models for Workspaces, Evidence Ledger, Attribute Intelligence,
 * Differentiation Builder 2.0, Market Positioning, Product Configurations,
 * Sourcing Specifications, Unit Economics Scenarios, Launch Readiness,
 * Commercial Decision Trees, Action Plans, and Information Value Gaps.
 */

import type { NormalizedProduct, MarketplaceId, SignalProvenance } from "./types";
import type { OpportunityScore3Breakdown } from "./autonomous-discovery-types";
import type { DataTrustSummary, MarketplaceDataPolicy } from "./governance/types";

// ============================================================================
// 1. Evidence Ledger Models
// ============================================================================

export type EvidenceCategory =
  | "PRODUCT_OBSERVATION"
  | "KEYWORD_OBSERVATION"
  | "SELLER_OBSERVATION"
  | "CATEGORY_OBSERVATION"
  | "PRICE_OBSERVATION"
  | "REVIEW_OBSERVATION"
  | "MOMENTUM_OBSERVATION"
  | "CROSS_MARKETPLACE_OBSERVATION"
  | "USER_INPUT"
  | "DERIVED_SIGNAL"
  | "UNKNOWN_SIGNAL";

export type EvidenceImpact = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "HIGH_RISK";

export interface EvidenceRecord {
  id: string;
  category: EvidenceCategory;
  title: string;
  statement: string;
  source: string; // e.g. "PUBLIC_WEB", "MARKETPLACE_API", "USER", "HISTORICAL_MEMORY"
  marketplace?: MarketplaceId;
  entityId?: string;
  exactMetric?: {
    label: string;
    value: string | number | boolean | null;
    unit?: string;
  };
  derivationMethod?: string;
  impact: EvidenceImpact;
  provenance: SignalProvenance; // "ACTUAL_DATA" | "ESTIMATED_VALUE" | "DERIVED_METRIC" | "UNAVAILABLE"
  confidence: number; // 0 - 100
  freshness: "LIVE" | "RECENT" | "STALE" | "HISTORICAL" | "UNKNOWN";
  observedAt: Date;
}

export interface EvidenceLedger {
  records: EvidenceRecord[];
  totalObservedRecords: number;
  totalDerivedRecords: number;
  totalUserInputRecords: number;
  totalUnknownRecords: number;
  overallConfidence: number;
  generatedAt: Date;
}

// ============================================================================
// 2. Product Attribute Intelligence Models
// ============================================================================

export type AttributeType =
  | "MATERIAL"
  | "COLOR"
  | "SIZE"
  | "DIMENSIONS"
  | "STYLE"
  | "FINISH"
  | "USE_CASE"
  | "RECIPIENT"
  | "OCCASION"
  | "FEATURE"
  | "FORMAT"
  | "BUNDLE"
  | "QUANTITY"
  | "COMPATIBILITY"
  | "PATTERN"
  | "DESIGN"
  | "FUNCTIONALITY"
  | "OTHER";

export interface ObservedAttributeValue {
  value: string;
  type: AttributeType;
  listingPrevalencePercent: number;
  observedListingCount: number;
  observedSellerCount: number;
  medianPriceAssociated: number | null;
  dominantMarketplaces: MarketplaceId[];
  isSaturated: boolean; // >= 50% prevalence
  isUnderrepresented: boolean; // < 15% prevalence
  provenance: SignalProvenance;
  freshness: string;
}

export interface ProductAttributeIntelligenceSummary {
  dominantAttributes: ObservedAttributeValue[];
  underrepresentedAttributes: ObservedAttributeValue[];
  saturatedAttributes: ObservedAttributeValue[];
  totalSampledListings: number;
  totalSampledSellers: number;
  notes: string[];
}

// ============================================================================
// 3. Differentiation Builder 2.0 Models
// ============================================================================

export interface DifferentiationCandidate {
  id: string;
  title: string;
  description: string;
  differentiationAngle: string;
  supportingEvidence: string[];
  observedPrevalencePercent: number;
  targetMarketPosition: string;
  observedPriceWindow: {
    min: number | null;
    median: number | null;
    max: number | null;
  };
  competitiveAdvantage: string;
  identifiedRisks: string[];
  unknowns: string[];
  confidence: number;
}

export interface DifferentiationBuilderResult {
  candidates: DifferentiationCandidate[];
  saturatedPatterns: string[];
  attributeGaps: string[];
  sellerConcentrationOpportunities: string[];
  summary: string;
}

// ============================================================================
// 4. Price Positioning & Market Position Models
// ============================================================================

export type MarketPriceTier =
  | "VALUE"
  | "LOWER_MID"
  | "MID_MARKET"
  | "UPPER_MID"
  | "PREMIUM";

export interface PricePositioningScenario {
  tier: MarketPriceTier;
  label: string;
  priceRange: { min: number | null; max: number | null };
  candidateTargetPrice: number | null;
  percentileRange: string;
  competitorListingCount: number;
  attributeContext: string[];
  strategicRationale: string;
  confidence: number;
  evidenceDepth: "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT_DATA";
}

export interface MarketPositioningAnalysis {
  empiricalQuantiles: {
    p10: number | null;
    p25: number | null;
    p50: number | null;
    p75: number | null;
    p90: number | null;
    min: number | null;
    max: number | null;
    sampleSize: number;
  };
  scenarios: PricePositioningScenario[];
  recommendedScenario: MarketPriceTier | "INSUFFICIENT_DATA";
  recommendationExplanation: string;
}

// ============================================================================
// 5. Product Configuration Builder Models
// ============================================================================

export interface ProductConfiguration {
  id: string;
  name: string;
  targetPositioning: MarketPriceTier;
  targetPrice: number | null;
  observedCombinations: Array<{
    type: AttributeType;
    value: string;
    prevalencePercent: number;
  }>;
  derivedConceptAngles: Array<{
    type: AttributeType;
    value: string;
    rationale: string;
  }>;
  materialsRequired: string[];
  bundleContents: string[];
  finishSpecification: string;
  packagingRequirement: string;
  differentiationRationale: string;
  unknownInputs: string[];
  confidence: number;
}

// ============================================================================
// 6. Sourcing Requirements Intelligence Models
// ============================================================================

export interface SourcingSpecification {
  id: string;
  baseProductName: string;
  observedMarketRequirements: string[];
  inferredProductRequirements: string[];
  userSuppliedRequirements: string[];
  requiredMaterials: Array<{ name: string; gradeSpec?: string; status: "OBSERVED" | "INFERRED" | "USER_INPUT" }>;
  requiredComponents: string[];
  dimensionsAndWeight: {
    dimensionsSummary: string;
    targetWeightGrams?: number | null;
  };
  finishRequirements: string[];
  packagingRequirements: string[];
  qualityAndCompliance: {
    safetyStandards: string[];
    certificationsToVerify: string[];
    testingRequirements: string[];
  };
  likelyManufacturingProcess: string;
  sourcingQuestionsForSuppliers: string[];
  requiredSupplierDataPoints: string[];
  unknownSourcingInputs: string[];
  userLandCostInput: number | null;
  userMoqInput: number | null;
  userLeadTimeDaysInput: number | null;
}

// ============================================================================
// 7. Unit Economics Scenario Engine 2.0 Models
// ============================================================================

export interface UserEconomicsInput {
  targetSalePrice: number;
  unitProductCost: number; // Landed supplier manufacturing cost
  packagingCost: number;
  inboundShippingCost: number;
  outboundShippingCost: number;
  marketplacePlatformFeePercent: number; // e.g. 6.5 for Etsy, 15 for Amazon
  paymentProcessingFeePercent: number; // e.g. 3.0
  paymentProcessingFixedFee: number; // e.g. 0.25
  fulfillmentCost: number;
  returnsAllowancePercent: number; // e.g. 2.0
  targetAdvertisingCostPerSale: number; // Target CAC
  taxesAllowancePercent: number; // e.g. 0.0
  otherFixedCostPerUnit: number;
}

export interface UnitEconomicsMetrics {
  revenue: number;
  totalDirectCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  marketplaceFeesTotal: number;
  contributionProfit: number;
  contributionMarginPercent: number;
  breakEvenPrice: number;
  maxAllowableCAC: number;
  isViable: boolean;
  notes: string[];
}

export interface EconomicsScenarioResult {
  scenario: "CONSERVATIVE" | "BASE" | "OPTIMISTIC";
  assumptions: string[];
  inputs: UserEconomicsInput;
  metrics: UnitEconomicsMetrics;
}

export interface UnitEconomicsAnalysis {
  scenarios: {
    conservative: EconomicsScenarioResult;
    base: EconomicsScenarioResult;
    optimistic: EconomicsScenarioResult;
  };
  verdict: "HIGHLY_VIABLE" | "MARGINALLY_VIABLE" | "HIGH_RISK" | "UNVIABLE" | "NEEDS_USER_INPUT";
  summary: string;
}

// ============================================================================
// 8. Launch Readiness & Uncertainty Value Models
// ============================================================================

export type LaunchReadinessStatus =
  | "READY_FOR_SOURCING"
  | "READY_FOR_SAMPLE"
  | "NEEDS_MORE_RESEARCH"
  | "NEEDS_UNIT_ECONOMICS"
  | "NEEDS_DIFFERENTIATION"
  | "NEEDS_SOURCING_DATA"
  | "HIGH_RISK"
  | "INSUFFICIENT_DATA";

export interface LaunchReadinessDimension {
  name: string;
  score: number; // 0 - 100
  status: "SATISFIED" | "WARNING" | "BLOCKING" | "UNKNOWN";
  evidence: string;
}

export interface LaunchReadinessAssessment {
  status: LaunchReadinessStatus;
  overallScore: number; // 0 - 100
  dimensions: LaunchReadinessDimension[];
  criticalBlockers: string[];
  recommendedMilestone: string;
  evaluatedAt: Date;
}

export interface InformationGap {
  id: string;
  unknownSignal: string;
  decisionImpact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  recommendedAction: string;
  estimatedEffort: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "RESOLVED" | "DEFERRED";
}

export interface InformationValueReport {
  gaps: InformationGap[];
  mostCriticalVerificationNext: string;
  uncertaintyRating: "LOW_UNCERTAINTY" | "MODERATE_UNCERTAINTY" | "HIGH_UNCERTAINTY" | "CRITICAL_UNCERTAINTY";
}

// ============================================================================
// 9. Commercial Decision Tree & Action Plan
// ============================================================================

export type CommercialDecisionVerdict =
  | "PURSUE"
  | "INVESTIGATE"
  | "TEST"
  | "WAIT"
  | "REJECT"
  | "INSUFFICIENT_DATA";

export interface CommercialDecision {
  verdict: CommercialDecisionVerdict;
  why: string;
  positiveEvidence: string[];
  negativeEvidence: string[];
  unknownSignals: string[];
  keyRisks: string[];
  confidence: number;
  evaluatedAt: Date;
}

export interface PrioritizedActionItem {
  id: string;
  priority: 1 | 2 | 3 | 4 | 5;
  action: string;
  reason: string;
  evidenceBasis: string;
  blockingIssue?: string;
  expectedDecisionImpact: string;
  isCompleted: boolean;
}

export interface ActionPlan {
  items: PrioritizedActionItem[];
  primaryFocus: string;
  generatedAt: Date;
}

// ============================================================================
// 10. Canonical Product Opportunity Workspace
// ============================================================================

export interface ProductOpportunityWorkspace {
  id: string;
  organizationId: string;
  canonicalProductId: string;
  title: string;
  query: string;
  marketplaces: MarketplaceId[];
  category?: string;
  niche?: string;
  status: "ACTIVE" | "ARCHIVED" | "SOURCING" | "TESTING" | "LAUNCHED";
  
  opportunityScore: OpportunityScore3Breakdown;
  confidenceScore: number;
  
  // Subsystem States
  evidenceLedger: EvidenceLedger;
  attributeIntelligence: ProductAttributeIntelligenceSummary;
  differentiation: DifferentiationBuilderResult;
  positioning: MarketPositioningAnalysis;
  configuration: ProductConfiguration;
  sourcing: SourcingSpecification;
  economics: UnitEconomicsAnalysis;
  readiness: LaunchReadinessAssessment;
  informationGaps: InformationValueReport;
  commercialDecision: CommercialDecision;
  actionPlan: ActionPlan;
  dataTrust: DataTrustSummary;
  governancePolicy?: MarketplaceDataPolicy;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
