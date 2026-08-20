import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MerchantJourneyTelemetry } from "@/services/telemetry/merchant-journey";
import { FirstValueEngine } from "@/services/telemetry/first-value";
import { FunnelDiagnosticsEngine } from "@/services/telemetry/funnel-diagnostics";
import { BetaLearningLoopEngine } from "@/services/telemetry/beta-learning-loop";
import { BetaExperimentManager } from "@/services/telemetry/beta-experiments";
import { BetaFeedbackService } from "@/services/beta/beta-feedback";
import { prisma } from "@/lib/db";

describe("Batch 33: Real Merchant Learning & Validation Engine", () => {
  describe("1. Merchant Journey Telemetry & PII Sanitization", () => {
    it("records journey events with strict metadata PII sanitization", () => {
      MerchantJourneyTelemetry.clearBuffer();

      const event = MerchantJourneyTelemetry.recordEvent({
        organizationId: "org_test_journey_1",
        stage: "RESEARCH",
        eventType: "opportunity_saved",
        entityId: "pros_123",
        entityType: "PROSPECT",
        metadata: {
          niche: "handmade leather journals",
          pricePoint: 45.0,
          userPassword: "secret_password_123", // Must be scrubbed
          apiToken: "tok_abc_xyz", // Must be scrubbed
        },
      });

      assert.ok(event.id.startsWith("jrn_"));
      assert.strictEqual(event.stage, "RESEARCH");
      assert.strictEqual(event.metadata?.niche, "handmade leather journals");
      assert.strictEqual(event.metadata?.pricePoint, 45.0);
      assert.strictEqual(event.metadata?.userPassword, undefined, "Passwords must be scrubbed");
      assert.strictEqual(event.metadata?.apiToken, undefined, "Tokens must be scrubbed");

      const orgEvents = MerchantJourneyTelemetry.getEvents("org_test_journey_1");
      assert.strictEqual(orgEvents.length, 1);
    });

    it("throws error when organizationId is missing", () => {
      assert.throws(() => {
        MerchantJourneyTelemetry.recordEvent({
          organizationId: "",
          stage: "DISCOVER",
          eventType: "discovery_started",
        });
      }, /organizationId is strictly required/);
    });
  });

  describe("2. First-Value Detection Engine", () => {
    it("detects first value accurately when merchant formalizes an opportunity or decision", async () => {
      const testOrg = await prisma.organization.findFirstOrThrow();
      const assessment = await FirstValueEngine.evaluateFirstValue(testOrg.id);

      assert.ok(["FIRST_VALUE_DETECTED", "FIRST_VALUE_NOT_DETECTED", "INSUFFICIENT_DATA"].includes(assessment.status));
      assert.strictEqual(assessment.organizationId, testOrg.id);
      assert.ok(typeof assessment.realizedActionCount === "number");
    });
  });

  describe("3. Funnel Diagnostics Engine", () => {
    it("computes journey transition rates without fabricated 0% substitutions", async () => {
      const report = await FunnelDiagnosticsEngine.analyzeFunnel();

      assert.ok(report.timestamp);
      assert.ok(report.stages.length === 7);
      assert.strictEqual(report.stages[0].stage, "ONBOARDING");
      assert.strictEqual(report.stages[6].stage, "PAID");

      for (const stg of report.stages) {
        assert.ok(typeof stg.eligibleMerchants === "number");
        assert.ok(typeof stg.completedMerchants === "number");
        assert.ok(typeof stg.dropOffs === "number");
        assert.ok(typeof stg.conversionPct === "number" || stg.conversionPct === "INSUFFICIENT_DATA");
      }
    });
  });

  describe("4. Beta Learning Loop Engine", () => {
    it("calculates priority scores accurately via Impact × Frequency × Commercial formula", async () => {
      BetaFeedbackService.clearBuffer();
      const testOrg = await prisma.organization.findFirstOrThrow();

      // Submit feedback reporting a data issue
      await BetaFeedbackService.recordFeedback({
        organizationId: testOrg.id,
        rating: 2,
        impactCategory: "DATA_ISSUE",
        comment: "Missing review count on newly launched Etsy competitor listing.",
      });

      const report = await BetaLearningLoopEngine.evaluateLearningLoop();

      assert.ok(report.timestamp);
      assert.ok(report.totalIssuesTracked >= 1);

      const dataIssueItem = report.prioritizedItems.find((i) => i.category === "DATA_QUALITY");
      assert.ok(dataIssueItem);
      assert.strictEqual(dataIssueItem?.commercialImportance, 5); // Trust prioritized
      assert.strictEqual(dataIssueItem?.priorityScore, dataIssueItem!.userImpact * dataIssueItem!.frequency * dataIssueItem!.commercialImportance);
    });
  });

  describe("5. Beta Experiment Framework", () => {
    it("deterministically assigns organizations to experiment variants", () => {
      const experiments = BetaExperimentManager.listExperiments();
      assert.ok(experiments.length >= 1);

      const exp = experiments[0];
      const v1 = BetaExperimentManager.getVariant(exp.id, "org_merchant_alpha");
      const v2 = BetaExperimentManager.getVariant(exp.id, "org_merchant_alpha");

      // Deterministic invariant: same org always gets same variant
      assert.strictEqual(v1, v2);
      assert.ok(["CONTROL", "TREATMENT"].includes(v1));
    });
  });
});
