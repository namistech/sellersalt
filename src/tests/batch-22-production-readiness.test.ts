import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diagnoseEtsyConnector,
  mapConnectorError,
  resolveConnectorLifecycleState,
  type EtsyConnectionLifecycleState,
} from "@/services/connector-diagnostics";
import { parseEtsyListingInput } from "@/lib/etsy-listing-parser";
import { auditListingSeo } from "@/services/seo-engine";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";

test("Batch 22: Connector Lifecycle State Machine (13 Distinct States)", async (t) => {
  await t.test("evaluates NOT_CONNECTED state correctly", () => {
    const res = resolveConnectorLifecycleState({ isConnected: false });
    assert.equal(res.state, "NOT_CONNECTED");
    assert.equal(res.isOperable, false);
    assert.equal(res.canWriteDrafts, false);
  });

  await t.test("evaluates AUTHENTICATING state during active OAuth redirect flow", () => {
    const res = resolveConnectorLifecycleState({ isConnected: false, isAuthenticating: true });
    assert.equal(res.state, "AUTHENTICATING");
    assert.equal(res.isOperable, false);
  });

  await t.test("evaluates CONNECTED_READ_ONLY when standard read scopes are granted", () => {
    const res = resolveConnectorLifecycleState({
      isConnected: true,
      grantedScopes: ["shops_r", "listings_r"],
    });
    assert.equal(res.state, "CONNECTED_READ_ONLY");
    assert.equal(res.isOperable, true);
    assert.equal(res.canWriteDrafts, false);
  });

  await t.test("evaluates CONNECTED_WRITE_CAPABLE when listings_w commercial write scope is granted", () => {
    const res = resolveConnectorLifecycleState({
      isConnected: true,
      grantedScopes: ["shops_r", "listings_r", "listings_w"],
    });
    assert.equal(res.state, "CONNECTED_WRITE_CAPABLE");
    assert.equal(res.isOperable, true);
    assert.equal(res.canWriteDrafts, true);
  });

  await t.test("evaluates AUTH_EXPIRED on token expiry or 401 error", () => {
    const byFlag = resolveConnectorLifecycleState({ isConnected: true, isTokenExpired: true });
    assert.equal(byFlag.state, "AUTH_EXPIRED");

    const byError = resolveConnectorLifecycleState({
      isConnected: true,
      error: { status: 401, message: "Token expired" },
    });
    assert.equal(byError.state, "AUTH_EXPIRED");
  });

  await t.test("evaluates CONNECTION_REVOKED when user disconnected app on Etsy", () => {
    const res = resolveConnectorLifecycleState({ isConnected: true, isRevoked: true });
    assert.equal(res.state, "CONNECTION_REVOKED");
  });

  await t.test("evaluates SCOPE_MISSING when mandatory read scopes are absent", () => {
    const res = resolveConnectorLifecycleState({ isConnected: true, grantedScopes: ["email_r"] });
    assert.equal(res.state, "SCOPE_MISSING");
  });

  await t.test("evaluates RATE_LIMITED with explanation on 429 status", () => {
    const res = resolveConnectorLifecycleState({
      isConnected: true,
      error: { status: 429, message: "Rate limit exceeded" },
    });
    assert.equal(res.state, "RATE_LIMITED");
  });

  await t.test("evaluates RESOURCE_NOT_FOUND on deleted listing or shop", () => {
    const res = resolveConnectorLifecycleState({
      isConnected: true,
      error: { status: 404, message: "Listing not found" },
    });
    assert.equal(res.state, "RESOURCE_NOT_FOUND");
  });
});

test("Batch 22: SEO Audit Input Recovery & Robust URL Parsing", async (t) => {
  await t.test("parses numeric listing ID directly", () => {
    const parsed = parseEtsyListingInput("1429810482");
    assert.equal(parsed.listingId, 1429810482);
    assert.equal(parsed.isShopUrl, false);
  });

  await t.test("parses full listing URL with query parameters and slug", () => {
    const url = "https://www.etsy.com/listing/1429810482/handmade-ceramic-pour-over?ref=shop_home_active_1&pro=1";
    const parsed = parseEtsyListingInput(url);
    assert.equal(parsed.listingId, 1429810482);
    assert.equal(parsed.isShopUrl, false);
  });

  await t.test("gracefully intercepts shop URL and routes to shop intelligence without calling listing endpoints", () => {
    const shopUrl = "https://www.etsy.com/shop/CeramicArtisanStudio";
    const parsed = parseEtsyListingInput(shopUrl);
    assert.equal(parsed.isShopUrl, true);
    assert.equal(parsed.shopName, "CeramicArtisanStudio");
    assert.equal(parsed.listingId, null);
  });

  await t.test("rejects completely malformed or empty inputs gracefully", () => {
    const empty = parseEtsyListingInput("");
    assert.equal(empty.listingId, null);
    assert.ok(empty.error);

    const malformed = parseEtsyListingInput("not-an-etsy-link-xyz");
    assert.equal(malformed.listingId, null);
    assert.ok(malformed.error);
  });

  await t.test("performs complete SEO audit breakdown on valid payload", () => {
    const audit = auditListingSeo({
      title: "Handmade Ceramic Coffee Pour Over Dripper - Minimalist Kitchen Decor",
      tags: ["ceramic pour over", "coffee dripper", "handmade mug", "minimalist kitchen"],
      description: "Handcrafted stoneware ceramic pour over coffee maker.",
    });

    assert.ok(audit.overallScore >= 0 && audit.overallScore <= 100);
    assert.ok(audit.breakdown.titleScore >= 0);
    assert.ok(audit.breakdown.tagScore >= 0);
    assert.ok(audit.grade);
  });
});

test("Batch 22: Outcome-Based Plans & Server-Authoritative Quota Consistency", async (t) => {
  await t.test("verifies all four plan tiers maintain precise outcome statements", () => {
    assert.equal(PLAN_DEFINITIONS.FREE.outcome, "Understand the market.");
    assert.equal(PLAN_DEFINITIONS.STARTED.outcome, "Find and plan opportunities.");
    assert.equal(PLAN_DEFINITIONS.PRO.outcome, "Operate your seller business with intelligence.");
    assert.equal(PLAN_DEFINITIONS.AGENCY.outcome, "Run intelligence across clients and stores.");
  });

  await t.test("ensures monthly keyword search quotas scale hierarchically across tiers", () => {
    assert.equal(PLAN_DEFINITIONS.FREE.limits.monthlyKeywordSearches, 15);
    assert.equal(PLAN_DEFINITIONS.STARTED.limits.monthlyKeywordSearches, 250);
    assert.equal(PLAN_DEFINITIONS.PRO.limits.monthlyKeywordSearches, 2500);
    assert.equal(PLAN_DEFINITIONS.AGENCY.limits.monthlyKeywordSearches, 25000);
  });
});
