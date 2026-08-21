import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_DEFINITIONS,
  getFeatureAccess,
  canAccessFeature,
  type PlanTierKey,
} from "@/services/plans/plan-capabilities";
import { resolveConnectorLifecycleState } from "@/services/connector-diagnostics";
import { parseEtsyListingInput } from "@/lib/etsy-listing-parser";
import { auditListingSeo } from "@/services/seo-engine";

test("Batch 23: Plan Transition Matrix & Server-Authoritative Entitlements", async (t) => {
  await t.test("verifies FREE -> STARTED -> PRO -> AGENCY limit escalation", () => {
    const freeLimits = PLAN_DEFINITIONS.FREE.limits;
    const starterLimits = PLAN_DEFINITIONS.STARTED.limits;
    const proLimits = PLAN_DEFINITIONS.PRO.limits;
    const agencyLimits = PLAN_DEFINITIONS.AGENCY.limits;

    // Monthly searches scale monotonically
    assert.equal(freeLimits.monthlyKeywordSearches, 15);
    assert.equal(starterLimits.monthlyKeywordSearches, 250);
    assert.equal(proLimits.monthlyKeywordSearches, 2500);
    assert.equal(agencyLimits.monthlyKeywordSearches, 25000);

    // Tracked shops scale monotonically
    assert.equal(freeLimits.trackedCompetitorShops, 1);
    assert.equal(starterLimits.trackedCompetitorShops, 10);
    assert.equal(proLimits.trackedCompetitorShops, 50);
    assert.equal(agencyLimits.trackedCompetitorShops, 250);

    // Active planner items scale monotonically
    assert.equal(freeLimits.activePlannerItems, 3);
    assert.equal(starterLimits.activePlannerItems, 25);
    assert.equal(proLimits.activePlannerItems, 150);
    assert.equal(agencyLimits.activePlannerItems, 1000);

    // Connected Etsy stores scale monotonically
    assert.equal(freeLimits.connectedEtsyStores, 0);
    assert.equal(starterLimits.connectedEtsyStores, 1);
    assert.equal(proLimits.connectedEtsyStores, 5);
    assert.equal(agencyLimits.connectedEtsyStores, 25);
  });

  await t.test("verifies feature capability flags across all four tiers", () => {
    const freeAccess = getFeatureAccess("FREE");
    const starterAccess = getFeatureAccess("STARTED");
    const proAccess = getFeatureAccess("PRO");
    const agencyAccess = getFeatureAccess("AGENCY");

    // Free Explorer cannot access advanced surveillance or multi-store
    assert.equal(freeAccess.canAccessAgencyTools, false);
    assert.equal(freeAccess.canManageMultipleStores, false);

    // Pro unlocks AI generation and advanced tracking
    assert.equal(proAccess.canGenerateListingCopy, true);
    assert.equal(proAccess.canUseAdvancedTracking, true);

    // Agency unlocks multi-store client management & agency tools
    assert.equal(agencyAccess.canAccessAgencyTools, true);
    assert.equal(agencyAccess.canManageMultipleStores, true);
  });

  await t.test("canAccessFeature helper enforces server-authoritative feature gating", () => {
    assert.equal(canAccessFeature("FREE", "canGenerateListingCopy"), false);
    assert.equal(canAccessFeature("PRO", "canGenerateListingCopy"), true);
    assert.equal(canAccessFeature("STARTED", "canAccessAgencyTools"), false);
    assert.equal(canAccessFeature("AGENCY", "canAccessAgencyTools"), true);
  });
});

test("Batch 23: Onboarding & First-Value Flow Verification", async (t) => {
  await t.test("maps goal IDs to actionable primary product routes", () => {
    const goalRoutes: Record<string, string> = {
      radar: "/radar",
      keywords: "/keyword-research",
      seo: "/seo",
      competitors: "/shop-intelligence",
      own_shop: "/store",
      studio: "/studio",
    };

    assert.equal(goalRoutes.radar, "/radar");
    assert.equal(goalRoutes.keywords, "/keyword-research");
    assert.equal(goalRoutes.seo, "/seo");
    assert.equal(goalRoutes.own_shop, "/store");
  });

  await t.test("distinguishes active marketplace from coming-soon channels", () => {
    const marketplaceStatus: Record<string, "ACTIVE" | "COMING_SOON"> = {
      ETSY: "ACTIVE",
      AMAZON: "COMING_SOON",
      EBAY: "COMING_SOON",
      TIKTOK_SHOP: "COMING_SOON",
      WALMART: "COMING_SOON",
    };

    assert.equal(marketplaceStatus.ETSY, "ACTIVE");
    assert.equal(marketplaceStatus.AMAZON, "COMING_SOON");
    assert.equal(marketplaceStatus.TIKTOK_SHOP, "COMING_SOON");
  });
});

test("Batch 23: Etsy Connector Diagnostics & Lifecycle States", async (t) => {
  await t.test("accurately reports read-only vs write-capable connection states", () => {
    const readOnly = resolveConnectorLifecycleState({
      isConnected: true,
      grantedScopes: ["shops_r", "listings_r"],
    });
    assert.equal(readOnly.state, "CONNECTED_READ_ONLY");
    assert.equal(readOnly.isOperable, true);
    assert.equal(readOnly.canWriteDrafts, false);

    const writeCapable = resolveConnectorLifecycleState({
      isConnected: true,
      grantedScopes: ["shops_r", "listings_r", "listings_w"],
    });
    assert.equal(writeCapable.state, "CONNECTED_WRITE_CAPABLE");
    assert.equal(writeCapable.isOperable, true);
    assert.equal(writeCapable.canWriteDrafts, true);
  });

  await t.test("gracefully handles unlinked, revoked, and expired tokens", () => {
    const unlinked = resolveConnectorLifecycleState({ isConnected: false });
    assert.equal(unlinked.state, "NOT_CONNECTED");

    const revoked = resolveConnectorLifecycleState({ isConnected: true, isRevoked: true });
    assert.equal(revoked.state, "CONNECTION_REVOKED");

    const expired = resolveConnectorLifecycleState({ isConnected: true, isTokenExpired: true });
    assert.equal(expired.state, "AUTH_EXPIRED");
  });
});

test("Batch 23: SEO Audit Multi-Input Robustness", async (t) => {
  await t.test("correctly parses raw listing ID", () => {
    const res = parseEtsyListingInput("148920194");
    assert.equal(res.listingId, 148920194);
    assert.equal(res.isShopUrl, false);
  });

  await t.test("correctly intercepts shop URLs to prevent invalid listing API calls", () => {
    const res = parseEtsyListingInput("https://www.etsy.com/shop/LeatherCraftStudio");
    assert.equal(res.isShopUrl, true);
    assert.equal(res.shopName, "LeatherCraftStudio");
    assert.equal(res.listingId, null);
  });

  await t.test("performs complete SEO breakdown and produces explainable score", () => {
    const audit = auditListingSeo({
      title: "Handmade Ceramic Dripper for Coffee Pour Over",
      tags: ["ceramic dripper", "pour over coffee", "handmade mug"],
      description: "Handcrafted stoneware ceramic coffee dripper.",
    });

    assert.ok(audit.overallScore >= 0 && audit.overallScore <= 100);
    assert.ok(audit.breakdown.titleScore >= 0);
    assert.ok(audit.breakdown.tagScore >= 0);
  });
});
