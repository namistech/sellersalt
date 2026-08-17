import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyEtsyUrl,
  extractListingIdFromUrl,
  extractShopNameFromUrl,
} from "../../extension/etsy/page-detector.js";
import { parseEtsyListingInput } from "@/lib/etsy-listing-parser";
import { auditListingSeo } from "@/services/seo-engine";
import {
  upsertCanonicalOpportunity,
  getCanonicalOpportunities,
} from "@/services/opportunity-memory";
import { executeStageTransition } from "@/services/execution-engine";
import { validateListingPreflight } from "@/services/listing-preflight-validator";
import { getFeatureAccess, PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";
import { MARKETPLACE_DEFINITIONS } from "@/services/marketplaces/types";
import type { ExtensionAnalyzeListingRequest } from "@/services/extension/contract";

test("Batch 20: Extension Page Classification & Extraction", async (t) => {
  await t.test("classifies public listing URLs and extracts numeric ID", () => {
    const url = "https://www.etsy.com/listing/1429810482/handmade-leather-card-holder?click_key=abc&click_sum=xyz";
    assert.equal(classifyEtsyUrl(url), "ETSY_LISTING_PUBLIC");
    assert.equal(extractListingIdFromUrl(url), "1429810482");
  });

  await t.test("classifies public shop URLs and extracts shop name", () => {
    const url = "https://www.etsy.com/shop/LayerSculpt3D?ref=simple-shop-header";
    assert.equal(classifyEtsyUrl(url), "ETSY_SHOP_PUBLIC");
    assert.equal(extractShopNameFromUrl(url), "LayerSculpt3D");
  });

  await t.test("classifies search result pages and category exploration", () => {
    assert.equal(classifyEtsyUrl("https://www.etsy.com/search?q=ceramic+mug"), "ETSY_SEARCH_RESULTS");
    assert.equal(classifyEtsyUrl("https://www.etsy.com/c/home-and-living"), "ETSY_SEARCH_RESULTS");
  });

  await t.test("classifies listing editor in Etsy Shop Manager", () => {
    assert.equal(
      classifyEtsyUrl("https://www.etsy.com/your/shops/me/listing-editor/edit/1429810482"),
      "ETSY_LISTING_EDITOR"
    );
  });
});

test("Batch 20: SEO Audit Input Parser Robustness & Shop Redirection", async (t) => {
  await t.test("parses numeric listing ID cleanly", () => {
    const res = parseEtsyListingInput("1429810482");
    assert.equal(res.listingId, 1429810482);
    assert.equal(res.isShopUrl, false);
  });

  await t.test("parses full listing URL with query parameters", () => {
    const res = parseEtsyListingInput("https://www.etsy.com/listing/1429810482/artisan-mug?ref=search");
    assert.equal(res.listingId, 1429810482);
    assert.equal(res.isShopUrl, false);
  });

  await t.test("intercepts shop URL and returns structured redirect guidance without 404 crash", () => {
    const res = parseEtsyListingInput("https://www.etsy.com/shop/LayerSculpt3D");
    assert.equal(res.listingId, null);
    assert.equal(res.isShopUrl, true);
    assert.equal(res.shopName, "LayerSculpt3D");
    assert.ok(res.error?.includes("is an Etsy shop URL"));
  });

  await t.test("executes deterministic SEO audit on valid input", () => {
    const audit = auditListingSeo({
      title: "Handmade Ceramic Pour Over Coffee Maker Dripper",
      tags: ["ceramic pour over", "coffee dripper", "handmade mug", "barista gift", "kitchen decor"],
      description: "Artisan handcrafted pour over coffee dripper.",
    });

    assert.ok(audit.overallScore > 0 && audit.overallScore <= 100);
    assert.ok(audit.breakdown.titleScore > 0);
    assert.ok(audit.diagnostics.length > 0);
    assert.ok(audit.grade);
  });
});

test("Batch 20: Opportunity Save & Enrichment from Browser Extension", async (t) => {
  const orgId = `org_ext_save_${Date.now()}`;

  const payload: ExtensionAnalyzeListingRequest = {
    listingId: "ext_listing_777",
    title: "Personalized Leather Passport Wallet",
    price: 34.0,
    tags: ["leather passport", "travel gift", "personalized wallet", "custom leather"],
    shopName: "WandererCrafts",
    shopId: "shop_wanderer_88",
    listingUrl: "https://www.etsy.com/listing/777/passport-wallet",
    imageUrl: "https://i.etsystatic.com/img.jpg",
  };

  await t.test("1-click saves opportunity from extension payload into Memory and Planner", () => {
    const { opportunity, isNew } = upsertCanonicalOpportunity(orgId, {
      source: "EXTENSION",
      listingExternalId: payload.listingId,
      listingTitle: payload.title,
      listingUrl: payload.listingUrl,
      listingImageUrl: payload.imageUrl,
      shopExternalId: payload.shopId,
      shopName: payload.shopName,
      price: payload.price,
      targetKeywords: payload.tags,
      primaryKeyword: payload.tags![0],
      stage: "SHORTLISTED",
    });

    assert.equal(isNew, true);
    assert.equal(opportunity.source, "EXTENSION");
    assert.equal(opportunity.listingTitle, "Personalized Leather Passport Wallet");
    assert.equal(opportunity.stage, "SHORTLISTED");
    assert.ok(opportunity.nextBestAction.actionLabel.length > 0);
  });

  await t.test("enriches existing opportunity on re-save without creating duplicate record", () => {
    const allBefore = getCanonicalOpportunities(orgId);
    const countBefore = allBefore.length;

    const { opportunity, isNew } = upsertCanonicalOpportunity(orgId, {
      source: "EXTENSION",
      listingExternalId: payload.listingId,
      listingTitle: "Personalized Leather Passport Wallet (Updated)",
      price: 39.0, // updated price
      targetKeywords: payload.tags,
    });

    assert.equal(isNew, false);
    assert.equal(opportunity.economics.price, 39.0);

    const allOpps = getCanonicalOpportunities(orgId);
    assert.equal(allOpps.length, countBefore, "Total opportunity count unchanged");
    const matched = allOpps.filter((o) => o.listingExternalId === payload.listingId);
    assert.equal(matched.length, 1, "Zero duplicate records for listingExternalId");
  });
});

test("Batch 20: Server-Authoritative Plan Gating & Entitlements", async (t) => {
  await t.test("Free Explorer plan has verified search limits and extension enabled", () => {
    const free = PLAN_DEFINITIONS.FREE;
    assert.equal(free.priceMonthlyUsd, 0);
    assert.equal(free.limits.monthlyKeywordSearches, 15);
    assert.equal(free.limits.trackedCompetitorShops, 1);
    assert.equal(free.limits.browserExtensionEnabled, true);
  });

  await t.test("Pro plan unlocks full scaling capabilities", () => {
    const pro = PLAN_DEFINITIONS.PRO;
    assert.equal(pro.priceMonthlyUsd, 49);
    assert.equal(pro.limits.monthlyKeywordSearches, 2500);
    assert.equal(pro.limits.connectedEtsyStores, 5);
    assert.equal(pro.limits.exportEnabled, true);
  });
});

test("Batch 20: Pre-Flight & Human Review Safety Gates", async (t) => {
  await t.test("validates complete listing pre-flight check before draft creation", () => {
    const validTags = [
      "leather passport",
      "travel wallet",
      "custom passport",
      "personalized gift",
      "passport holder",
      "travel accessories",
      "handcrafted leather",
      "adventure gift",
      "holiday travel",
      "couples passport",
      "leather goods",
      "groomsman gift",
      "travel keepsake",
    ];

    const preflight = validateListingPreflight({
      title: "Personalized Leather Passport Wallet | Custom Travel Document Holder",
      tags: validTags,
      description: "Handmade full-grain leather passport cover designed for international travel.\n\nSpecifications:\n- Dimensions: 5.5 x 4.0 inches\n- Holds 2 passports and 4 card slots\n\nCare Instructions:\nCondition with natural leather balm.",
      price: 38.0,
      cogs: 9.5,
      primaryKeyword: "leather passport",
    });

    assert.equal(preflight.status, "READY");
    assert.equal(preflight.blockers.length, 0);
    assert.ok(preflight.overallScore >= 90);
  });

  await t.test("strictly prevents unapproved publishing (Rule 9)", async () => {
    const orgId = `org_gate_test_${Date.now()}`;
    const { opportunity } = upsertCanonicalOpportunity(orgId, {
      source: "PRODUCT_RESEARCH",
      listingExternalId: "gate_item_1",
      listingTitle: "Artisan Wallet",
      price: 35.0,
    });

    const res = await executeStageTransition({
      organizationId: orgId,
      opportunityId: opportunity.id,
      targetStage: "PUBLISHED",
    });

    assert.equal(res.success, false);
    assert.ok(res.blockers?.some((b) => b.includes("Rule 9 Violation")));
  });
});

test("Batch 20: Multi-Marketplace Capability Declarations", async (t) => {
  await t.test("Etsy is active and future channels are coming soon", () => {
    assert.equal(MARKETPLACE_DEFINITIONS.etsy.status, "active");
    assert.equal(MARKETPLACE_DEFINITIONS.amazon.status, "coming_soon");
    assert.equal(MARKETPLACE_DEFINITIONS.ebay.status, "coming_soon");
    assert.equal(MARKETPLACE_DEFINITIONS.tiktok_shop.status, "coming_soon");
    assert.equal(MARKETPLACE_DEFINITIONS.walmart.status, "coming_soon");
  });
});
