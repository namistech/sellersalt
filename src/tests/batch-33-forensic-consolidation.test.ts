import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveEtsyOAuthRedirectUri,
  resolveEtsyOAuthConfiguration,
  CANONICAL_ETSY_CALLBACK_ROUTE,
  DEFAULT_ETSY_SCOPES,
} from "@/services/connectors/etsy-oauth-helper";
import { SETTING_DEFINITIONS } from "@/lib/app-settings";
import { buildRealWorkspaceContext } from "@/services/session";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";

test("Batch 33: Canonical Environment & OAuth Parity Audit", async (t) => {
  await t.test("strictly generates staging callbacks for staging.sellersalt.com with zero trailing slashes", () => {
    const config = resolveEtsyOAuthRedirectUri({
      reqHost: "staging.sellersalt.com",
      overrideClientId: "etsy_staging_key",
    });

    assert.equal(config.isValid, true);
    assert.equal(config.baseUrl, "https://staging.sellersalt.com");
    assert.equal(config.redirectUri, "https://staging.sellersalt.com/api/seller-channels/etsy/callback");
    assert.equal(config.environment, "staging");
    assert.ok(!config.redirectUri.endsWith("/"));
    assert.ok(!config.redirectUri.includes("namis.tech"), "Must never contain legacy domain");
  });

  await t.test("strictly generates production callbacks for sellersalt.com", () => {
    const config = resolveEtsyOAuthRedirectUri({
      reqHost: "sellersalt.com",
      overrideClientId: "etsy_prod_key",
    });

    assert.equal(config.isValid, true);
    assert.equal(config.baseUrl, "https://sellersalt.com");
    assert.equal(config.redirectUri, "https://sellersalt.com/api/seller-channels/etsy/callback");
    assert.equal(config.environment, "production");
    assert.ok(!config.redirectUri.endsWith("/"));
  });

  await t.test("Integration Hub contains all 8 canonical third-party marketplace and OAuth credentials", () => {
    const keys = new Set(SETTING_DEFINITIONS.map((s) => s.key));

    // Google
    assert.ok(keys.has("google_client_id"));
    assert.ok(keys.has("google_client_secret"));

    // Etsy
    assert.ok(keys.has("etsy_seller_client_id"));
    assert.ok(keys.has("etsy_seller_client_secret"));

    // Amazon
    assert.ok(keys.has("amazon_client_id"));
    assert.ok(keys.has("amazon_client_secret"));
    assert.ok(keys.has("amazon_seller_id"));

    // Shopify
    assert.ok(keys.has("shopify_client_id"));
    assert.ok(keys.has("shopify_client_secret"));

    // TikTok
    assert.ok(keys.has("tiktok_app_key"));
    assert.ok(keys.has("tiktok_app_secret"));

    // eBay
    assert.ok(keys.has("ebay_app_id"));
    assert.ok(keys.has("ebay_cert_id"));

    // WooCommerce
    assert.ok(keys.has("woocommerce_store_url"));
    assert.ok(keys.has("woocommerce_consumer_key"));
    assert.ok(keys.has("woocommerce_consumer_secret"));

    // Walmart
    assert.ok(keys.has("walmart_client_id"));
    assert.ok(keys.has("walmart_client_secret"));
  });

  await t.test("Admin user role receives unrestricted internal capabilities by default", () => {
    const adminContext = buildRealWorkspaceContext({
      userId: "admin_123",
      userEmail: "admin@sellersalt.com",
      userName: "Admin User",
      isAdmin: true,
      organizationId: "org_admin",
      organizationName: "Admin Workspace",
    });

    assert.equal(adminContext.roleLabel, "Admin");
    assert.ok(adminContext.capabilities.has("discover:view"));
    assert.ok(adminContext.capabilities.has("operate:view"));
    assert.ok(adminContext.capabilities.has("admin:preview"));

    // Normal non-admin member
    const memberContext = buildRealWorkspaceContext({
      userId: "member_456",
      userEmail: "user@example.com",
      userName: "Standard User",
      isAdmin: false,
      organizationId: "org_member",
      organizationName: "Standard Workspace",
    });

    assert.equal(memberContext.roleLabel, "Member");
    assert.ok(memberContext.capabilities.has("discover:view"));
    assert.ok(!memberContext.capabilities.has("admin:preview"));
  });

  await t.test("Free Explorer plan definition exists with canonical quotas", () => {
    const freePlan = PLAN_DEFINITIONS.FREE;
    assert.ok(freePlan, "FREE plan definition must exist");
    assert.equal(freePlan.key, "FREE");
    assert.equal(freePlan.priceMonthlyUsd, 0);
    assert.equal(freePlan.priceAnnualMonthlyUsd, 0);
    assert.equal(freePlan.limits.monthlyKeywordSearches, 15);
    assert.equal(freePlan.limits.monthlyProductResearches, 10);
    assert.equal(freePlan.limits.trackedCompetitorShops, 1);
    assert.equal(freePlan.limits.activePlannerItems, 3);
  });
});
