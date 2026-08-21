/**
 * SellerSalt Canonical Entitlement & Commercial Access Engine
 * 
 * Single authoritative server-side resolver answering:
 * - What plan and subscription status does this organization have?
 * - Which features and marketplace capabilities are enabled?
 * - How much quota remains across research, SEO, AI, shops, and planner?
 * - When do monthly limits reset?
 * 
 * Strict multi-tenant organizationId scoping with Zero-Fabrication integrity.
 */

import { prisma } from "@/lib/db";
import { getOrgPackage } from "@/lib/plan-limits";
import {
  PLAN_DEFINITIONS,
  PlanTierKey,
  getFeatureAccess,
} from "@/services/plans/plan-capabilities";
import {
  resolveSubscriptionState,
  resolveEffectiveTier,
  CanonicalSubscriptionState,
} from "./subscription-lifecycle";
import type { MarketplaceId } from "@/marketplaces/core/types";

export interface QuotaCounter {
  limit: number;
  used: number;
  remaining: number;
  resetsAt?: Date;
}

export interface OrganizationEntitlements {
  organizationId: string;
  planKey: PlanTierKey;
  planName: string;
  priceMonthlyUsd: number;
  subscriptionStatus: CanonicalSubscriptionState;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  provider?: string | null;
  features: {
    canConnectEtsy: boolean;
    canTrackCompetitors: boolean;
    canGenerateListingCopy: boolean;
    canExportData: boolean;
    canUseAdvancedTracking: boolean;
    canManageMultipleStores: boolean;
    canAccessAgencyTools: boolean;
    browserExtensionEnabled: boolean;
  };
  allowedMarketplaces: MarketplaceId[];
  discoveryDepth: "QUICK" | "STANDARD" | "DEEP";
  quotas: {
    productResearches: QuotaCounter;
    keywordSearches: QuotaCounter;
    seoAudits: QuotaCounter;
    aiListingGenerations: QuotaCounter;
    trackedCompetitorShops: QuotaCounter;
    activePlannerItems: QuotaCounter;
    connectedStores: QuotaCounter;
  };
}

export class EntitlementEngine {
  /**
   * Calculates the exact UTC timestamp for the next monthly quota reset (1st of next month, 00:00:00 UTC).
   */
  public static getQuotaResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return nextMonth;
  }

  /**
   * Resolves the full authoritative entitlement record for an organization.
   */
  public static async getEntitlements(organizationId: string): Promise<OrganizationEntitlements> {
    const [pkg, subscription] = await Promise.all([
      getOrgPackage(organizationId),
      prisma.subscription.findUnique({ where: { organizationId } }),
    ]);

    const assignedTier = (pkg.key as PlanTierKey) || "FREE";
    const subStatus = resolveSubscriptionState(subscription?.status, {
      currentPeriodEnd: subscription?.currentPeriodEnd,
    });
    const effectiveTier = resolveEffectiveTier(assignedTier, subStatus);
    const planDef = PLAN_DEFINITIONS[effectiveTier] || PLAN_DEFINITIONS.FREE;

    // Monthly start date in UTC
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const resetsAt = this.getQuotaResetDate();

    // Query real PostgreSQL records
    const [
      prospectsCount,
      seoAuditsCount,
      aiDraftsCount,
      trackedShopsCount,
      plannerItemsCount,
      connectedStoresCount,
    ] = await Promise.all([
      prisma.prospect.count({
        where: { organizationId, createdAt: { gte: startOfMonth } },
      }),
      prisma.listingSeoAudit.count({
        where: { organizationId, createdAt: { gte: startOfMonth } },
      }),
      prisma.listingDraft.count({
        where: { organizationId, createdAt: { gte: startOfMonth } },
      }),
      prisma.shopWatch.count({
        where: { organizationId, isActive: true },
      }),
      prisma.plannerItem.count({
        where: { organizationId, status: { not: "ARCHIVED" } },
      }),
      prisma.sellerChannel.count({
        where: { organizationId, status: "ACTIVE" },
      }),
    ]);

    const featureAccess = getFeatureAccess(effectiveTier);

    // Marketplace capability gating per tier
    const allowedMarketplaces: MarketplaceId[] =
      effectiveTier === "FREE"
        ? ["etsy"]
        : effectiveTier === "STARTED"
        ? ["etsy", "amazon"]
        : effectiveTier === "PRO"
        ? ["etsy", "amazon", "ebay", "walmart"]
        : ["etsy", "amazon", "ebay", "walmart", "tiktok_shop"];

    const discoveryDepth: "QUICK" | "STANDARD" | "DEEP" =
      effectiveTier === "FREE" ? "QUICK" : effectiveTier === "STARTED" ? "STANDARD" : "DEEP";

    const makeQuota = (limit: number, used: number, isMonthly = true): QuotaCounter => ({
      limit,
      used,
      remaining: Math.max(0, limit - used),
      resetsAt: isMonthly ? resetsAt : undefined,
    });

    return {
      organizationId,
      planKey: effectiveTier,
      planName: planDef.name,
      priceMonthlyUsd: planDef.priceMonthlyUsd,
      subscriptionStatus: subStatus,
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
      provider: subscription?.provider || null,
      features: {
        canConnectEtsy: featureAccess.canConnectEtsy,
        canTrackCompetitors: featureAccess.canTrackCompetitors,
        canGenerateListingCopy: featureAccess.canGenerateListingCopy,
        canExportData: featureAccess.canExportData,
        canUseAdvancedTracking: featureAccess.canUseAdvancedTracking,
        canManageMultipleStores: featureAccess.canManageMultipleStores,
        canAccessAgencyTools: featureAccess.canAccessAgencyTools,
        browserExtensionEnabled: planDef.limits.browserExtensionEnabled,
      },
      allowedMarketplaces,
      discoveryDepth,
      quotas: {
        productResearches: makeQuota(planDef.limits.monthlyProductResearches, prospectsCount, true),
        keywordSearches: makeQuota(planDef.limits.monthlyKeywordSearches, prospectsCount, true),
        seoAudits: makeQuota(planDef.limits.monthlySeoAudits, seoAuditsCount, true),
        aiListingGenerations: makeQuota(planDef.limits.monthlyAiListingGenerations, aiDraftsCount, true),
        trackedCompetitorShops: makeQuota(planDef.limits.trackedCompetitorShops, trackedShopsCount, false),
        activePlannerItems: makeQuota(planDef.limits.activePlannerItems, plannerItemsCount, false),
        connectedStores: makeQuota(planDef.limits.connectedEtsyStores, connectedStoresCount, false),
      },
    };
  }

  /**
   * Verifies if an organization has permission to search or research a specific marketplace.
   */
  public static async canAccessMarketplace(
    organizationId: string,
    marketplace: MarketplaceId
  ): Promise<boolean> {
    const entitlements = await this.getEntitlements(organizationId);
    return entitlements.allowedMarketplaces.includes(marketplace);
  }

  /**
   * Asserts whether a boolean feature flag is available on the organization's effective plan.
   */
  public static async hasFeature(
    organizationId: string,
    featureName: keyof OrganizationEntitlements["features"]
  ): Promise<boolean> {
    const entitlements = await this.getEntitlements(organizationId);
    return Boolean(entitlements.features[featureName]);
  }
}
