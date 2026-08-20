import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ProductionSmokeTestRunner } from "@/services/ops/production-smoke-test";
import { PrivateBetaManager } from "@/lib/security/private-beta";
import { prisma } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

describe("Batch 31: Production Deployment & Private Beta Readiness", () => {
  describe("1. End-to-End Production Smoke Test Harness", () => {
    it("executes full production smoke suite with passing operational checks", async () => {
      const testOrg = await prisma.organization.findFirstOrThrow();
      const report = await ProductionSmokeTestRunner.runSuite(testOrg.id);

      assert.ok(["READY_FOR_PRIVATE_BETA", "NEEDS_ATTENTION"].includes(report.overallStatus));
      assert.ok(report.checks.length >= 8);
      assert.strictEqual(report.summary.blocked, 0, "No operational checks should be in BLOCKED state");

      const dbCheck = report.checks.find((c) => c.id === "db-pooling");
      assert.ok(dbCheck);
      assert.strictEqual(dbCheck.status, "PASS");

      const idorCheck = report.checks.find((c) => c.id === "tenant-idor");
      assert.ok(idorCheck);
      assert.strictEqual(idorCheck.status, "PASS");

      const ssrfCheck = report.checks.find((c) => c.id === "ssrf-guard");
      assert.ok(ssrfCheck);
      assert.strictEqual(ssrfCheck.status, "PASS");
    });
  });

  describe("2. Private Beta Access Control", () => {
    it("validates invitation codes accurately and case-insensitively", () => {
      assert.strictEqual(PrivateBetaManager.validateInviteCode("SALT-BETA-2026"), true);
      assert.strictEqual(PrivateBetaManager.validateInviteCode("salt-beta-2026"), true);
      assert.strictEqual(PrivateBetaManager.validateInviteCode("EARLY-FOUNDER"), true);
      assert.strictEqual(PrivateBetaManager.validateInviteCode("INVALID-CODE-123"), false);
      assert.strictEqual(PrivateBetaManager.validateInviteCode(null), false);
    });

    it("evaluates user access correctly across public and beta modes", () => {
      // With beta mode off (default)
      const pubRes = PrivateBetaManager.evaluateAccess({ email: "user@example.com" });
      assert.strictEqual(pubRes.allowed, true);
      assert.strictEqual(pubRes.reason, "PUBLIC_ACCESS");

      // Valid invite code
      const inviteRes = PrivateBetaManager.evaluateAccess({
        email: "user@example.com",
        inviteCode: "SALT-BETA-2026",
      });
      assert.strictEqual(inviteRes.allowed, true);
    });
  });

  describe("3. Production Deployment Artifacts", () => {
    it("verifies .env.example contains required configuration sections without secret leakage", () => {
      const envPath = path.join(process.cwd(), ".env.example");
      assert.ok(fs.existsSync(envPath), ".env.example must exist in project root");

      const content = fs.readFileSync(envPath, "utf-8");
      assert.ok(content.includes("DATABASE_URL="));
      assert.ok(content.includes("NEXTAUTH_SECRET="));
      assert.ok(content.includes("ENCRYPTION_KEY="));
      assert.ok(content.includes("STRIPE_SECRET_KEY="));
      assert.ok(content.includes("ETSY_CLIENT_ID="));

      // Must not contain real production secrets
      assert.ok(!content.includes("sk_live_"));
      assert.ok(!content.includes("whsec_live_"));
    });
  });
});
