import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EnvironmentValidator } from "@/lib/config/environment-validator";
import { TransactionalEmailService } from "@/services/email/transactional-email";
import { AcquisitionSmokeTestRunner } from "@/services/acquisition/acquisition-smoke-test";
import { prisma } from "@/lib/db";

describe("Batch 30: Production Activation & Launch Readiness", () => {
  describe("1. Production Environment Configuration Validator", () => {
    it("validates runtime environment without leaking secret values", () => {
      const report = EnvironmentValidator.validate();

      assert.ok(typeof report.isValid === "boolean");
      assert.ok(report.environment);
      assert.ok(Array.isArray(report.missingRequired));
      assert.ok(typeof report.statusMap === "object");

      // Verify that no raw secrets are in statusMap values
      for (const [key, status] of Object.entries(report.statusMap)) {
        assert.ok(["CONFIGURED", "MISSING", "DEFAULT_USED"].includes(status));
      }
    });
  });

  describe("2. Transactional Email Service & Simulation Buffer", () => {
    it("records outbound transactional emails safely into simulation buffer in test environment", async () => {
      TransactionalEmailService.clearCapturedEmails();

      const delivery = await TransactionalEmailService.send({
        to: "merchant@example.com",
        subject: "Welcome to SellerSalt",
        html: "<p>Your account is ready.</p>",
        templateKey: "WELCOME_MERCHANT",
      });

      assert.strictEqual(delivery.sent, true);
      assert.strictEqual(delivery.mode, "SIMULATION");
      assert.ok(delivery.deliveryId?.startsWith("msg_"));

      const captured = TransactionalEmailService.getCapturedEmails();
      assert.strictEqual(captured.length, 1);
      assert.strictEqual(captured[0].to, "merchant@example.com");
      assert.strictEqual(captured[0].subject, "Welcome to SellerSalt");
      assert.strictEqual(captured[0].templateKey, "WELCOME_MERCHANT");
    });
  });

  describe("3. Real-Data Acquisition Smoke Test Framework", () => {
    it("executes non-aggressive acquisition sanity checks and Data Trust evaluations", async () => {
      const testOrg = await prisma.organization.findFirstOrThrow();
      const report = await AcquisitionSmokeTestRunner.runSuite(testOrg.id);

      assert.strictEqual(report.overallStatus, "HEALTHY");
      assert.strictEqual(report.checks.length, 3);
      assert.ok(report.checks.every((c) => c.status === "PASSED"));

      const domainCheck = report.checks.find((c) => c.name === "Source Boundary & SSRF Protection");
      assert.ok(domainCheck);
      assert.strictEqual(domainCheck.status, "PASSED");

      const trustCheck = report.checks.find((c) => c.name === "Data Trust Engine Evaluation");
      assert.ok(trustCheck);
      assert.strictEqual(trustCheck.status, "PASSED");
    });
  });
});
