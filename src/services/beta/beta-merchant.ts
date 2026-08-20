/**
 * SellerSalt Beta Merchant Profile & Activation Funnel Service
 * 
 * Computes deterministic activation milestones and aggregates private-beta telemetry
 * for merchant validation and product-market readiness.
 */

import { prisma } from "@/lib/db";

export type BetaActivationMilestone = "ONBOARDED" | "ACTIVATED" | "ENGAGED" | "VALUE_REALIZED" | "PAID";

export interface BetaMerchantProfile {
  organizationId: string;
  organizationName: string;
  createdAt: Date;
  milestone: BetaActivationMilestone;
  metrics: {
    researchCount: number;
    validationCount: number;
    savedOpportunitiesCount: number;
    workspaceCount: number;
    aiDraftsCount: number;
    planKey: string;
    isPaidPlan: boolean;
  };
  lastActiveAt: Date;
}

export interface BetaFunnelSummary {
  totalMerchants: number;
  onboardedCount: number;
  activatedCount: number;
  engagedCount: number;
  valueRealizedCount: number;
  paidCount: number;
  conversionRates: {
    signupToActivatedPct: number | "INSUFFICIENT_DATA";
    activatedToEngagedPct: number | "INSUFFICIENT_DATA";
    engagedToValueRealizedPct: number | "INSUFFICIENT_DATA";
    valueRealizedToPaidPct: number | "INSUFFICIENT_DATA";
  };
}

export class BetaMerchantService {
  /**
   * Computes the deterministic activation milestone for a given organization.
   */
  public static async getMerchantProfile(organizationId: string): Promise<BetaMerchantProfile | null> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            researchRuns: true,
            prospects: true,
            plannerItems: true,
            listingDrafts: true,
            listingSeoAudits: true,
          },
        },
      },
    });

    if (!org) return null;

    const planKey = org.plan || "FREE";
    const isPaid = planKey === "PRO" || planKey === "AGENCY";

    const researchCount = org._count.researchRuns;
    const prospectsCount = org._count.prospects;
    const plannerCount = org._count.plannerItems;
    const aiDraftsCount = org._count.listingDrafts;
    const seoAuditsCount = org._count.listingSeoAudits;

    // Determine deterministic milestone
    let milestone: BetaActivationMilestone = "ONBOARDED";

    if (isPaid) {
      milestone = "PAID";
    } else if (plannerCount > 0 || aiDraftsCount > 0 || seoAuditsCount > 0) {
      milestone = "VALUE_REALIZED";
    } else if (researchCount >= 3 || prospectsCount >= 3) {
      milestone = "ENGAGED";
    } else if (researchCount >= 1 || prospectsCount >= 1) {
      milestone = "ACTIVATED";
    }

    return {
      organizationId: org.id,
      organizationName: org.name,
      createdAt: org.createdAt,
      milestone,
      metrics: {
        researchCount,
        validationCount: seoAuditsCount,
        savedOpportunitiesCount: prospectsCount,
        workspaceCount: plannerCount,
        aiDraftsCount,
        planKey,
        isPaidPlan: isPaid,
      },
      lastActiveAt: org.updatedAt,
    };
  }

  /**
   * Aggregates the private beta activation funnel across all registered merchants.
   */
  public static async getBetaFunnel(): Promise<BetaFunnelSummary> {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            researchRuns: true,
            prospects: true,
            plannerItems: true,
            listingDrafts: true,
            listingSeoAudits: true,
          },
        },
      },
    });

    const total = orgs.length;
    if (total === 0) {
      return {
        totalMerchants: 0,
        onboardedCount: 0,
        activatedCount: 0,
        engagedCount: 0,
        valueRealizedCount: 0,
        paidCount: 0,
        conversionRates: {
          signupToActivatedPct: "INSUFFICIENT_DATA",
          activatedToEngagedPct: "INSUFFICIENT_DATA",
          engagedToValueRealizedPct: "INSUFFICIENT_DATA",
          valueRealizedToPaidPct: "INSUFFICIENT_DATA",
        },
      };
    }

    let onboarded = 0;
    let activated = 0;
    let engaged = 0;
    let valueRealized = 0;
    let paid = 0;

    for (const org of orgs) {
      onboarded++;
      const resCount = org._count.researchRuns;
      const prosCount = org._count.prospects;
      const planCount = org._count.plannerItems;
      const draftCount = org._count.listingDrafts;
      const auditCount = org._count.listingSeoAudits;

      if (resCount >= 1 || prosCount >= 1) activated++;
      if (resCount >= 3 || prosCount >= 3) engaged++;
      if (planCount > 0 || draftCount > 0 || auditCount > 0) valueRealized++;
      if (org.plan === "PRO" || org.plan === "AGENCY") paid++;
    }

    const calcPct = (num: number, denom: number): number | "INSUFFICIENT_DATA" => {
      if (denom === 0) return "INSUFFICIENT_DATA";
      return Math.round((num / denom) * 100);
    };

    return {
      totalMerchants: total,
      onboardedCount: onboarded,
      activatedCount: activated,
      engagedCount: engaged,
      valueRealizedCount: valueRealized,
      paidCount: paid,
      conversionRates: {
        signupToActivatedPct: calcPct(activated, onboarded),
        activatedToEngagedPct: calcPct(engaged, activated),
        engagedToValueRealizedPct: calcPct(valueRealized, engaged),
        valueRealizedToPaidPct: calcPct(paid, valueRealized),
      },
    };
  }
}
