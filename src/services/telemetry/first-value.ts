/**
 * SellerSalt First-Value Detection Engine
 * 
 * Deterministically evaluates whether a merchant has crossed the threshold from
 * passive feature exploration to genuine commercial value realization.
 * 
 * Invariant: Never equates simple page views or login with value realization.
 */

import { prisma } from "@/lib/db";
import { BetaFeedbackService } from "@/services/beta/beta-feedback";
import { MerchantJourneyTelemetry } from "@/services/telemetry/merchant-journey";

export type FirstValueStatus =
  | "FIRST_VALUE_DETECTED"
  | "FIRST_VALUE_NOT_DETECTED"
  | "INSUFFICIENT_DATA";

export interface FirstValueAssessment {
  organizationId: string;
  status: FirstValueStatus;
  primaryValueAction?: string;
  journeyStage?: "DISCOVER" | "RESEARCH" | "VALIDATE" | "PLAN" | "LAUNCH";
  evidence?: string;
  observedAt?: Date;
  realizedActionCount: number;
}

export class FirstValueEngine {
  /**
   * Evaluates first-value attainment for a given merchant organization.
   */
  public static async evaluateFirstValue(organizationId: string): Promise<FirstValueAssessment> {
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

    if (!org) {
      return {
        organizationId,
        status: "INSUFFICIENT_DATA",
        realizedActionCount: 0,
      };
    }

    const { prospects, plannerItems, listingDrafts, listingSeoAudits, researchRuns } = org._count;
    const feedbackList = BetaFeedbackService.getFeedback(organizationId);
    const hasRejectionDecision = feedbackList.some((fb) => fb.impactCategory === "IDEA_REJECTION");
    const journeyEvents = MerchantJourneyTelemetry.getEvents(organizationId, 50);

    let realizedActionCount = 0;
    if (prospects > 0) realizedActionCount++;
    if (plannerItems > 0) realizedActionCount++;
    if (listingDrafts > 0) realizedActionCount++;
    if (listingSeoAudits > 0) realizedActionCount++;
    if (hasRejectionDecision) realizedActionCount++;

    // 1. Evidence-Based Commercial Rejection (prevented bad inventory investment)
    if (hasRejectionDecision) {
      const rejectFb = feedbackList.find((fb) => fb.impactCategory === "IDEA_REJECTION");
      return {
        organizationId,
        status: "FIRST_VALUE_DETECTED",
        primaryValueAction: "EVIDENCE_BASED_IDEA_REJECTION",
        journeyStage: "VALIDATE",
        evidence: rejectFb?.comment || "Merchant rejected high-risk product opportunity using observable competition evidence.",
        observedAt: rejectFb?.createdAt || new Date(),
        realizedActionCount,
      };
    }

    // 2. Launch Planning & Original AI Listing Studio
    if (listingDrafts > 0) {
      return {
        organizationId,
        status: "FIRST_VALUE_DETECTED",
        primaryValueAction: "LISTING_DRAFT_CREATED",
        journeyStage: "LAUNCH",
        evidence: `Created ${listingDrafts} AI listing draft(s) with compliance & originality checks.`,
        observedAt: org.updatedAt,
        realizedActionCount,
      };
    }

    // 3. Execution & Workspace Planning
    if (plannerItems > 0) {
      return {
        organizationId,
        status: "FIRST_VALUE_DETECTED",
        primaryValueAction: "WORKSPACE_PLANNER_ITEM_CREATED",
        journeyStage: "PLAN",
        evidence: `Structured ${plannerItems} product opportunity execution item(s) in workspace.`,
        observedAt: org.updatedAt,
        realizedActionCount,
      };
    }

    // 4. Listing SEO Optimization & Keyword Harvest
    if (listingSeoAudits > 0) {
      return {
        organizationId,
        status: "FIRST_VALUE_DETECTED",
        primaryValueAction: "SEO_LISTING_AUDIT_COMPLETED",
        journeyStage: "LAUNCH",
        evidence: `Completed ${listingSeoAudits} 13-tag marketplace SEO optimization audit(s).`,
        observedAt: org.updatedAt,
        realizedActionCount,
      };
    }

    // 5. Saved Opportunity in Niche
    if (prospects > 0) {
      return {
        organizationId,
        status: "FIRST_VALUE_DETECTED",
        primaryValueAction: "OPPORTUNITY_SAVED",
        journeyStage: "RESEARCH",
        evidence: `Saved ${prospects} high-signal product prospect(s) for commercial validation.`,
        observedAt: org.updatedAt,
        realizedActionCount,
      };
    }

    // If research was performed but no decision was formalized
    if (researchRuns > 0) {
      return {
        organizationId,
        status: "FIRST_VALUE_NOT_DETECTED",
        evidence: `Merchant executed ${researchRuns} research run(s) but has not yet saved an opportunity, completed an audit, or built a launch draft.`,
        observedAt: org.updatedAt,
        realizedActionCount: 0,
      };
    }

    return {
      organizationId,
      status: "FIRST_VALUE_NOT_DETECTED",
      evidence: "Account created but no research runs or commercial decision actions recorded.",
      realizedActionCount: 0,
    };
  }
}
