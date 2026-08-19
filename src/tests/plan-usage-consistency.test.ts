import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { checkQuota, getPlanUsageSummary } from "@/services/plans/quota-enforcement";
import { PLAN_DEFINITIONS, type PlanTierKey } from "@/services/plans/plan-capabilities";
import { DEFAULT_PACKAGES } from "@/lib/plan-limits";

// P0/P1 launch fix: PlanUsageCard showed fabricated plan name + usage
// numbers to every user regardless of actual plan, and PLAN_DEFINITIONS
// (pricing/checkout/marketing) vs. Package/checkLimit (billing) disagreed
// on product-research quota (10/150/1000/10000 vs 15/500/5000/50000) while
// three other public surfaces (pricing, checkout, marketing homepage) and
// one internal surface (billing) each carried their own independent copy
// of these numbers. This file proves: real plan/usage data flows end to
// end, the two systems no longer contradict each other anywhere a user can
// see both, and no fabricated fallback remains.

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

async function makeOrgWithPlan(name: string, plan: "FREE" | "STARTED" | "PRO" | "AGENCY") {
  return prisma.organization.create({ data: { name, plan: plan as any } });
}

describe("getPlanUsageSummary — real plan + real usage, never fabricated", () => {
  it("returns the org's real plan name, not a hardcoded default", async () => {
    const freeOrg = await makeOrgWithPlan("Plan Usage Test — Free", "FREE");
    const proOrg = await makeOrgWithPlan("Plan Usage Test — Pro", "PRO");
    try {
      const freeSummary = await getPlanUsageSummary(freeOrg.id);
      const proSummary = await getPlanUsageSummary(proOrg.id);

      assert.equal(freeSummary.planName, PLAN_DEFINITIONS.FREE.name); // "Free Explorer"
      assert.equal(proSummary.planName, PLAN_DEFINITIONS.PRO.name); // "Growth & Pro"
      assert.notEqual(freeSummary.planName, proSummary.planName, "two different real plans must show two different real names");
      assert.notEqual(freeSummary.planName, "Starter Tier");
      assert.notEqual(freeSummary.planName, "Starter Plan");
    } finally {
      await prisma.organization.delete({ where: { id: freeOrg.id } });
      await prisma.organization.delete({ where: { id: proOrg.id } });
    }
  });

  it("different plans show different real limits for the same metric", async () => {
    const freeOrg = await makeOrgWithPlan("Plan Usage Test — Free Limits", "FREE");
    const agencyOrg = await makeOrgWithPlan("Plan Usage Test — Agency Limits", "AGENCY");
    try {
      const freeSummary = await getPlanUsageSummary(freeOrg.id);
      const agencySummary = await getPlanUsageSummary(agencyOrg.id);

      assert.equal(freeSummary.keywordSearch.limit, PLAN_DEFINITIONS.FREE.limits.monthlyKeywordSearches); // 15
      assert.equal(agencySummary.keywordSearch.limit, PLAN_DEFINITIONS.AGENCY.limits.monthlyKeywordSearches); // 25000
      assert.notEqual(freeSummary.keywordSearch.limit, agencySummary.keywordSearch.limit);

      assert.equal(freeSummary.productResearch.limit, PLAN_DEFINITIONS.FREE.limits.monthlyProductResearches); // 10
      assert.equal(agencySummary.productResearch.limit, PLAN_DEFINITIONS.AGENCY.limits.monthlyProductResearches); // 10000
    } finally {
      await prisma.organization.delete({ where: { id: freeOrg.id } });
      await prisma.organization.delete({ where: { id: agencyOrg.id } });
    }
  });

  it("usage numbers come from real quota state (agree exactly with direct checkQuota calls, including after a real row is created)", async () => {
    const org = await makeOrgWithPlan("Plan Usage Test — Real Usage", "FREE");
    try {
      const before = await getPlanUsageSummary(org.id);
      const directBefore = await checkQuota(org.id, "SEO_AUDIT");
      assert.equal(before.seoAudit.current, directBefore.current);
      assert.equal(before.seoAudit.limit, directBefore.limit);

      await prisma.listingSeoAudit.create({
        data: {
          organizationId: org.id,
          overallScore: 50, titleScore: 10, tagScore: 10, keywordSynergyScore: 10,
          descriptionScore: 10, taxonomyScore: 5, attributeScore: 5,
          titleCharCount: 50, tagCount: 5, diagnostics: [], recommendations: [],
        },
      });

      const after = await getPlanUsageSummary(org.id);
      assert.equal(after.seoAudit.current, before.seoAudit.current + 1, "creating one real audit must move the summary's usage by exactly one");
    } finally {
      await prisma.listingSeoAudit.deleteMany({ where: { organizationId: org.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    }
  });
});

describe("No fabricated PlanUsageCard data remains anywhere", () => {
  it("PlanUsageCard.tsx has no default prop values and renders an explicit unavailable state instead of fabricating", () => {
    const code = readSrc("src/components/ui/PlanUsageCard.tsx");
    assert.ok(!code.includes('planName = "Starter'), "must not default planName to a fabricated string");
    assert.ok(!code.includes("current: 42") && !code.includes("current: 18") && !code.includes("current: 6") && !code.includes("current: 3 "), "must not keep the old fabricated default usage numbers");
    assert.ok(code.includes("planName: string | null"), "props must accept an explicit null instead of silently defaulting");
    assert.ok(/unavailable/i.test(code), "must render an explicit unavailable state when data is null");
  });

  it("dashboard-client.tsx no longer hardcodes a plan name or a fabricated usage formula", () => {
    const code = readSrc("src/app/(dashboard)/dashboard/dashboard-client.tsx");
    assert.ok(!code.includes('planName="Starter Tier"'));
    assert.ok(!code.includes("pulse.activeSearches * 25 + 12"), "must not keep the fabricated keyword-usage formula");
    assert.ok(!code.includes("seoUsage={{ current: 6, limit: 25 }}"), "must not keep the hardcoded fabricated SEO usage");
    assert.ok(code.includes("planUsage?.planName ?? null"), "must source the plan name from real planUsage data");
  });

  it("dashboard/page.tsx fetches real plan usage server-side and never fabricates on failure", () => {
    const code = readSrc("src/app/(dashboard)/dashboard/page.tsx");
    assert.ok(code.includes("getPlanUsageSummary(organizationId)"));
    assert.ok(code.includes(".catch(() => null)"), "a real lookup failure must degrade to null (explicit unavailable state), not fabricated data");
  });
});

describe("PLAN_DEFINITIONS vs. Package/checkLimit — every real mismatch resolved, no silent drift left", () => {
  it("the old prospectsThisMonth checkLimit resource (display-only, never enforced, disagreed with the real numbers) has been removed", () => {
    const code = readSrc("src/lib/plan-limits.ts");
    assert.ok(!code.includes('| "prospectsThisMonth"'), "must not keep prospectsThisMonth as a callable LimitResource");
    assert.ok(!code.includes('case "prospectsThisMonth"'), "must not keep the dead/superseded switch case");

    const billingCode = readSrc("src/app/(dashboard)/settings/billing/page.tsx");
    assert.ok(!billingCode.includes('checkLimit(organizationId, "prospectsThisMonth")'));
    assert.ok(billingCode.includes('checkQuota(organizationId, "PRODUCT_RESEARCH")'), "billing page must show the same, actually-enforced product-research number");
  });

  it("every public/customer-facing surface that shows product-research quota derives it from PLAN_DEFINITIONS, never from Package.maxProspectsPerMonth", () => {
    const surfaces = [
      "src/app/pricing/pricing-client.tsx",
      "src/app/checkout/checkout-client.tsx",
      "src/app/marketing-homepage.tsx",
      "src/app/(dashboard)/settings/billing/page.tsx",
    ];
    for (const file of surfaces) {
      const code = readSrc(file);
      assert.ok(code.includes("PLAN_DEFINITIONS"), `${file} must import/use PLAN_DEFINITIONS for product-research quota`);
    }
    // checkout-client and marketing-homepage previously read
    // selected.maxProspectsPerMonth / started?.maxProspectsPerMonth directly
    // for the customer-visible count — that specific display usage must be
    // gone (the field may still be fetched/present in the data shape,
    // just not used for this display anymore).
    assert.ok(!readSrc("src/app/checkout/checkout-client.tsx").includes("{selected.maxProspectsPerMonth.toLocaleString()}"));
    assert.ok(!readSrc("src/app/marketing-homepage.tsx").includes("started?.maxProspectsPerMonth ?? 200"));
    assert.ok(!readSrc("src/app/marketing-homepage.tsx").includes("pro?.maxProspectsPerMonth ?? 1000"));
    assert.ok(!readSrc("src/app/marketing-homepage.tsx").includes("agency?.maxProspectsPerMonth ?? 5000"));
  });

  it("pricing-client.tsx's feature comparison table derives every quota-numeric cell from PLAN_DEFINITIONS, not a second hardcoded literal copy", () => {
    const code = readSrc("src/app/pricing/pricing-client.tsx");
    assert.ok(code.includes("buildComparisonRows"), "the comparison table must be built from PLAN_DEFINITIONS, not a static hand-typed array");
    // The old, independently-drifting hardcoded literals for these fields
    // must not remain anywhere in the file.
    assert.ok(!code.includes('free: "15 / mo"'));
    assert.ok(!code.includes('free: "10 / mo"'));
    assert.ok(!code.includes('starter: "500 / mo"'));
  });

  it("fields with a genuine Package/checkLimit equivalent (trackedShops, connectedStores) agree exactly across both systems for every tier — a drift guard, not a redesign", () => {
    for (const tier of ["FREE", "STARTED", "PRO", "AGENCY"] as PlanTierKey[]) {
      const planDef = PLAN_DEFINITIONS[tier];
      const pkg = DEFAULT_PACKAGES.find((p) => p.key === tier);
      assert.ok(pkg, `DEFAULT_PACKAGES must still define ${tier}`);
      assert.equal(
        planDef.limits.trackedCompetitorShops,
        pkg!.maxTrackedShops,
        `${tier}: PLAN_DEFINITIONS.trackedCompetitorShops and Package.maxTrackedShops must agree — these are the same real, already-enforced limit (checkLimit's "trackedShops" resource) shown from two places`
      );
      assert.equal(
        planDef.limits.connectedEtsyStores,
        pkg!.maxSellerChannels,
        `${tier}: PLAN_DEFINITIONS.connectedEtsyStores and Package.maxSellerChannels must agree — same reasoning`
      );
      assert.equal(planDef.priceMonthlyUsd, pkg!.priceUsd, `${tier}: price must agree between both systems`);
    }
  });
});
