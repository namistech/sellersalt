import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { checkQuota } from "@/services/plans/quota-enforcement";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";

// P0 launch blocker: checkQuota() was real and correct but had zero live
// enforcement call sites — Free-tier accounts had unlimited access to the
// 5 core paid differentiators. This file proves (a) checkQuota's own
// arithmetic is correct against real DB state for every wired action, and
// (b) each of the 5 routes actually calls it, at the right point, with the
// right identifier, using the existing success:false/error(403) convention
// already established by src/lib/plan-limits.ts's checkLimit() call sites.
//
// Route handlers transitively import @/lib/auth (next-auth), which breaks
// under tsx --test outside the Next.js bundler — routes are verified via
// source inspection, matching the established convention elsewhere in this
// suite (see marketplace-context-keyword-category-seo.test.ts).

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

const FREE = PLAN_DEFINITIONS.FREE.limits;

async function makeFreeOrg(name: string) {
  return prisma.organization.create({ data: { name } });
}

describe("checkQuota — real DB-backed arithmetic per action", () => {
  it("SEO_AUDIT: allowed under quota, blocked at quota, usage recorded exactly once per real row", async () => {
    const org = await makeFreeOrg("Quota Test Org — SEO Audit");
    try {
      const before = await checkQuota(org.id, "SEO_AUDIT");
      assert.equal(before.allowed, true);
      assert.equal(before.limit, FREE.monthlySeoAudits); // 3 — the real FREE-tier limit, not a re-derived number
      assert.equal(before.current, 0);

      const auditData = {
        organizationId: org.id,
        overallScore: 80,
        titleScore: 25,
        tagScore: 25,
        keywordSynergyScore: 12,
        descriptionScore: 8,
        taxonomyScore: 5,
        attributeScore: 5,
        titleCharCount: 100,
        tagCount: 10,
        diagnostics: [],
        recommendations: [],
      };

      await prisma.listingSeoAudit.create({ data: auditData });
      const afterOne = await checkQuota(org.id, "SEO_AUDIT");
      assert.equal(afterOne.current, 1, "creating exactly one real audit must increase usage by exactly one");
      assert.equal(afterOne.allowed, true);

      await prisma.listingSeoAudit.create({ data: auditData });
      await prisma.listingSeoAudit.create({ data: auditData });
      const atLimit = await checkQuota(org.id, "SEO_AUDIT");
      assert.equal(atLimit.current, 3);
      assert.equal(atLimit.allowed, false, "must block once current === limit, not only when current > limit");
      assert.ok(atLimit.upgradeMessage && atLimit.upgradeMessage.length > 0);
    } finally {
      await prisma.listingSeoAudit.deleteMany({ where: { organizationId: org.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    }
  });

  it("AI_GENERATION: allowed under quota, blocked at quota (FREE limit = 2)", async () => {
    const org = await makeFreeOrg("Quota Test Org — AI Generation");
    try {
      const before = await checkQuota(org.id, "AI_GENERATION");
      assert.equal(before.limit, FREE.monthlyAiListingGenerations); // 2
      assert.equal(before.allowed, true);

      const draftData = {
        organizationId: org.id,
        title: "Test Draft",
        description: "Test description",
        price: 10,
        state: "draft",
      };
      await prisma.listingDraft.create({ data: draftData });
      await prisma.listingDraft.create({ data: draftData });

      const atLimit = await checkQuota(org.id, "AI_GENERATION");
      assert.equal(atLimit.current, 2);
      assert.equal(atLimit.allowed, false);
    } finally {
      await prisma.listingDraft.deleteMany({ where: { organizationId: org.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    }
  });

  it("PLANNER_ITEM: counts only active (non-archived) items, blocked at FREE limit = 3", async () => {
    const org = await makeFreeOrg("Quota Test Org — Planner Item");
    try {
      for (let i = 0; i < 3; i++) {
        await prisma.plannerItem.create({
          data: { organizationId: org.id, title: `Item ${i}`, type: "PRODUCT_RESEARCH", status: "BACKLOG" },
        });
      }
      const atLimit = await checkQuota(org.id, "PLANNER_ITEM");
      assert.equal(atLimit.limit, FREE.activePlannerItems); // 3
      assert.equal(atLimit.current, 3);
      assert.equal(atLimit.allowed, false);

      // An archived item must not count against the active-item cap.
      await prisma.plannerItem.create({
        data: { organizationId: org.id, title: "Archived Item", type: "PRODUCT_RESEARCH", status: "ARCHIVED" },
      });
      const stillAtLimit = await checkQuota(org.id, "PLANNER_ITEM");
      assert.equal(stillAtLimit.current, 3, "an archived item must not be counted toward the active-item quota");
    } finally {
      await prisma.plannerItem.deleteMany({ where: { organizationId: org.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    }
  });

  it("KEYWORD_SEARCH and PRODUCT_RESEARCH share the same underlying Prospect count and each use their own FREE limit (15 / 10)", async () => {
    const org = await makeFreeOrg("Quota Test Org — Research");
    const connector = await prisma.connector.create({
      data: { organizationId: org.id, type: "ETSY", label: "Test Connector", encryptedCredentials: "test-not-a-real-secret" },
    });
    const searchConfig = await prisma.searchConfig.create({
      data: { organizationId: org.id, connectorId: connector.id, name: "Test Config", keywords: ["test"], minPrice: 0, maxPrice: 100 },
    });
    try {
      const beforeKw = await checkQuota(org.id, "KEYWORD_SEARCH");
      const beforePr = await checkQuota(org.id, "PRODUCT_RESEARCH");
      assert.equal(beforeKw.limit, FREE.monthlyKeywordSearches); // 15
      assert.equal(beforePr.limit, FREE.monthlyProductResearches); // 10
      assert.equal(beforeKw.allowed, true);
      assert.equal(beforePr.allowed, true);

      const prospectData = {
        organizationId: org.id,
        searchConfigId: searchConfig.id,
        marketplace: "ETSY" as const,
        keyword: "test",
        shopExternalId: "shop1",
        listingExternalId: "listing1",
        shopName: "Test Shop",
        shopUrl: "https://etsy.com/shop/test",
        shopAgeMonths: 12,
        reviewCount: 10,
        activeListings: 5,
        reviewRatio: 0.5,
        reviewVelocity: 1,
        listingTitle: "Test Listing",
        listingUrl: "https://etsy.com/listing/1",
        price: 10,
      };

      // 10 real Prospect rows: PRODUCT_RESEARCH (limit 10) is now exhausted,
      // KEYWORD_SEARCH (limit 15) is not — proving each action reads its own
      // limit from PLAN_DEFINITIONS even though both share one counter.
      for (let i = 0; i < 10; i++) {
        await prisma.prospect.create({ data: { ...prospectData, listingExternalId: `listing${i}` } });
      }

      const afterKw = await checkQuota(org.id, "KEYWORD_SEARCH");
      const afterPr = await checkQuota(org.id, "PRODUCT_RESEARCH");
      assert.equal(afterKw.current, 10);
      assert.equal(afterPr.current, 10);
      assert.equal(afterKw.allowed, true, "10 < 15, keyword search must still be allowed");
      assert.equal(afterPr.allowed, false, "10 >= 10, product research must be blocked");
    } finally {
      await prisma.prospect.deleteMany({ where: { organizationId: org.id } });
      await prisma.searchConfig.delete({ where: { id: searchConfig.id } });
      await prisma.connector.delete({ where: { id: connector.id } });
      await prisma.organization.delete({ where: { id: org.id } });
    }
  });
});

describe("Route wiring: all 5 routes call checkQuota at the correct point with the correct identifier", () => {
  const cases: Array<{ file: string; action: string; mustFollow?: string }> = [
    { file: "src/app/api/keywords/search/route.ts", action: "KEYWORD_SEARCH" },
    { file: "src/app/api/products/search/route.ts", action: "PRODUCT_RESEARCH" },
    { file: "src/app/api/seo/audit/route.ts", action: "SEO_AUDIT" },
    { file: "src/app/api/studio/generate/route.ts", action: "AI_GENERATION" },
    { file: "src/app/api/planner/items/route.ts", action: "PLANNER_ITEM", mustFollow: "Item is already in your Planner" },
  ];

  for (const { file, action, mustFollow } of cases) {
    it(`${file}: imports checkQuota, gates on "${action}", returns 403 + upgradeMessage, after the existing 401 check`, () => {
      const code = readSrc(file);
      assert.ok(code.includes('import { checkQuota } from "@/services/plans/quota-enforcement"'), `${file} must import checkQuota`);
      assert.ok(code.includes(`checkQuota(organizationId, "${action}")`), `${file} must call checkQuota with "${action}"`);
      assert.ok(code.includes("{ status: 403 }"), `${file} must return 403 on quota exhaustion`);
      assert.ok(code.includes("quota.upgradeMessage"), `${file} must surface the real upgrade message, not a generic string`);

      // Unauthorized behavior is unchanged: the existing 401 check must still
      // exist and must textually precede the quota check.
      const unauthorizedIdx = code.indexOf('{ status: 401 }');
      const quotaIdx = code.indexOf(`checkQuota(organizationId, "${action}")`);
      assert.ok(unauthorizedIdx !== -1 && unauthorizedIdx < quotaIdx, `${file}: the 401 unauthorized check must run before the quota check, unchanged`);

      if (mustFollow) {
        // The idempotency early-return (no new row created) must not be
        // gated by quota — the quota check must appear textually after it.
        const idempotentIdx = code.indexOf(mustFollow);
        assert.ok(idempotentIdx !== -1 && idempotentIdx < quotaIdx, `${file}: quota check must come after the idempotent early-return, so a duplicate save is never blocked`);
      }
    });
  }

  it("no route calls a separate usage-increment function — usage is derived purely from real row counts, so an error path can never double-count or under-count", () => {
    // quota-enforcement.ts intentionally exports only checkQuota (the
    // enforcement gate) and getPlanUsageSummary (a read-only aggregator of
    // several checkQuota calls, for display surfaces like PlanUsageCard) —
    // there is no "recordUsage"/"consumeQuota" step to forget on an error
    // path, by construction. This guards against a future change
    // accidentally introducing one that a route forgets to call correctly.
    const code = readSrc("src/services/plans/quota-enforcement.ts");
    const exportedFns = [...code.matchAll(/export (?:async )?function (\w+)/g)].map((m) => m[1]);
    assert.deepEqual(
      new Set(exportedFns),
      new Set(["checkQuota", "getPlanUsageSummary"]),
      "quota-enforcement.ts must not grow a second, separately-callable usage-recording function"
    );
  });
});
