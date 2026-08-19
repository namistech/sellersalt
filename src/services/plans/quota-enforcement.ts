/**
 * SellerSalt Server-Side Quota Enforcement Engine
 * 
 * Enforces atomic subscription limits across monthly research, keyword generation,
 * SEO audits, and AI listing generations.
 * Strict multi-tenant isolation with organizationId scoping.
 */

import { prisma } from "@/lib/db";
import { getOrgPackage } from "@/lib/plan-limits";
import { PLAN_DEFINITIONS, PlanTierKey } from "./plan-capabilities";

export type QuotaAction =
  | "KEYWORD_SEARCH"
  | "PRODUCT_RESEARCH"
  | "SEO_AUDIT"
  | "AI_GENERATION"
  | "TRACK_SHOP"
  | "PLANNER_ITEM"
  | "CONNECT_STORE";

export interface QuotaCheckResult {
  allowed: boolean;
  tier: PlanTierKey;
  action: QuotaAction;
  limit: number;
  current: number;
  remaining: number;
  upgradeMessage?: string;
}

export async function checkQuota(
  organizationId: string,
  action: QuotaAction
): Promise<QuotaCheckResult> {
  const pkg = await getOrgPackage(organizationId);
  const tierKey = (pkg.key as PlanTierKey) || "STARTED";
  const planDef = PLAN_DEFINITIONS[tierKey] || PLAN_DEFINITIONS.STARTED;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let current = 0;
  let limit = 100;

  switch (action) {
    case "KEYWORD_SEARCH":
      limit = planDef.limits.monthlyKeywordSearches;
      current = await prisma.prospect.count({
        where: { organizationId, createdAt: { gte: startOfMonth } },
      });
      break;

    case "PRODUCT_RESEARCH":
      limit = planDef.limits.monthlyProductResearches;
      current = await prisma.prospect.count({
        where: { organizationId, createdAt: { gte: startOfMonth } },
      });
      break;

    case "SEO_AUDIT":
      limit = planDef.limits.monthlySeoAudits;
      current = await prisma.listingSeoAudit.count({
        where: { organizationId, createdAt: { gte: startOfMonth } },
      });
      break;

    case "AI_GENERATION":
      limit = planDef.limits.monthlyAiListingGenerations;
      current = await prisma.listingDraft.count({
        where: { organizationId, createdAt: { gte: startOfMonth } },
      });
      break;

    case "TRACK_SHOP":
      limit = planDef.limits.trackedCompetitorShops;
      current = await prisma.shopWatch.count({
        where: { organizationId, isActive: true },
      });
      break;

    case "PLANNER_ITEM":
      limit = planDef.limits.activePlannerItems;
      current = await prisma.plannerItem.count({
        where: { organizationId, status: { not: "ARCHIVED" } },
      });
      break;

    case "CONNECT_STORE":
      limit = planDef.limits.connectedEtsyStores;
      current = await prisma.sellerChannel.count({
        where: { organizationId, status: "ACTIVE" },
      });
      break;
  }

  const allowed = current < limit;
  const remaining = Math.max(0, limit - current);

  let upgradeMessage: string | undefined;
  if (!allowed) {
    upgradeMessage = `You have reached your ${planDef.name} limit for ${action.replace("_", " ").toLowerCase()} (${current}/${limit}). Upgrade to Pro to expand capacity.`;
  }

  return {
    allowed,
    tier: tierKey,
    action,
    limit,
    current,
    remaining,
    upgradeMessage,
  };
}

export interface PlanUsageSummary {
  planKey: PlanTierKey;
  planName: string;
  keywordSearch: QuotaCheckResult;
  productResearch: QuotaCheckResult;
  seoAudit: QuotaCheckResult;
  trackedShop: QuotaCheckResult;
}

/** The single real-data source for any UI that shows "your plan + current
 * usage" (dashboard, billing page, etc.) — never hand-roll a second query
 * against Prospect/ListingSeoAudit/ShopWatch counts or a second plan-name
 * lookup; call this instead so every surface agrees. */
export async function getPlanUsageSummary(organizationId: string): Promise<PlanUsageSummary> {
  const [keywordSearch, productResearch, seoAudit, trackedShop] = await Promise.all([
    checkQuota(organizationId, "KEYWORD_SEARCH"),
    checkQuota(organizationId, "PRODUCT_RESEARCH"),
    checkQuota(organizationId, "SEO_AUDIT"),
    checkQuota(organizationId, "TRACK_SHOP"),
  ]);

  const planKey = keywordSearch.tier;
  const planName = PLAN_DEFINITIONS[planKey]?.name ?? PLAN_DEFINITIONS.STARTED.name;

  return { planKey, planName, keywordSearch, productResearch, seoAudit, trackedShop };
}
