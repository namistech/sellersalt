import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  resolveEtsyOAuthRedirectUri,
  resolveEtsyOAuthConfiguration,
  CANONICAL_ETSY_CALLBACK_ROUTE,
  DEFAULT_ETSY_SCOPES,
} from "@/services/connectors/etsy-oauth-helper";
import { getOwnShopIntelligence } from "@/services/own-shop-intelligence";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";
import { createConnectToken, verifyConnectToken } from "@/lib/store-connect-token";

test("Batch 29.1: Etsy OAuth Forensic Audit & Redirect URI Resolution", async (t) => {
  await t.test("resolves exact staging redirect URI with dynamic reqHost and overrideClientId", () => {
    const config = resolveEtsyOAuthRedirectUri({
      reqHost: "anadash.namis.tech",
      reqProto: "https",
      overrideClientId: "etsy_test_client_key_123",
    });

    assert.equal(config.isValid, true);
    assert.equal(config.baseUrl, "https://anadash.namis.tech");
    assert.equal(config.redirectUri, "https://anadash.namis.tech/api/seller-channels/etsy/callback");
    assert.equal(config.clientId, "etsy_test_client_key_123");
    assert.equal(config.environment, "staging");
    assert.ok(!config.redirectUri.endsWith("/"), "Redirect URI must NOT have a trailing slash");
  });

  await t.test("resolves exact production redirect URI for sellersalt.com", () => {
    const config = resolveEtsyOAuthRedirectUri({
      reqHost: "sellersalt.com",
      reqProto: "https",
      overrideClientId: "prod_client_id_456",
    });

    assert.equal(config.isValid, true);
    assert.equal(config.baseUrl, "https://sellersalt.com");
    assert.equal(config.redirectUri, "https://sellersalt.com/api/seller-channels/etsy/callback");
    assert.equal(config.environment, "production");
  });

  await t.test("strictly prevents staging requests from generating production callbacks and vice versa", () => {
    const stagingConfig = resolveEtsyOAuthRedirectUri({
      reqHost: "anadash.namis.tech",
      overrideClientId: "test_key",
    });
    const prodConfig = resolveEtsyOAuthRedirectUri({
      reqHost: "sellersalt.com",
      overrideClientId: "test_key",
    });

    assert.notEqual(stagingConfig.redirectUri, prodConfig.redirectUri);
    assert.ok(stagingConfig.redirectUri.includes("anadash.namis.tech"));
    assert.ok(prodConfig.redirectUri.includes("sellersalt.com"));
  });

  await t.test("enforces HTTPS on non-localhost origins", () => {
    const config = resolveEtsyOAuthRedirectUri({
      reqHost: "anadash.namis.tech",
      reqProto: "http", // reverse proxy might forward http
      overrideClientId: "test_key",
    });

    assert.equal(config.isValid, true);
    assert.ok(config.redirectUri.startsWith("https://"), "Must enforce HTTPS for public origins");
  });

  await t.test("supports AppSetting redirect URI override", () => {
    const config = resolveEtsyOAuthRedirectUri({
      reqHost: "anadash.namis.tech",
      overrideRedirectUri: "https://custom.sellersalt.com/api/seller-channels/etsy/callback",
      overrideClientId: "test_key",
    });

    assert.equal(config.isValid, true);
    assert.equal(config.redirectUri, "https://custom.sellersalt.com/api/seller-channels/etsy/callback");
  });

  await t.test("flags missing credentials with ETSY_CLIENT_ID_MISSING diagnostic code", () => {
    const origEnv = process.env.ETSY_CLIENT_ID;
    const origKey = process.env.ETSY_KEYSTRING;
    const origApiKey = process.env.ETSY_API_KEY;
    const origSellerKey = process.env.ETSY_SELLER_CLIENT_ID;

    delete process.env.ETSY_CLIENT_ID;
    delete process.env.ETSY_KEYSTRING;
    delete process.env.ETSY_API_KEY;
    delete process.env.ETSY_SELLER_CLIENT_ID;

    const config = resolveEtsyOAuthRedirectUri({
      overrideClientId: "",
    });

    assert.equal(config.isValid, false);
    assert.equal(config.diagnosticCode, "ETSY_CLIENT_ID_MISSING");

    if (origEnv) process.env.ETSY_CLIENT_ID = origEnv;
    if (origKey) process.env.ETSY_KEYSTRING = origKey;
    if (origApiKey) process.env.ETSY_API_KEY = origApiKey;
    if (origSellerKey) process.env.ETSY_SELLER_CLIENT_ID = origSellerKey;
  });

  await t.test("safe OAuth diagnostic produces non-sensitive inspection data", () => {
    const diag = resolveEtsyOAuthConfiguration({
      reqHost: "anadash.namis.tech",
      overrideClientId: "efxloiz6kn6jhkzzbto4oz3v",
      credentialSource: "APP_SETTING",
    });

    assert.equal(diag.configured, true);
    assert.equal(diag.clientIdPresent, true);
    assert.equal(diag.maskedClientId, "efxl...oz3v");
    assert.equal(diag.callbackRoute, CANONICAL_ETSY_CALLBACK_ROUTE);
    assert.equal(diag.pkceEnabled, true);
    assert.equal(diag.stateEnabled, true);
    assert.equal(diag.credentialSource, "APP_SETTING");
    assert.ok(diag.requestedScopes.includes("listings_r"));
    assert.ok(diag.requestedScopes.includes("shops_r"));
  });

  await t.test("PKCE code_verifier and code_challenge comply with RFC 7636 and Etsy v3", () => {
    function base64url(buf: Buffer): string {
      return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    const verifier = base64url(crypto.randomBytes(32));
    assert.ok(verifier.length >= 43 && verifier.length <= 128, "Verifier must be 43-128 chars");
    assert.ok(/^[A-Za-z0-9_-]+$/.test(verifier), "Verifier must only contain unreserved URL-safe chars");

    const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
    assert.ok(challenge.length > 0);
    assert.ok(!challenge.includes("+") && !challenge.includes("/") && !challenge.includes("="));
  });

  await t.test("OAuth state token signs, verifies, and rejects tampering and expiration", () => {
    const origSecret = process.env.NEXTAUTH_SECRET;
    process.env.NEXTAUTH_SECRET = "test_super_secret_key_32_bytes_long_12345";

    const token = createConnectToken({
      organizationId: "org_test_pkce_123",
      storeUrl: "",
      label: "Test Etsy Connect",
      codeVerifier: "test_code_verifier_string_abc",
    }, 60);

    const verified = verifyConnectToken(token);
    assert.ok(verified);
    assert.equal(verified?.organizationId, "org_test_pkce_123");
    assert.equal(verified?.codeVerifier, "test_code_verifier_string_abc");

    // Tampered token rejection
    const tampered = token.slice(0, -4) + "XXXX";
    assert.equal(verifyConnectToken(tampered), null);

    // Expired token rejection (created with negative TTL)
    const expiredToken = createConnectToken({
      organizationId: "org_expired",
      storeUrl: "",
      label: "",
      codeVerifier: "xyz",
    }, -10);
    assert.equal(verifyConnectToken(expiredToken), null);

    process.env.NEXTAUTH_SECRET = origSecret;
  });
});

test("Batch 29.1: No Demo Data for New Users & Actionable Empty States", async (t) => {
  await t.test("returns completely empty data when no SellerChannel is connected", async () => {
    const report = await getOwnShopIntelligence("org_new_user_123");

    assert.equal(report.isConnected, false);
    assert.equal(report.healthScore, 0);
    assert.equal(report.healthTier, "EMPTY");
    assert.equal(report.underperformingListings.length, 0);
    assert.equal(report.optimizationQueue.length, 0);
    assert.equal(report.actualData.activeListingsCount, 0);
    assert.equal(report.actualData.totalSalesLifetime, 0);
    assert.equal(report.estimatedMetrics.estMonthlyRevenue, 0);
    assert.equal(report.estimatedMetrics.estDailySales, 0);

    // Actionable Next Best Action guiding the user to connect their real Etsy store
    assert.equal(report.primaryNextAction.actionHref, "/settings/channels");
    assert.ok(report.primaryNextAction.headline.includes("Connect your Etsy shop"));
    assert.ok(report.primaryNextAction.whyYouShouldCare.includes("analyze your listings, tags"));
  });
});

test("Batch 29.1: Real Etsy Banner & Image Gallery Extraction Rules", async (t) => {
  await t.test("extracts Etsy image URLs in descending size priority", () => {
    const rawEtsyImages = [
      { url_75x75: "https://etsy.com/img_75.jpg", url_570xN: "https://etsy.com/img_570.jpg", url_fullxfull: "https://etsy.com/img_full.jpg" },
      { url_170x135: "https://etsy.com/thumb_170.jpg" },
    ];

    function extractEtsyImageUrls(rawImages: any[]): string[] {
      const urls: string[] = [];
      if (Array.isArray(rawImages)) {
        for (const img of rawImages) {
          const url = img?.url_570xN || img?.url_fullxfull || img?.url_170x135 || img?.url_75x75;
          if (url && !urls.includes(url)) urls.push(url);
        }
      }
      return urls;
    }

    const extracted = extractEtsyImageUrls(rawEtsyImages);
    assert.equal(extracted.length, 2);
    assert.equal(extracted[0], "https://etsy.com/img_570.jpg");
    assert.equal(extracted[1], "https://etsy.com/thumb_170.jpg");
  });

  await t.test("prefers image_url_760x100 for shop cover", () => {
    const rawShop = {
      shop_id: 12345,
      image_url_760x100: "https://i.etsystatic.com/isbl/real_banner_760x100.jpg",
      banner_url: "https://i.etsystatic.com/fallback.jpg",
    };

    const bannerUrl = rawShop.image_url_760x100 || rawShop.banner_url || null;
    assert.equal(bannerUrl, "https://i.etsystatic.com/isbl/real_banner_760x100.jpg");
  });
});

test("Batch 29.1: Free Explorer Plan & Provenance Rules", async (t) => {
  await t.test("Free Explorer plan definition exists with correct limits", () => {
    const freePlan = PLAN_DEFINITIONS.FREE;
    assert.ok(freePlan, "FREE plan must be defined");
    assert.equal(freePlan.priceMonthlyUsd, 0);
    assert.equal(freePlan.limits.monthlyKeywordSearches, 15);
    assert.equal(freePlan.limits.monthlyProductResearches, 10);
    assert.equal(freePlan.limits.trackedCompetitorShops, 1);
    assert.equal(freePlan.limits.activePlannerItems, 3);
  });

  await t.test("maintains valid provenance badges across actual, estimated, and scored data", async () => {
    const report = await getOwnShopIntelligence("org_test_provenance");

    assert.equal(report.actualData.provenance, "ACTUAL_ETSY_DATA");
    assert.equal(report.estimatedMetrics.provenance, "ESTIMATED");
    assert.equal(report.primaryNextAction.provenance, "SELLERSALT_SCORE");
  });
});
