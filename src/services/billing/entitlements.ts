/**
 * SellerSalt Authoritative Entitlement Engine
 * 
 * Single source of truth for subscription status, feature access,
 * trial timers, and quota consumption across Web, API, and Extension.
 */

import { prisma } from "@/lib/db";
import { getOrgPackage } from "@/lib/plan-limits";
import {
  PLAN_DEFINITIONS,
  PlanTierKey,
  getFeatureAccess,
} from "@/services/plans/plan-capabilities";

export interface AccountEntitlements {
  organizationId: string;
  planKey: PlanTierKey;
  planName: string;
  status: "FREE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  isTrial: boolean;
  trialDaysRemaining: number | null;
  features: {
    canConnectEtsy: boolean;
    canTrackCompetitors: boolean;
    canGenerateListingCopy: boolean;
    canExportData: boolean;
    canUseAdvancedTracking: boolean;
    canManageMultipleStores: boolean;
    canAccessAgencyTools: boolean;
  };
  limits: typeof PLAN_DEFINITIONS.STARTED.limits;
  usage: {
    keywordSearches: number;
    productResearches: number;
    seoAudits: number;
    trackedShops: number;
    plannerItems: number;
    connectedStores: number;
  };
}

export async function getAccountEntitlements(
  organizationId: string
): Promise<AccountEntitlements> {
  const pkg = await getOrgPackage(organizationId);
  const tierKey = (pkg.key as PlanTierKey) || "STARTED";
  const planDef = PLAN_DEFINITIONS[tierKey] || PLAN_DEFINITIONS.STARTED;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Fetch live usage counters with tenant boundaries
  const [
    prospectsCount,
    seoAuditsCount,
    trackedShopsCount,
    plannerItemsCount,
    connectedStoresCount,
    orgRecord,
  ] = await Promise.all([
    prisma.prospect.count({
      where: { organizationId, createdAt: { gte: startOfMonth } },
    }),
    prisma.listingSeoAudit.count({
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
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { createdAt: true },
    }),
  ]);

  const features = getFeatureAccess(tierKey);

  return {
    organizationId,
    planKey: tierKey,
    planName: planDef.name,
    status: tierKey === "FREE" ? "FREE" : "ACTIVE",
    isTrial: false,
    trialDaysRemaining: null,
    features,
    limits: planDef.limits,
    usage: {
      keywordSearches: prospectsCount,
      productResearches: prospectsCount,
      seoAudits: seoAuditsCount,
      trackedShops: trackedShopsCount,
      plannerItems: plannerItemsCount,
      connectedStores: connectedStoresCount,
    },
  };
}
