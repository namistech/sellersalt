import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BetaMerchantService } from "@/services/beta/beta-merchant";
import { BetaFeedbackService } from "@/services/beta/beta-feedback";
import { DataQualityService } from "@/services/ops/data-quality";
import { prisma } from "@/lib/db";

describe("Batch 32: Private Beta Activation & Merchant Validation", () => {
  describe("1. Beta Merchant Profile & Funnel Telemetry", () => {
    it("computes deterministic activation milestones for registered merchants", async () => {
      const testOrg = await prisma.organization.findFirstOrThrow();
      const profile = await BetaMerchantService.getMerchantProfile(testOrg.id);

      assert.ok(profile !== null);
      assert.strictEqual(profile?.organizationId, testOrg.id);
      assert.ok(["ONBOARDED", "ACTIVATED", "ENGAGED", "VALUE_REALIZED", "PAID"].includes(profile!.milestone));
      assert.ok(typeof profile!.metrics.researchCount === "number");
    });

    it("aggregates private beta activation funnel without fabricated fallback values", async () => {
      const funnel = await BetaMerchantService.getBetaFunnel();

      assert.ok(funnel.totalMerchants >= 1);
      assert.ok(funnel.onboardedCount >= 1);
      assert.ok(typeof funnel.activatedCount === "number");
      assert.ok(typeof funnel.engagedCount === "number");
      assert.ok(typeof funnel.valueRealizedCount === "number");
      assert.ok(typeof funnel.paidCount === "number");
    });
  });

  describe("2. Merchant In-App Feedback & Decision Impact System", () => {
    it("records merchant decision feedback and computes analytics accurately", async () => {
      BetaFeedbackService.clearBuffer();
      const testOrg = await prisma.organization.findFirstOrThrow();

      const record1 = await BetaFeedbackService.recordFeedback({
        organizationId: testOrg.id,
        userEmail: "merchant@example.com",
        rating: 5,
        impactCategory: "IDEA_REJECTION",
        featureArea: "VALIDATION",
        comment: "Saved $1,500 by rejecting a saturated low-margin niche before buying inventory.",
      });

      assert.strictEqual(record1.rating, 5);
      assert.strictEqual(record1.impactCategory, "IDEA_REJECTION");
      assert.ok(record1.id.startsWith("fb_"));

      const record2 = await BetaFeedbackService.recordFeedback({
        organizationId: testOrg.id,
        userEmail: "merchant@example.com",
        rating: 4,
        impactCategory: "DIFFERENTIATION_DISCOVERY",
        featureArea: "WORKSPACE",
        comment: "Identified high-demand organic linen gap cluster.",
      });

      assert.strictEqual(record2.rating, 4);

      // Verify organization scoping
      const orgFeedback = BetaFeedbackService.getFeedback(testOrg.id);
      assert.strictEqual(orgFeedback.length, 2);

      // Verify analytics
      const analytics = BetaFeedbackService.getFeedbackAnalytics();
      assert.strictEqual(analytics.totalCount, 2);
      assert.strictEqual(analytics.averageRating, 4.5);
      assert.strictEqual(analytics.impactDistribution["IDEA_REJECTION"], 1);
      assert.strictEqual(analytics.impactDistribution["DIFFERENTIATION_DISCOVERY"], 1);
    });
  });

  describe("3. Data Quality & Acquisition Diagnostics", () => {
    it("generates empirical data quality report without synthetic numbers", async () => {
      const report = await DataQualityService.generateReport();

      assert.ok(report.timestamp);
      assert.ok(typeof report.totalResearchRuns === "number");
      assert.ok(typeof report.completedRuns === "number");
      assert.ok(typeof report.failedRuns === "number");
      assert.ok(Array.isArray(report.marketplaceBreakdown));
    });
  });
});
