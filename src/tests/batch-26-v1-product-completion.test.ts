import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";

function readSrcFile(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf-8");
}

describe("Batch 26: V1 Product Completion & End-to-End Usable SaaS Readiness", () => {
  describe("1. First-Time Merchant Onboarding & Activation Funnel", () => {
    it("ensures Onboarding client explains 5-step journey and data trust contract", () => {
      const onboardingCode = readSrcFile("src/app/(dashboard)/onboarding/onboarding-client.tsx");

      assert.ok(
        onboardingCode.includes("Know what to sell before you spend money"),
        "Onboarding must feature canonical product positioning"
      );
      assert.ok(
        onboardingCode.includes("OBSERVED Signals"),
        "Onboarding must explain OBSERVED signals"
      );
      assert.ok(
        onboardingCode.includes("Zero-Fabrication Contract"),
        "Onboarding must explain Zero-Fabrication Contract"
      );
      assert.ok(
        onboardingCode.includes("api/onboarding/complete"),
        "Onboarding must persist state via authoritative API"
      );
    });

    it("verifies server-side onboarding page enforces authenticated access and bypasses finished users", () => {
      const pageCode = readSrcFile("src/app/(dashboard)/onboarding/page.tsx");

      assert.ok(
        pageCode.includes("onboardingCompletedAt"),
        "Onboarding page must check onboardingCompletedAt server-side"
      );
      assert.ok(
        pageCode.includes('redirect("/dashboard")'),
        "Completed onboarding must redirect to dashboard"
      );
    });
  });

  describe("2. Continuous 5-Step Workflow Handoffs", () => {
    it("ensures Research Command Center connects to Validation and Workspace via NextCommercialActionBar", () => {
      const rccCode = readSrcFile("src/components/research/ProductResearchCommandCenter.tsx");

      assert.ok(
        rccCode.includes("NextCommercialActionBar"),
        "Research Command Center must include NextCommercialActionBar"
      );
      assert.ok(
        rccCode.includes('currentStage="RESEARCH"'),
        "Current stage must be set to RESEARCH"
      );
    });

    it("ensures Validation Report View connects to Workspace and Studio via NextCommercialActionBar", () => {
      const valCode = readSrcFile("src/components/validation/ValidationReportView.tsx");

      assert.ok(
        valCode.includes("NextCommercialActionBar"),
        "Validation Report View must include NextCommercialActionBar"
      );
      assert.ok(
        valCode.includes('currentStage="VALIDATION"'),
        "Current stage must be set to VALIDATION"
      );
    });

    it("ensures Product Opportunity Cockpit connects to Launch Studio via NextCommercialActionBar", () => {
      const cockpitCode = readSrcFile("src/components/workspace/ProductOpportunityCockpit.tsx");

      assert.ok(
        cockpitCode.includes("NextCommercialActionBar"),
        "Product Opportunity Cockpit must include NextCommercialActionBar"
      );
      assert.ok(
        cockpitCode.includes('currentStage="WORKSPACE"'),
        "Current stage must be set to WORKSPACE"
      );
    });
  });

  describe("3. Empty, Loading, and Partial State Handling", () => {
    it("ensures Research Command Center provides a helpful empty state with search suggestions", () => {
      const rccCode = readSrcFile("src/components/research/ProductResearchCommandCenter.tsx");

      assert.ok(
        rccCode.includes("Ready to Execute Market Research"),
        "Research Center must include an informative empty state"
      );
      assert.ok(
        rccCode.includes("Popular starting searches:"),
        "Research Center empty state must offer starting search suggestions"
      );
    });

    it("ensures Product Workspaces page handles zero-workspace state gracefully", () => {
      const pwCode = readSrcFile("src/app/(dashboard)/product-workspaces/page.tsx");

      assert.ok(
        pwCode.includes("No Workspaces Created Yet"),
        "Product Workspaces must handle empty state"
      );
    });
  });

  describe("4. Plan Quota Boundaries & Transparent Pricing Tiers", () => {
    it("verifies all 4 tiers in PLAN_DEFINITIONS have valid limits and pricing", () => {
      const tiers = ["FREE", "STARTED", "PRO", "AGENCY"] as const;

      for (const tier of tiers) {
        const plan = PLAN_DEFINITIONS[tier];
        assert.ok(plan, `Plan definition for ${tier} must exist`);
        assert.ok(plan.name, `Plan ${tier} must have a name`);
        assert.ok(typeof plan.priceMonthlyUsd === "number", `Plan ${tier} must have monthly price`);
        assert.ok(plan.limits.monthlyProductResearches > 0, `Plan ${tier} must have product research limit`);
      }

      assert.strictEqual(PLAN_DEFINITIONS.FREE.priceMonthlyUsd, 0, "Free tier price must be $0");
      assert.strictEqual(PLAN_DEFINITIONS.STARTED.priceMonthlyUsd, 19, "Starter tier price must be $19");
      assert.strictEqual(PLAN_DEFINITIONS.PRO.priceMonthlyUsd, 49, "Pro tier price must be $49");
      assert.strictEqual(PLAN_DEFINITIONS.AGENCY.priceMonthlyUsd, 199, "Agency tier price must be $199");
    });
  });

  describe("5. Multi-Tenant Scoping & Security", () => {
    it("ensures Product Opportunity Workspace routes scope by organizationId", () => {
      const pwPageCode = readSrcFile("src/app/(dashboard)/product-workspaces/page.tsx");

      assert.ok(
        pwPageCode.includes("organizationId"),
        "Product workspaces page must scope by organizationId"
      );
    });
  });
});
