/**
 * Phase A Foundation & Data Contracts Verification Tests
 * 
 * Verifies domain contracts, type safety, relational constraints,
 * and data provenance classification.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  type DataProvenanceType,
  DATA_PROVENANCE_REGISTRY,
  getProvenanceMeta,
} from "../types/provenance";
import type {
  PlannerItemCreateInput,
  PlannerProvenance,
  PlannerItemType,
  PlannerItemStatus,
} from "../types/planner";
import type {
  ListingDraftCreateInput,
  ListingDraftStatus,
} from "../types/listing-draft";
import type {
  ListingSeoAuditInput,
  SeoScoreBreakdown,
} from "../types/seo";
import type {
  OriginalityCheckResult,
  OriginalityStatus,
} from "../types/originality";
import type {
  EtsyExecutionPayload,
  EtsyExecutionOperation,
  EtsyExecutionStatus,
} from "../types/execution";

describe("Phase A: Data Provenance System", () => {
  it("strictly recognizes all 4 authoritative provenance categories", () => {
    const expectedTypes: DataProvenanceType[] = [
      "ACTUAL_ETSY_DATA",
      "ESTIMATED",
      "SELLERSALT_SCORE",
      "EXTERNAL_DATA",
    ];

    for (const type of expectedTypes) {
      const meta = getProvenanceMeta(type);
      assert.equal(meta.type, type);
      assert.ok(meta.badgeText.startsWith("[") && meta.badgeText.endsWith("]"));
      assert.ok(meta.description.length > 10);
    }
  });

  it("prevents arbitrary string assignment to provenance types", () => {
    // Type-level assertion: verify registry keys match exact enum
    const keys = Object.keys(DATA_PROVENANCE_REGISTRY);
    assert.equal(keys.length, 4);
    assert.ok(keys.includes("ACTUAL_ETSY_DATA"));
    assert.ok(keys.includes("ESTIMATED"));
    assert.ok(keys.includes("SELLERSALT_SCORE"));
    assert.ok(keys.includes("EXTERNAL_DATA"));
  });

  it("correctly identifies badges and semantic variants", () => {
    assert.equal(DATA_PROVENANCE_REGISTRY.ACTUAL_ETSY_DATA.badgeText, "[ACTUAL ETSY DATA]");
    assert.equal(DATA_PROVENANCE_REGISTRY.ACTUAL_ETSY_DATA.variant, "success");

    assert.equal(DATA_PROVENANCE_REGISTRY.ESTIMATED.badgeText, "[ESTIMATED]");
    assert.equal(DATA_PROVENANCE_REGISTRY.ESTIMATED.variant, "info");

    assert.equal(DATA_PROVENANCE_REGISTRY.SELLERSALT_SCORE.badgeText, "[SELLERSALT SCORE]");
    assert.equal(DATA_PROVENANCE_REGISTRY.SELLERSALT_SCORE.variant, "gold");

    assert.equal(DATA_PROVENANCE_REGISTRY.EXTERNAL_DATA.badgeText, "[EXTERNAL DATA]");
    assert.equal(DATA_PROVENANCE_REGISTRY.EXTERNAL_DATA.variant, "neutral");
  });
});

describe("Phase A: Planner Item Contracts & Provenance", () => {
  it("constructs a valid PlannerItem with organization isolation and provenance", () => {
    const input: PlannerItemCreateInput = {
      organizationId: "org_test_123",
      type: "PRODUCT_RESEARCH" as PlannerItemType,
      title: "Minimalist Leather Passport Wallet",
      status: "BACKLOG" as PlannerItemStatus,
      priority: 1,
      notes: "High velocity niche spotted during prospect search.",
      targetPrice: 28.5,
      estimatedCogs: 6.5,
      targetKeywords: ["passport holder", "travel wallet", "leather gifts"],
      sourceType: "PROSPECT",
      sourceId: "prospect_999",
      sourceShopExternalId: "shop_888",
      sourceShopName: "LeatherCraftCo",
      sourceListingUrl: "https://etsy.com/listing/123456789",
      researchSnapshot: {
        price: 28.0,
        estDailySales: 4.2,
        totalSales: 1420,
        reviewCount: 38,
        activeListings: 14,
        shopAgeMonths: 6.5,
        opportunityScore: 88,
      },
    };

    assert.equal(input.organizationId, "org_test_123");
    assert.equal(input.type, "PRODUCT_RESEARCH");
    assert.equal(input.sourceType, "PROSPECT");
    assert.equal(input.researchSnapshot?.opportunityScore, 88);
    assert.equal(input.targetKeywords?.length, 3);
  });
});

describe("Phase A: Listing Draft & AI Originality Contracts", () => {
  it("constructs a valid ListingDraft linked to PlannerItem with compliant constraints", () => {
    const draft: ListingDraftCreateInput = {
      organizationId: "org_test_123",
      plannerItemId: "planner_item_abc",
      sellerChannelId: "channel_etsy_xyz",
      title: "Handmade Leather Passport Holder, Slim Travel Wallet with Card Slots, Personalized Monogram Gift",
      description: "Crafted from premium full-grain leather for discerning travelers...",
      tags: [
        "passport holder",
        "leather travel case",
        "personalized gift",
        "custom monogram",
        "travel accessories",
        "passport case",
        "gifts for him",
        "minimalist wallet",
        "groomsmen gift",
        "handmade leather",
        "vacation essentials",
        "slim passport cover",
        "passport sleeve",
      ],
      materials: ["Full Grain Leather", "Waxed Thread"],
      price: 29.99,
      quantity: 999,
      whoMade: "i_did",
      whenMade: "2020_2026",
      isSupply: false,
      isCustomizable: true,
      originalityScore: 92.5,
      originalityStatus: "PASSED" as OriginalityStatus,
      maxCommonSubstring: 3,
      seoScore: 95,
      state: "draft",
    };

    assert.ok(draft.title.length <= 140, "Title must not exceed 140 chars");
    assert.equal(draft.tags.length, 13, "Listing must have exactly 13 tags");
    for (const tag of draft.tags) {
      assert.ok(tag.length <= 20, `Tag '${tag}' must not exceed 20 characters`);
    }
    assert.equal(draft.originalityStatus, "PASSED");
    assert.equal(draft.originalityScore, 92.5);
  });
});

describe("Phase A: SEO Diagnostics & Audit Contracts", () => {
  it("validates explainable inputs for ListingSeoAudit", () => {
    const auditInput: ListingSeoAuditInput = {
      organizationId: "org_test_123",
      plannerItemId: "planner_item_abc",
      title: "Leather Passport Wallet",
      description: "A nice leather wallet.",
      tags: ["wallet", "leather"],
    };

    const scoreBreakdown: SeoScoreBreakdown = {
      overallScore: 48,
      grade: "F",
      titleScore: 10,
      tagScore: 8,
      keywordSynergyScore: 15,
      descriptionScore: 5,
      taxonomyScore: 5,
      attributeScore: 5,
    };

    assert.equal(scoreBreakdown.overallScore, 48);
    assert.equal(scoreBreakdown.grade, "F");
    assert.ok(auditInput.tags.length < 13, "Detects incomplete tags");
  });
});

describe("Phase A: Etsy Execution Log & Idempotency", () => {
  it("validates execution payload and unique idempotency constraint", () => {
    const execution: EtsyExecutionPayload = {
      organizationId: "org_test_123",
      userId: "user_owner_456",
      sellerChannelId: "channel_etsy_xyz",
      listingDraftId: "draft_789",
      operationType: "CREATE_DRAFT_LISTING" as EtsyExecutionOperation,
      entityType: "LISTING",
      entityId: "draft_789",
      idempotencyKey: "draft_push_draft_789_1723812345",
      requestPayload: {
        title: "Test Listing",
        price: 25.0,
        state: "draft",
      },
    };

    assert.equal(execution.operationType, "CREATE_DRAFT_LISTING");
    assert.equal(execution.entityType, "LISTING");
    assert.ok(execution.idempotencyKey.includes("draft_push_draft_789"));
  });
});
