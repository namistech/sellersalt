/**
 * SellerSalt Beta Learning Loop Engine
 * 
 * Implements the canonical triage formula:
 * Priority Score = User Impact (1-5) × Frequency × Commercial Importance (1-5)
 * 
 * Invariant: Never allows speculative feature requests to outrank data-quality or trust issues.
 */

import { BetaFeedbackService, BetaFeedbackRecord } from "@/services/beta/beta-feedback";
import { DataQualityService } from "@/services/ops/data-quality";

export type LearningLoopPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";

export type LearningLoopAction =
  | "FIX"
  | "IMPROVE"
  | "SIMPLIFY"
  | "REMOVE"
  | "INVESTIGATE"
  | "DOCUMENT"
  | "MEASURE_MORE";

export interface LearningLoopItem {
  id: string;
  category: "DATA_QUALITY" | "TRUST" | "UX_FRICTION" | "ACQUISITION" | "BILLING" | "FEATURE_REQUEST";
  title: string;
  evidence: string;
  frequency: number;
  userImpact: number; // 1-5
  commercialImportance: number; // 1-5
  priorityScore: number;
  priority: LearningLoopPriority;
  recommendedAction: LearningLoopAction;
  affectedWorkflow: "DISCOVER" | "RESEARCH" | "VALIDATE" | "PLAN" | "LAUNCH" | "BILLING";
}

export interface BetaLearningLoopReport {
  timestamp: string;
  totalIssuesTracked: number;
  prioritizedItems: LearningLoopItem[];
}

export class BetaLearningLoopEngine {
  /**
   * Evaluates all beta feedback, data quality telemetry, and friction points into prioritized actions.
   */
  public static async evaluateLearningLoop(): Promise<BetaLearningLoopReport> {
    const feedbackList = BetaFeedbackService.getFeedback();
    const dataQuality = await DataQualityService.generateReport();
    const items: LearningLoopItem[] = [];

    // 1. Evaluate Data Issues from Feedback
    const dataIssueFeedback = feedbackList.filter((fb) => fb.impactCategory === "DATA_ISSUE");
    if (dataIssueFeedback.length > 0) {
      const frequency = dataIssueFeedback.length;
      const userImpact = 4;
      const commercialImportance = 5; // Trust is paramount
      const priorityScore = userImpact * frequency * commercialImportance;

      items.push({
        id: "ll_data_issues",
        category: "DATA_QUALITY",
        title: "Reported Market Signal Inaccuracies or Gaps",
        evidence: `${frequency} merchant(s) reported data quality issues in public research or validation.`,
        frequency,
        userImpact,
        commercialImportance,
        priorityScore,
        priority: priorityScore >= 50 ? "CRITICAL" : priorityScore >= 25 ? "HIGH" : "MEDIUM",
        recommendedAction: "INVESTIGATE",
        affectedWorkflow: "RESEARCH",
      });
    }

    // 2. Evaluate Failed Acquisition Runs from Data Quality Service
    if (dataQuality.failedRuns > 0 || dataQuality.timedOutRuns > 0) {
      const frequency = dataQuality.failedRuns + dataQuality.timedOutRuns;
      const userImpact = 5;
      const commercialImportance = 4;
      const priorityScore = userImpact * frequency * commercialImportance;

      items.push({
        id: "ll_acquisition_failures",
        category: "ACQUISITION",
        title: "Public Web Acquisition Degradation / Timeouts",
        evidence: `${frequency} research run(s) failed or timed out during public marketplace acquisition.`,
        frequency,
        userImpact,
        commercialImportance,
        priorityScore,
        priority: priorityScore >= 50 ? "CRITICAL" : priorityScore >= 25 ? "HIGH" : "MEDIUM",
        recommendedAction: "FIX",
        affectedWorkflow: "RESEARCH",
      });
    }

    // 3. Low-Rated Feedback Items (Rating <= 2)
    const lowRatedFeedback = feedbackList.filter((fb) => fb.rating <= 2 && fb.impactCategory !== "DATA_ISSUE");
    if (lowRatedFeedback.length > 0) {
      const frequency = lowRatedFeedback.length;
      const userImpact = 4;
      const commercialImportance = 3;
      const priorityScore = userImpact * frequency * commercialImportance;

      items.push({
        id: "ll_low_rating_ux",
        category: "UX_FRICTION",
        title: "Merchant Confusion / Workflow Friction",
        evidence: `${frequency} merchant(s) reported low usefulness ratings on workflow steps.`,
        frequency,
        userImpact,
        commercialImportance,
        priorityScore,
        priority: priorityScore >= 50 ? "CRITICAL" : priorityScore >= 25 ? "HIGH" : "MEDIUM",
        recommendedAction: "SIMPLIFY",
        affectedWorkflow: "VALIDATE",
      });
    }

    // Sort by priorityScore descending
    items.sort((a, b) => b.priorityScore - a.priorityScore);

    return {
      timestamp: new Date().toISOString(),
      totalIssuesTracked: items.length,
      prioritizedItems: items,
    };
  }
}
