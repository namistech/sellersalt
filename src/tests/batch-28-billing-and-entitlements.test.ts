import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { EntitlementEngine } from "@/services/billing/entitlement-engine";
import { BillingEventLedger } from "@/services/billing/billing-event-ledger";
import { BillingReconciliationService } from "@/services/billing/billing-reconciliation";
import { BillingSimulator } from "@/services/billing/billing-simulator";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";
import { checkQuota } from "@/services/plans/quota-enforcement";

describe("Batch 28: Production Billing, Subscription Lifecycle & Commercial Entitlements", () => {
  const testOrgId = `test_org_batch28_${Date.now()}`;

  describe("1. Canonical Entitlement Engine", () => {
    it("resolves Free Explorer entitlements accurately for new organization", async () => {
      await BillingSimulator.createFreeOrganization(testOrgId, "Batch 28 Free Store");

      const entitlements = await EntitlementEngine.getEntitlements(testOrgId);

      assert.strictEqual(entitlements.organizationId, testOrgId);
      assert.strictEqual(entitlements.planKey, "FREE");
      assert.strictEqual(entitlements.planName, "Free Explorer");
      assert.strictEqual(entitlements.priceMonthlyUsd, 0);
      assert.strictEqual(entitlements.features.canExportData, false);
      assert.strictEqual(entitlements.discoveryDepth, "QUICK");
      assert.deepStrictEqual(entitlements.allowedMarketplaces, ["etsy"]);
      assert.strictEqual(entitlements.quotas.productResearches.limit, PLAN_DEFINITIONS.FREE.limits.monthlyProductResearches);
      assert.ok(entitlements.quotas.productResearches.resetsAt instanceof Date);
    });

    it("verifies marketplace permission checking per plan tier", async () => {
      const canAccessEtsy = await EntitlementEngine.canAccessMarketplace(testOrgId, "etsy");
      const canAccessAmazon = await EntitlementEngine.canAccessMarketplace(testOrgId, "amazon");

      assert.strictEqual(canAccessEtsy, true, "Free tier must allow Etsy");
      assert.strictEqual(canAccessAmazon, false, "Free tier must not allow Amazon");
    });
  });

  describe("2. End-to-End Billing Simulation Lifecycle", () => {
    it("simulates Starter subscription activation and expanded marketplace access", async () => {
      const result = await BillingSimulator.activateSubscription({
        organizationId: testOrgId,
        provider: "STRIPE",
        packageKey: "STARTED",
      });

      assert.strictEqual(result.state.planKey, "STARTED");
      assert.strictEqual(result.state.subscriptionStatus, "ACTIVE");
      assert.strictEqual(result.entitlementsSummary.canConnectEtsy, true);
      assert.ok(result.entitlementsSummary.allowedMarketplaces.includes("amazon"));
    });

    it("simulates atomic quota consumption", async () => {
      const quotaCheckBefore = await checkQuota(testOrgId, "PRODUCT_RESEARCH");
      const initialUsed = quotaCheckBefore.current;

      await BillingSimulator.consumeQuota({
        organizationId: testOrgId,
        action: "PRODUCT_RESEARCH",
        count: 5,
      });

      const quotaCheckAfter = await checkQuota(testOrgId, "PRODUCT_RESEARCH");
      assert.strictEqual(quotaCheckAfter.current, initialUsed + 5);
      assert.strictEqual(quotaCheckAfter.remaining, quotaCheckAfter.limit - (initialUsed + 5));
    });

    it("simulates subscription renewal with updated period end", async () => {
      const renewResult = await BillingSimulator.renewSubscription({
        organizationId: testOrgId,
        provider: "STRIPE",
      });

      assert.strictEqual(renewResult.state.subscriptionStatus, "ACTIVE");
      assert.ok(renewResult.state.currentPeriodEnd instanceof Date);
    });

    it("simulates Pro plan upgrade and expanded capabilities", async () => {
      const upgradeResult = await BillingSimulator.changePlan({
        organizationId: testOrgId,
        newPackageKey: "PRO",
        provider: "STRIPE",
      });

      assert.strictEqual(upgradeResult.state.planKey, "PRO");
      assert.ok(upgradeResult.entitlementsSummary.allowedMarketplaces.includes("ebay"));
      assert.ok(upgradeResult.entitlementsSummary.allowedMarketplaces.includes("walmart"));
    });

    it("simulates cancel at period end and reactivation without loss of access", async () => {
      const cancelResult = await BillingSimulator.cancelAtPeriodEnd(testOrgId);
      assert.strictEqual(cancelResult.state.cancelAtPeriodEnd, true);
      assert.strictEqual(cancelResult.state.subscriptionStatus, "ACTIVE");

      const reactivateResult = await BillingSimulator.reactivateSubscription(testOrgId);
      assert.strictEqual(reactivateResult.state.cancelAtPeriodEnd, false);
      assert.strictEqual(reactivateResult.state.subscriptionStatus, "ACTIVE");
    });

    it("simulates payment failure degradation to past due and eventual cancellation", async () => {
      const failResult = await BillingSimulator.simulatePaymentFailure(testOrgId);
      assert.strictEqual(failResult.state.subscriptionStatus, "PAST_DUE");
      assert.strictEqual(failResult.state.planKey, "FREE", "Past due subscription must fallback to Free entitlements");

      const cancelResult = await BillingSimulator.finalCancellation(testOrgId);
      assert.strictEqual(cancelResult.state.subscriptionStatus, "CANCELED");
      assert.strictEqual(cancelResult.state.planKey, "FREE");
    });
  });

  describe("3. Webhook Idempotency & Billing Event Ledger", () => {
    it("detects and prevents duplicate external webhook events", async () => {
      const externalEventId = `evt_test_dedup_${Date.now()}`;

      const isDupBefore = await BillingEventLedger.isDuplicate("STRIPE", externalEventId);
      assert.strictEqual(isDupBefore, false);

      await BillingEventLedger.recordEvent({
        provider: "STRIPE",
        externalEventId,
        eventType: "customer.subscription.updated",
        organizationId: testOrgId,
        status: "PROCESSED",
      });

      const isDupAfter = await BillingEventLedger.isDuplicate("STRIPE", externalEventId);
      assert.strictEqual(isDupAfter, true);
    });

    it("retrieves organization-scoped audit ledger entries", async () => {
      const events = await BillingEventLedger.listEvents({ organizationId: testOrgId });
      assert.ok(events.length > 0);
      assert.ok(events.every((e) => !e.organizationId || e.organizationId === testOrgId));
    });
  });

  describe("4. Billing Reconciliation & Discrepancy Detection", () => {
    it("diagnoses package mismatch and reconciles safely", async () => {
      const proPkg = await prisma.package.findUniqueOrThrow({ where: { key: "PRO" } });
      const starterPkg = await prisma.package.findUniqueOrThrow({ where: { key: "STARTED" } });

      // Intentionally create a mismatch: Subscription is PRO, Organization packageId is STARTED
      await prisma.organization.update({
        where: { id: testOrgId },
        data: { packageId: starterPkg.id },
      });

      await prisma.subscription.update({
        where: { organizationId: testOrgId },
        data: { packageId: proPkg.id, status: "ACTIVE" },
      });

      // Dry run audit
      const dryReport = await BillingReconciliationService.runAudit({
        organizationId: testOrgId,
        dryRun: true,
      });

      assert.ok(dryReport.discrepanciesFound > 0);
      const mismatch = dryReport.discrepancies.find((d) => d.issueType === "PACKAGE_MISMATCH");
      assert.ok(mismatch, "Reconciliation must detect package mismatch");
      assert.strictEqual(mismatch.reconciled, false, "Dry run must not mutate database");

      // Live reconciliation
      const liveReport = await BillingReconciliationService.runAudit({
        organizationId: testOrgId,
        dryRun: false,
      });

      assert.ok(liveReport.resolvedCount > 0);
      const orgAfter = await prisma.organization.findUniqueOrThrow({ where: { id: testOrgId } });
      assert.strictEqual(orgAfter.packageId, proPkg.id, "Live reconciliation must restore matching package");
    });
  });
});
