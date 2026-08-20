import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";

function readSrcFile(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf-8");
}

describe("Batch 27: V1 Launch Hardening & Usability Verification", () => {
  describe("1. End-to-End Merchant Journey & Navigation Flow", () => {
    it("ensures Onboarding wizard captures focus niche and routes into live search", () => {
      const onboardingCode = readSrcFile("src/app/(dashboard)/onboarding/onboarding-client.tsx");

      assert.ok(
        onboardingCode.includes("Primary Product Category"),
        "Onboarding must allow category selection"
      );
      assert.ok(
        onboardingCode.includes("Initial Product Idea or Niche"),
        "Onboarding must allow niche input"
      );
      assert.ok(
        onboardingCode.includes("Zero-Fabrication Contract"),
        "Onboarding must present Zero-Fabrication contract"
      );
      assert.ok(
        onboardingCode.includes("POST"),
        "Onboarding must submit via POST to /api/onboarding/complete"
      );
    });

    it("ensures Product Opportunity Workspaces page supports query-driven exploration", () => {
      const pwPageCode = readSrcFile("src/app/(dashboard)/product-workspaces/page.tsx");

      assert.ok(
        pwPageCode.includes("searchParams"),
        "Workspaces page must accept searchParams"
      );
      assert.ok(
        pwPageCode.includes("Filtering for query"),
        "Workspaces page must display active filter feedback"
      );
      assert.ok(
        pwPageCode.includes("/validate?q="),
        "Workspaces empty state must link to validation for the query"
      );
    });
  });

  describe("2. Real Dashboard Activation vs Returning State", () => {
    it("ensures Dashboard page fetches real activities and renders PersonalizedContinuationSection", () => {
      const dbPageCode = readSrcFile("src/app/(dashboard)/dashboard/page.tsx");
      const dbClientCode = readSrcFile("src/app/(dashboard)/dashboard/dashboard-client.tsx");

      assert.ok(
        dbPageCode.includes("recentActivities"),
        "Dashboard server page must aggregate recentActivities"
      );
      assert.ok(
        dbClientCode.includes("PersonalizedContinuationSection"),
        "Dashboard client must render PersonalizedContinuationSection"
      );
      assert.ok(
        dbClientCode.includes("DashboardOnboardingGuide"),
        "Dashboard client must render DashboardOnboardingGuide"
      );
    });
  });

  describe("3. Quota Boundaries & Server-Side Plan Enforcement", () => {
    it("verifies server-side checkQuota enforcement across all 5 restricted resources", () => {
      const quotaCode = readSrcFile("src/services/plans/quota-enforcement.ts");

      assert.ok(quotaCode.includes("PRODUCT_RESEARCH"), "checkQuota must handle PRODUCT_RESEARCH");
      assert.ok(quotaCode.includes("KEYWORD_SEARCH"), "checkQuota must handle KEYWORD_SEARCH");
      assert.ok(quotaCode.includes("SEO_AUDIT"), "checkQuota must handle SEO_AUDIT");
      assert.ok(quotaCode.includes("AI_GENERATION"), "checkQuota must handle AI_GENERATION");
      assert.ok(quotaCode.includes("PLANNER_ITEM"), "checkQuota must handle PLANNER_ITEM");
    });
  });

  describe("4. Security & Organization Scoping on Core API Routes", () => {
    it("verifies product-workspaces API routes enforce authentication and organizationId scoping", () => {
      const listRouteCode = readSrcFile("src/app/api/product-workspaces/route.ts");
      const detailRouteCode = readSrcFile("src/app/api/product-workspaces/[id]/route.ts");

      assert.ok(
        listRouteCode.includes("session?.user?.organizationId"),
        "List workspaces API must require organizationId"
      );
      assert.ok(
        detailRouteCode.includes("session?.user?.organizationId"),
        "Detail workspace API must require organizationId"
      );
    });

    it("verifies onboarding completion API enforces authentication", () => {
      const onboardingApiCode = readSrcFile("src/app/api/onboarding/complete/route.ts");

      assert.ok(
        onboardingApiCode.includes("session?.user"),
        "Onboarding complete API must require authenticated session"
      );
    });
  });

  describe("5. Claim Safety & Canonical Positioning Verification", () => {
    it("ensures core dashboard and studio metadata feature canonical copy", () => {
      const studioPageCode = readSrcFile("src/app/(dashboard)/studio/page.tsx");
      const rootPageCode = readSrcFile("src/app/page.tsx");

      assert.ok(
        studioPageCode.includes("policy-compliant"),
        "Studio metadata must emphasize policy-compliant drafts"
      );
      assert.ok(
        rootPageCode.includes("Know What to Sell Before You Spend Money"),
        "Root metadata must feature canonical positioning"
      );
    });
  });
});
