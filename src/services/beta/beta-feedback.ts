/**
 * SellerSalt Merchant Beta Feedback & Commercial Decision Validation Service
 * 
 * Captures user-reported decision impact, product usefulness ratings, and data quality reports
 * during private beta operations.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/observability/structured-logger";

export type DecisionImpactCategory =
  | "IDEA_REJECTION"
  | "FURTHER_INVESTIGATION"
  | "PRODUCT_SELECTION"
  | "DIFFERENTIATION_DISCOVERY"
  | "PRICE_POSITIONING"
  | "COMPETITION_ANALYSIS"
  | "SOURCING_SPEC"
  | "LAUNCH_PLAN"
  | "DATA_ISSUE"
  | "GENERAL";

export interface BetaFeedbackSubmission {
  organizationId: string;
  userEmail?: string;
  rating: number; // 1 to 5
  impactCategory: DecisionImpactCategory;
  featureArea?: "RESEARCH" | "VALIDATION" | "WORKSPACE" | "PLANNER" | "STUDIO" | "BILLING" | "GENERAL";
  comment?: string;
  queryOrContext?: string;
}

export interface BetaFeedbackRecord extends BetaFeedbackSubmission {
  id: string;
  createdAt: Date;
}

// In-memory ring buffer for low-overhead feedback collection
const FEEDBACK_BUFFER: BetaFeedbackRecord[] = [];
const MAX_BUFFER_SIZE = 500;

export class BetaFeedbackService {
  /**
   * Records merchant feedback and user-reported decision impact.
   */
  public static async recordFeedback(input: BetaFeedbackSubmission): Promise<BetaFeedbackRecord> {
    const cleanRating = Math.max(1, Math.min(5, Math.round(input.rating)));
    const id = `fb_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const record: BetaFeedbackRecord = {
      ...input,
      rating: cleanRating,
      id,
      createdAt: new Date(),
    };

    FEEDBACK_BUFFER.unshift(record);
    if (FEEDBACK_BUFFER.length > MAX_BUFFER_SIZE) {
      FEEDBACK_BUFFER.pop();
    }

    logger.info("Beta merchant feedback recorded", {
      metadata: {
        id,
        org: input.organizationId,
        rating: cleanRating,
        category: input.impactCategory,
        featureArea: input.featureArea,
      },
    });

    return record;
  }

  /**
   * Retrieves feedback records scoped to an organization or across the platform for admins.
   */
  public static getFeedback(organizationId?: string): BetaFeedbackRecord[] {
    if (!organizationId) {
      return [...FEEDBACK_BUFFER];
    }
    return FEEDBACK_BUFFER.filter((fb) => fb.organizationId === organizationId);
  }

  /**
   * Computes feedback sentiment and commercial decision statistics.
   */
  public static getFeedbackAnalytics(): {
    totalCount: number;
    averageRating: number | "INSUFFICIENT_DATA";
    impactDistribution: Record<string, number>;
    recentIssues: BetaFeedbackRecord[];
  } {
    const total = FEEDBACK_BUFFER.length;
    if (total === 0) {
      return {
        totalCount: 0,
        averageRating: "INSUFFICIENT_DATA",
        impactDistribution: {},
        recentIssues: [],
      };
    }

    const sumRating = FEEDBACK_BUFFER.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = Number((sumRating / total).toFixed(1));

    const distribution: Record<string, number> = {};
    for (const fb of FEEDBACK_BUFFER) {
      distribution[fb.impactCategory] = (distribution[fb.impactCategory] || 0) + 1;
    }

    const lowRatedOrIssues = FEEDBACK_BUFFER.filter(
      (fb) => fb.rating <= 2 || fb.impactCategory === "DATA_ISSUE"
    ).slice(0, 10);

    return {
      totalCount: total,
      averageRating: avg,
      impactDistribution: distribution,
      recentIssues: lowRatedOrIssues,
    };
  }

  /**
   * Clears the in-memory buffer (useful for test isolates).
   */
  public static clearBuffer(): void {
    FEEDBACK_BUFFER.length = 0;
  }
}
