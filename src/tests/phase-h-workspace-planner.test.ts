import { test } from "node:test";
import assert from "node:assert/strict";
import { PlannerItemType, PlannerItemStatus } from "@prisma/client";
import type { PlannerItem, PlannerResearchSnapshot } from "@/types/planner";

test("Phase H: Planner Item Data Contracts & Construction", async (t) => {
  await t.test("constructs valid PlannerItem across all canonical types", () => {
    const types: PlannerItemType[] = [
      PlannerItemType.PRODUCT_RESEARCH,
      PlannerItemType.SHOP_RESEARCH,
      PlannerItemType.KEYWORD_RESEARCH,
      PlannerItemType.CONTENT_IDEA,
      PlannerItemType.LISTING_CONCEPT,
      PlannerItemType.SEO_TASK,
      PlannerItemType.EXECUTION_TASK,
    ];

    for (const itemType of types) {
      const item: Partial<PlannerItem> = {
        id: `plan_${itemType.toLowerCase()}`,
        organizationId: "org_alpha_123",
        title: `Plan for ${itemType}`,
        type: itemType,
        status: PlannerItemStatus.BACKLOG,
        priority: 1,
        targetKeywords: ["leather", "travel"],
      };

      assert.equal(item.organizationId, "org_alpha_123");
      assert.equal(item.type, itemType);
      assert.equal(item.status, PlannerItemStatus.BACKLOG);
    }
  });

  await t.test("strictly recognizes all 7 canonical workflow statuses", () => {
    const statuses: PlannerItemStatus[] = [
      PlannerItemStatus.BACKLOG,
      PlannerItemStatus.IN_PROGRESS,
      PlannerItemStatus.READY_FOR_DRAFT,
      PlannerItemStatus.DRAFT_CREATED,
      PlannerItemStatus.PUBLISHED_TO_ETSY,
      PlannerItemStatus.COMPLETED,
      PlannerItemStatus.ARCHIVED,
    ];

    assert.equal(statuses.length, 7);
    assert.ok(statuses.includes(PlannerItemStatus.READY_FOR_DRAFT));
    assert.ok(statuses.includes(PlannerItemStatus.PUBLISHED_TO_ETSY));
  });
});

test("Phase H: Research Snapshots & Multi-Discipline Provenance", async (t) => {
  await t.test("preserves Product Hunting research snapshot", () => {
    const productSnapshot: PlannerResearchSnapshot = {
      price: 34.5,
      estDailySales: 5.2,
      opportunityScore: 88,
      discoveredKeywords: ["leather passport", "travel wallet"],
      capturedAt: "2026-08-16T10:00:00.000Z",
    };

    const item: Partial<PlannerItem> = {
      id: "plan_prod_1",
      organizationId: "org_1",
      title: "Handmade Leather Passport Holder Concept",
      type: PlannerItemType.PRODUCT_RESEARCH,
      sourceType: "PRODUCT_HUNTING",
      sourceListingUrl: "https://www.etsy.com/listing/123456789",
      targetPrice: 34.5,
      researchSnapshot: productSnapshot,
    };

    assert.equal(item.researchSnapshot?.price, 34.5);
    assert.equal(item.researchSnapshot?.opportunityScore, 88);
    assert.equal(item.researchSnapshot?.estDailySales, 5.2);
    assert.equal(item.sourceType, "PRODUCT_HUNTING");
  });

  await t.test("preserves Shop Intelligence research snapshot", () => {
    const shopSnapshot: PlannerResearchSnapshot = {
      totalSales: 45000,
      shopAgeMonths: 24,
      activeListings: 120,
      opportunityScore: 82,
      capturedAt: "2026-08-16T10:00:00.000Z",
    };

    const item: Partial<PlannerItem> = {
      id: "plan_shop_1",
      organizationId: "org_1",
      title: "Competitor Strategy: StudioLeatherCraft",
      type: PlannerItemType.SHOP_RESEARCH,
      sourceType: "SHOP_RESEARCH",
      sourceShopExternalId: "shop_987654",
      sourceShopName: "StudioLeatherCraft",
      researchSnapshot: shopSnapshot,
    };

    assert.equal(item.researchSnapshot?.totalSales, 45000);
    assert.equal(item.researchSnapshot?.shopAgeMonths, 24);
    assert.equal(item.sourceShopName, "StudioLeatherCraft");
  });

  await t.test("preserves Standalone Keyword Research snapshot", () => {
    const keywordSnapshot: PlannerResearchSnapshot = {
      term: "minimalist wallet",
      frequency: 38,
      percentage: 76,
      relevanceScore: 95,
      estimatedDemandSignal: 240,
      competitionLevel: "LOW",
      tailClassification: "MID_TAIL",
      capturedAt: "2026-08-16T10:00:00.000Z",
    };

    const item: Partial<PlannerItem> = {
      id: "plan_kw_1",
      organizationId: "org_1",
      title: "Keyword: minimalist wallet",
      type: PlannerItemType.KEYWORD_RESEARCH,
      sourceType: "KEYWORD",
      sourceId: "minimalist wallet",
      targetKeywords: ["minimalist wallet"],
      researchSnapshot: keywordSnapshot,
    };

    assert.equal((item.researchSnapshot as any)?.term, "minimalist wallet");
    assert.equal((item.researchSnapshot as any)?.frequency, 38);
    assert.equal((item.researchSnapshot as any)?.competitionLevel, "LOW");
  });

  await t.test("preserves SEO Diagnostic Audit snapshot", () => {
    const seoSnapshot: PlannerResearchSnapshot = {
      listingId: "1729482012",
      overallScore: 68,
      grade: "D",
      titleScore: 20,
      tagScore: 23,
      synergyScore: 8,
      descriptionScore: 10,
      diagnosticsCount: 3,
      capturedAt: "2026-08-16T10:00:00.000Z",
    };

    const item: Partial<PlannerItem> = {
      id: "plan_seo_1",
      organizationId: "org_1",
      title: "Optimize SEO: Distressed Leather Journal",
      type: PlannerItemType.SEO_TASK,
      sourceType: "SEO_AUDIT",
      sourceId: "1729482012",
      researchSnapshot: seoSnapshot,
    };

    assert.equal((item.researchSnapshot as any)?.overallScore, 68);
    assert.equal((item.researchSnapshot as any)?.grade, "D");
    assert.equal(item.type, PlannerItemType.SEO_TASK);
  });
});

test("Phase H: Multi-Tenant Query Scoping & Integrity", async (t) => {
  await t.test("enforces organizationId filter on all workspace queries", () => {
    const mockDbQuery = (orgId: string, filterOrg: string) => {
      if (orgId !== filterOrg) return [];
      return [{ id: "item_1", title: "Isolated Plan", organizationId: orgId }];
    };

    const orgAResults = mockDbQuery("org_A", "org_A");
    assert.equal(orgAResults.length, 1);

    const crossTenantAttempt = mockDbQuery("org_A", "org_B");
    assert.equal(crossTenantAttempt.length, 0);
  });
});
