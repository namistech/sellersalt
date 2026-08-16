import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_DEFINITIONS,
  getFeatureAccess,
  isTierSufficient,
} from "../services/plans/plan-capabilities";
import { parseEtsyListingInput } from "../lib/etsy-listing-parser";
import { diagnoseEtsyConnector } from "../services/connector-diagnostics";

describe("Batch 16: Commercial Plan Architecture & Quota Engine", () => {
  it("enforces graduated feature entitlements across all 4 tiers", () => {
    // 1. Free tier
    const freeAccess = getFeatureAccess("FREE");
    assert.strictEqual(freeAccess.canConnectEtsy, false);
    assert.strictEqual(freeAccess.canGenerateListingCopy, false);
    assert.strictEqual(freeAccess.canUseAdvancedSurveillance, false);
    assert.strictEqual(freeAccess.canAccessAgencyTools, false);

    // 2. Starter tier
    const starterAccess = getFeatureAccess("STARTED");
    assert.strictEqual(starterAccess.canConnectEtsy, true);
    assert.strictEqual(starterAccess.canGenerateListingCopy, true);
    assert.strictEqual(starterAccess.canUseAdvancedSurveillance, false);
    assert.strictEqual(starterAccess.canAccessAgencyTools, false);

    // 3. Pro / Growth tier
    const proAccess = getFeatureAccess("PRO");
    assert.strictEqual(proAccess.canConnectEtsy, true);
    assert.strictEqual(proAccess.canGenerateListingCopy, true);
    assert.strictEqual(proAccess.canUseAdvancedSurveillance, true);
    assert.strictEqual(proAccess.canManageMultipleStores, true);
    assert.strictEqual(proAccess.canAccessAgencyTools, false);

    // 4. Agency tier
    const agencyAccess = getFeatureAccess("AGENCY");
    assert.strictEqual(agencyAccess.canAccessAgencyTools, true);
  });

  it("verifies quota ceilings across all subscription tiers", () => {
    assert.strictEqual(PLAN_DEFINITIONS.FREE.limits.monthlyKeywordSearches, 15);
    assert.strictEqual(PLAN_DEFINITIONS.STARTED.limits.monthlyKeywordSearches, 250);
    assert.strictEqual(PLAN_DEFINITIONS.PRO.limits.monthlyKeywordSearches, 2500);
    assert.strictEqual(PLAN_DEFINITIONS.AGENCY.limits.monthlyKeywordSearches, 25000);

    assert.strictEqual(PLAN_DEFINITIONS.FREE.limits.trackedCompetitorShops, 1);
    assert.strictEqual(PLAN_DEFINITIONS.STARTED.limits.trackedCompetitorShops, 10);
    assert.strictEqual(PLAN_DEFINITIONS.PRO.limits.trackedCompetitorShops, 50);
    assert.strictEqual(PLAN_DEFINITIONS.AGENCY.limits.trackedCompetitorShops, 250);
  });
});

describe("Batch 16: Etsy Connector Diagnostic States", () => {
  it("reports graceful read degradation when write scopes are pending commercial review", () => {
    const report = diagnoseEtsyConnector(["shops_r", "listings_r"]);
    assert.strictEqual(report.isConnected, true);
    assert.strictEqual(report.commercialApprovalStatus, "STANDARD_READ");

    const writeCap = report.capabilities.find((c) => c.id === "listings-draft");
    assert.strictEqual(writeCap?.status, "REQUIRES_ETSY_APPROVAL");
    assert.ok(report.remedyAction.recommendation.includes("Listing Manager"));
  });
});

describe("Batch 16: SEO Audit Flow Input Safety", () => {
  it("safely handles URLs with query parameters", () => {
    const res = parseEtsyListingInput("https://www.etsy.com/listing/1429810482/custom-mug?ref=shop_home_active_1&pro=1");
    assert.strictEqual(res.listingId, 1429810482);
    assert.strictEqual(res.isShopUrl, false);
  });

  it("safely catches shop URLs with leading spaces and query parameters", () => {
    const res = parseEtsyListingInput("  https://www.etsy.com/shop/ArtisanStudio?section_id=123  ");
    assert.strictEqual(res.listingId, null);
    assert.strictEqual(res.isShopUrl, true);
    assert.strictEqual(res.shopName, "ArtisanStudio");
  });
});
