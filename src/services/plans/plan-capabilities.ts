/**
 * SellerSalt Centralized Plan & Capability Architecture
 * 
 * Defines feature tiers, usage quotas, and locked-feature diagnostics across
 * Free, Starter, Growth/Pro, and Agency subscription tiers.
 * Enforces server-side quota checks with graceful frontend upgrade prompts.
 */

export type PlanTierKey = "FREE" | "STARTED" | "PRO" | "AGENCY";

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  minTier: PlanTierKey;
  isUnlocked: boolean;
}

export interface PlanDefinition {
  key: PlanTierKey;
  name: string;
  priceMonthlyUsd: number;
  priceAnnualMonthlyUsd: number;
  description: string;
  badge?: string;
  limits: {
    monthlyKeywordSearches: number;
    monthlyProductResearches: number;
    trackedCompetitorShops: number;
    activePlannerItems: number;
    monthlyAiListingGenerations: number;
    monthlySeoAudits: number;
    connectedEtsyStores: number;
    exportEnabled: boolean;
    browserExtensionEnabled: boolean;
  };
}

export const PLAN_DEFINITIONS: Record<PlanTierKey, PlanDefinition> = {
  FREE: {
    key: "FREE",
    name: "Free Explorer",
    priceMonthlyUsd: 0,
    priceAnnualMonthlyUsd: 0,
    description: "Sample SellerSalt market intelligence and evaluate product opportunities.",
    limits: {
      monthlyKeywordSearches: 15,
      monthlyProductResearches: 10,
      trackedCompetitorShops: 1,
      activePlannerItems: 3,
      monthlyAiListingGenerations: 2,
      monthlySeoAudits: 3,
      connectedEtsyStores: 0,
      exportEnabled: false,
      browserExtensionEnabled: true,
    },
  },
  STARTED: {
    key: "STARTED",
    name: "Starter",
    priceMonthlyUsd: 19,
    priceAnnualMonthlyUsd: 15,
    description: "For active sellers launching new listings and tracking competitors.",
    limits: {
      monthlyKeywordSearches: 250,
      monthlyProductResearches: 150,
      trackedCompetitorShops: 10,
      activePlannerItems: 25,
      monthlyAiListingGenerations: 20,
      monthlySeoAudits: 25,
      connectedEtsyStores: 1,
      exportEnabled: true,
      browserExtensionEnabled: true,
    },
  },
  PRO: {
    key: "PRO",
    name: "Growth & Pro",
    priceMonthlyUsd: 49,
    priceAnnualMonthlyUsd: 39,
    badge: "Most Popular",
    description: "For scaling multi-product storefronts seeking automated surveillance & strategy.",
    limits: {
      monthlyKeywordSearches: 2500,
      monthlyProductResearches: 1000,
      trackedCompetitorShops: 50,
      activePlannerItems: 150,
      monthlyAiListingGenerations: 100,
      monthlySeoAudits: 150,
      connectedEtsyStores: 5,
      exportEnabled: true,
      browserExtensionEnabled: true,
    },
  },
  AGENCY: {
    key: "AGENCY",
    name: "Agency & Enterprise",
    priceMonthlyUsd: 199,
    priceAnnualMonthlyUsd: 159,
    badge: "Enterprise",
    description: "For multi-brand agencies managing client catalogs and market intelligence.",
    limits: {
      monthlyKeywordSearches: 25000,
      monthlyProductResearches: 10000,
      trackedCompetitorShops: 250,
      activePlannerItems: 1000,
      monthlyAiListingGenerations: 1000,
      monthlySeoAudits: 1000,
      connectedEtsyStores: 25,
      exportEnabled: true,
      browserExtensionEnabled: true,
    },
  },
};

const TIER_ORDER: Record<PlanTierKey, number> = {
  FREE: 0,
  STARTED: 1,
  PRO: 2,
  AGENCY: 3,
};

export function isTierSufficient(currentTier: PlanTierKey, requiredTier: PlanTierKey): boolean {
  return (TIER_ORDER[currentTier] ?? 0) >= (TIER_ORDER[requiredTier] ?? 0);
}

export function getFeatureAccess(currentTier: PlanTierKey = "STARTED") {
  return {
    canConnectEtsy: isTierSufficient(currentTier, "STARTED"),
    canTrackCompetitors: isTierSufficient(currentTier, "FREE"),
    canGenerateListingCopy: isTierSufficient(currentTier, "STARTED"),
    canExportData: isTierSufficient(currentTier, "STARTED"),
    canUseAdvancedSurveillance: isTierSufficient(currentTier, "PRO"),
    canManageMultipleStores: isTierSufficient(currentTier, "PRO"),
    canAccessAgencyTools: isTierSufficient(currentTier, "AGENCY"),
  };
}
