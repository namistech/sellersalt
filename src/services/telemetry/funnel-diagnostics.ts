/**
 * SellerSalt Funnel Diagnostics Engine
 * 
 * Analyzes transition drop-offs across the 7-step merchant commercial journey:
 * ONBOARDING → DISCOVER → RESEARCH → VALIDATE → PLAN → LAUNCH → PAID.
 * 
 * Invariant: Never substitutes 0% for missing data; uses INSUFFICIENT_DATA when sample is empty.
 */

import { prisma } from "@/lib/db";

export interface FunnelStageMetric {
  stage: string;
  order: number;
  eligibleMerchants: number;
  completedMerchants: number;
  dropOffs: number;
  conversionPct: number | "INSUFFICIENT_DATA";
}

export interface FunnelDiagnosticsReport {
  timestamp: string;
  sampleSize: number;
  stages: FunnelStageMetric[];
  highestDropOffStage?: string;
}

export class FunnelDiagnosticsEngine {
  /**
   * Generates a deterministic funnel drop-off diagnostic report.
   */
  public static async analyzeFunnel(): Promise<FunnelDiagnosticsReport> {
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
        timestamp: new Date().toISOString(),
        sampleSize: 0,
        stages: [
          { stage: "ONBOARDING", order: 1, eligibleMerchants: 0, completedMerchants: 0, dropOffs: 0, conversionPct: "INSUFFICIENT_DATA" },
          { stage: "DISCOVER", order: 2, eligibleMerchants: 0, completedMerchants: 0, dropOffs: 0, conversionPct: "INSUFFICIENT_DATA" },
          { stage: "RESEARCH", order: 3, eligibleMerchants: 0, completedMerchants: 0, dropOffs: 0, conversionPct: "INSUFFICIENT_DATA" },
          { stage: "VALIDATE", order: 4, eligibleMerchants: 0, completedMerchants: 0, dropOffs: 0, conversionPct: "INSUFFICIENT_DATA" },
          { stage: "PLAN", order: 5, eligibleMerchants: 0, completedMerchants: 0, dropOffs: 0, conversionPct: "INSUFFICIENT_DATA" },
          { stage: "LAUNCH", order: 6, eligibleMerchants: 0, completedMerchants: 0, dropOffs: 0, conversionPct: "INSUFFICIENT_DATA" },
          { stage: "PAID", order: 7, eligibleMerchants: 0, completedMerchants: 0, dropOffs: 0, conversionPct: "INSUFFICIENT_DATA" },
        ],
      };
    }

    let cOnboarding = total; // All registered organizations completed signup/onboarding
    let cDiscover = 0;
    let cResearch = 0;
    let cValidate = 0;
    let cPlan = 0;
    let cLaunch = 0;
    let cPaid = 0;

    for (const org of orgs) {
      const { researchRuns, prospects, plannerItems, listingDrafts, listingSeoAudits } = org._count;
      const isPaid = org.plan === "PRO" || org.plan === "AGENCY";

      if (researchRuns >= 1) cDiscover++;
      if (prospects >= 1 || researchRuns >= 2) cResearch++;
      if (listingSeoAudits >= 1 || prospects >= 3) cValidate++;
      if (plannerItems >= 1) cPlan++;
      if (listingDrafts >= 1) cLaunch++;
      if (isPaid) cPaid++;
    }

    const calc = (eligible: number, completed: number): { dropOffs: number; conversionPct: number | "INSUFFICIENT_DATA" } => {
      if (eligible === 0) return { dropOffs: 0, conversionPct: "INSUFFICIENT_DATA" };
      const drop = Math.max(0, eligible - completed);
      const pct = Math.round((completed / eligible) * 100);
      return { dropOffs: drop, conversionPct: pct };
    };

    const s1 = { stage: "ONBOARDING", order: 1, eligibleMerchants: total, completedMerchants: cOnboarding, ...calc(total, cOnboarding) };
    const s2 = { stage: "DISCOVER", order: 2, eligibleMerchants: cOnboarding, completedMerchants: cDiscover, ...calc(cOnboarding, cDiscover) };
    const s3 = { stage: "RESEARCH", order: 3, eligibleMerchants: cDiscover, completedMerchants: cResearch, ...calc(cDiscover, cResearch) };
    const s4 = { stage: "VALIDATE", order: 4, eligibleMerchants: cResearch, completedMerchants: cValidate, ...calc(cResearch, cValidate) };
    const s5 = { stage: "PLAN", order: 5, eligibleMerchants: cValidate, completedMerchants: cPlan, ...calc(cValidate, cPlan) };
    const s6 = { stage: "LAUNCH", order: 6, eligibleMerchants: cPlan, completedMerchants: cLaunch, ...calc(cPlan, cLaunch) };
    const s7 = { stage: "PAID", order: 7, eligibleMerchants: cLaunch > 0 ? cLaunch : total, completedMerchants: cPaid, ...calc(cLaunch > 0 ? cLaunch : total, cPaid) };

    const stages = [s1, s2, s3, s4, s5, s6, s7];

    // Find stage with highest absolute drop-off
    let highestDrop = stages[1];
    for (let i = 1; i < stages.length; i++) {
      if (stages[i].dropOffs > highestDrop.dropOffs) {
        highestDrop = stages[i];
      }
    }

    return {
      timestamp: new Date().toISOString(),
      sampleSize: total,
      stages,
      highestDropOffStage: highestDrop.dropOffs > 0 ? highestDrop.stage : undefined,
    };
  }
}
