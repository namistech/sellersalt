/**
 * SellerSalt — Action Plan Generator
 * 
 * Generates an evidence-grounded, prioritized action plan guiding the merchant
 * from initial research validation to supplier RFQ, sampling, and launch preparation.
 */

import type {
  ActionPlan,
  PrioritizedActionItem,
  LaunchReadinessAssessment,
  InformationValueReport,
  DifferentiationBuilderResult,
} from "@/marketplaces/core/opportunity-workspace-types";

export class ActionPlanGenerator {
  /**
   * Builds a prioritized action plan tailored to the opportunity workspace.
   */
  public static generatePlan(input: {
    readiness: LaunchReadinessAssessment;
    informationGaps: InformationValueReport;
    differentiation: DifferentiationBuilderResult;
    hasUserEconomics: boolean;
    baseProductName: string;
  }): ActionPlan {
    const items: PrioritizedActionItem[] = [];

    // Step 1: Supplier Outreach / RFQ
    if (!input.hasUserEconomics) {
      items.push({
        id: "act_send_rfq",
        priority: 1,
        action: "Send Sourcing Specification RFQ to 3 Suppliers",
        reason: "Supplier landed cost is the #1 critical uncertainty blocking contribution margin validation.",
        evidenceBasis: "Landed cost is unverified in Unit Economics scenario calculator.",
        blockingIssue: "Cannot calculate break-even sale price without supplier quote.",
        expectedDecisionImpact: "Resolves Critical Uncertainty → Unlocks verified Unit Economics.",
        isCompleted: false,
      });
    }

    // Step 2: Finalize Differentiation Angle
    if (input.differentiation.candidates.length > 0) {
      const topDiff = input.differentiation.candidates[0];
      items.push({
        id: "act_finalize_differentiation",
        priority: 2,
        action: `Incorporate "${topDiff.title}" into Sourcing Spec`,
        reason: topDiff.description,
        evidenceBasis: `Supported by observed attribute gaps in ${topDiff.observedPrevalencePercent}% of sampled listings.`,
        expectedDecisionImpact: "Protects against direct price competition from dominant commodity sellers.",
        isCompleted: false,
      });
    }

    // Step 3: Order Production Sample
    items.push({
      id: "act_order_sample",
      priority: 3,
      action: "Order Physical Production Sample & Test Unboxing",
      reason: "Inspect raw material finish, structural durability, and custom box presentation before bulk commitment.",
      evidenceBasis: "Physical quality and unboxing experience are primary drivers of 5-star review velocity.",
      blockingIssue: "Avoid bulk inventory defects or packaging damage during transit.",
      expectedDecisionImpact: "Confirms product build quality meets market positioning expectations.",
      isCompleted: false,
    });

    // Step 4: Validate Carrier Packaging & Parcel Tier
    items.push({
      id: "act_carrier_weights",
      priority: 4,
      action: "Weigh Packaged Sample & Check Carrier Shipping Tiers",
      reason: "Crossing weight/dimension thresholds significantly increases outbound shipping and fulfillment fees.",
      evidenceBasis: "Outbound shipping cost directly affects contribution margin in Unit Economics.",
      expectedDecisionImpact: "Locks in exact shipping cost line items in unit economics.",
      isCompleted: false,
    });

    // Step 5: Draft SEO Title & Tag Assets
    items.push({
      id: "act_draft_listing",
      priority: 5,
      action: "Draft Optimized Title, 13 Tags, and Keyword Clusters",
      reason: "Prepare organic search indexing strategy highlighting key differentiation attributes.",
      evidenceBasis: "Harvested high-prevalence keyword clusters from market intelligence.",
      expectedDecisionImpact: "Accelerates Day 1 launch discovery and organic indexing.",
      isCompleted: false,
    });

    const primaryFocus = !input.hasUserEconomics
      ? "Collect supplier quotations to validate unit economics."
      : "Order physical production sample to verify finish quality.";

    return {
      items,
      primaryFocus,
      generatedAt: new Date(),
    };
  }
}
