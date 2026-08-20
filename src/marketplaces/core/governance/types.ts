/**
 * SellerSalt — Marketplace Data Governance Types & Contracts
 * 
 * Formalizes explicit data governance, acquisition policies, retention boundaries,
 * and compliance standards across all supported ecommerce platforms.
 */

import type { MarketplaceId, DataSourceType, SignalProvenance } from "../types";

/**
 * Standard policy permission classification.
 * "UNKNOWN" and "REQUIRES_REVIEW" prevent silent assumptions of legal/commercial permissions.
 */
export type PolicyPermissionStatus =
  | "ALLOWED"
  | "CONDITIONALLY_ALLOWED"
  | "RESTRICTED"
  | "PROHIBITED"
  | "UNKNOWN"
  | "REQUIRES_REVIEW";

/**
 * Formal compliance and integration readiness status with respect to marketplace developer terms.
 */
export type ComplianceVerificationStatus =
  | "IMPLEMENTED"
  | "DESIGNED"
  | "PENDING_REVIEW"
  | "REQUIRES_PLATFORM_CONFIRMATION";

/**
 * Robots.txt and public crawler policy handling standard.
 */
export type RobotsPolicyHandling =
  | "RESPECTED"
  | "ROBOTS_TXT_GATED"
  | "NOT_APPLICABLE"
  | "REQUIRES_REVIEW";

/**
 * Retention and lifecycle rules for data originating from a marketplace.
 */
export interface MarketplaceRetentionRules {
  readonly maxSnapshotRetentionDays: number | null; // null = unbounded or driven by package tier
  readonly requiresPurgeOnDisconnect: boolean;
  readonly allowLongitudinalAggregation: boolean;
  readonly allowHistoricalDisplayAfterExpiry: boolean;
  readonly policyBasis: string;
}

/**
 * Caching and freshness boundaries.
 */
export interface MarketplaceCachingRules {
  readonly searchTtlSeconds: number;
  readonly productDetailTtlSeconds: number;
  readonly shopStatsTtlSeconds: number;
  readonly allowStaleDisplayOnError: boolean;
  readonly staleMaxAgeSeconds: number;
}

/**
 * Display, attribution, and trademark requirements.
 */
export interface MarketplaceDisplayRules {
  readonly requireMarketplaceDisclaimer: boolean;
  readonly requireSourceAttribution: boolean;
  readonly allowDirectDeepLinks: boolean;
  readonly disclaimerText?: string;
  readonly attributionFormat?: string;
}

/**
 * Acquisition concurrency and rate limiting policies.
 */
export interface MarketplaceRateLimitRules {
  readonly maxRequestsPerMinute: number;
  readonly maxConcurrentRequests: number;
  readonly backoffBaseSeconds: number;
  readonly maxRetries: number;
}

/**
 * Authentication and OAuth scope specifications.
 */
export interface MarketplaceAuthRequirements {
  readonly requiresOAuthForSellerData: boolean;
  readonly supportedScopes: string[];
  readonly requiredScopes: string[];
  readonly pkceRequired: boolean;
}

/**
 * Private and authenticated data governance rules.
 */
export interface MarketplacePrivateDataRules {
  readonly allowScrapingPrivateDashboards: false; // Permanent hard constraint
  readonly allowAuthenticatedSellerDataOnlyViaOAuth: true; // Permanent hard constraint
  readonly allowCredentialHarvesting: false; // Permanent hard constraint
  readonly allowCaptchaCircumvention: false; // Permanent hard constraint
}

/**
 * Product & Seller data boundaries.
 */
export interface MarketplaceEntityDataRules {
  readonly allowedPublicFields: string[];
  readonly restrictedPrivateFields: string[];
  readonly imageUsageRule: "HOTLINK_PERMITTED" | "THUMBNAIL_PROXY_ONLY" | "PROHIBITED" | "UNKNOWN";
  readonly sellerPIIRestricted: boolean;
}

/**
 * Authoritative Canonical Marketplace Data Governance Policy contract.
 */
export interface MarketplaceDataPolicy {
  readonly marketplace: MarketplaceId;
  readonly displayName: string;
  readonly documentationUrl: string;
  readonly complianceStatus: ComplianceVerificationStatus;
  readonly lastReviewedAt: Date;

  // Source-level permissions
  readonly allowedAcquisitionSources: DataSourceType[];
  readonly publicWebAllowed: PolicyPermissionStatus;
  readonly officialApiAvailable: PolicyPermissionStatus;
  readonly connectedStoreAllowed: PolicyPermissionStatus;
  readonly licensedProviderAllowed: PolicyPermissionStatus;
  readonly userImportAllowed: PolicyPermissionStatus;

  // Research domains & URLs
  readonly allowedResearchDomains: string[];
  readonly prohibitedPathPatterns: string[];

  // Rules & Subsystems
  readonly retentionRules: MarketplaceRetentionRules;
  readonly cachingRules: MarketplaceCachingRules;
  readonly displayRules: MarketplaceDisplayRules;
  readonly rateLimitRules: MarketplaceRateLimitRules;
  readonly robotsPolicy: RobotsPolicyHandling;
  readonly authRequirements: MarketplaceAuthRequirements;
  readonly privateDataRules: MarketplacePrivateDataRules;
  readonly entityDataRules: MarketplaceEntityDataRules;

  // Transparent governance disclosures
  readonly knownLimitations: string[];
  readonly operationalNotes: string[];
}

/**
 * Result of evaluating an acquisition request against governance policy.
 */
export interface GovernancePolicyDecision {
  readonly allowed: boolean;
  readonly status: PolicyPermissionStatus;
  readonly reason: string;
  readonly marketplace: MarketplaceId;
  readonly sourceType: DataSourceType;
  readonly requiresDisclaimer?: boolean;
  readonly requiredDisclaimerText?: string;
  readonly evaluatedAt: Date;
}

/**
 * Telemetry log for an acquisition attempt evaluated by the governance layer.
 */
export interface AcquisitionGovernanceLog {
  readonly id: string;
  readonly organizationId: string;
  readonly marketplace: MarketplaceId;
  readonly sourceType: DataSourceType;
  readonly purpose: string;
  readonly targetUrl?: string;
  readonly decision: PolicyPermissionStatus;
  readonly decisionReason: string;
  readonly executionSuccess?: boolean;
  readonly latencyMs?: number;
  readonly timestamp: Date;
}

/**
 * Canonical Data Trust evaluation summary for user-facing transparency.
 */
export interface DataTrustSummary {
  readonly overallTrustScore: number; // 0-100
  readonly sourceDiversityScore: number; // 0-100
  readonly freshnessScore: number; // 0-100
  readonly completenessScore: number; // 0-100
  readonly totalObservations: number;
  readonly observedMetricCount: number;
  readonly derivedMetricCount: number;
  readonly estimatedMetricCount: number;
  readonly unknownSignalCount: number;
  readonly primarySourceType: DataSourceType;
  readonly sourcesUsed: DataSourceType[];
  readonly policyComplianceStatus: PolicyPermissionStatus;
  readonly unknownSignals: string[];
  readonly transparentDisclosures: string[];
  readonly evaluatedAt: Date;
}
