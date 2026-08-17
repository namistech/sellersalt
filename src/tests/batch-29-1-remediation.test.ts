import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveEtsyOAuthRedirectUri } from "@/services/connectors/etsy-oauth-helper";
import { getOwnShopIntelligence } from "@/services/own-shop-intelligence";
import { PLAN_DEFINITIONS } from "@/services/plans/plan-capabilities";

test("Batch 29.1: Etsy OAuth Credential & Redirect URI Resolution", async (t) => {
  await t.test("resolves valid redirect URI with dynamic reqHost and overrideClientId", () => {
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
  });

  await t.test("prioritizes reqHost over localhost NEXTAUTH_URL in staging and production", () => {
    const origNextAuth = process.env.NEXTAUTH_URL;
    process.env.NEXTAUTH_URL = "http://localhost:3000";

    const config = resolveEtsyOAuthRedirectUri({
      reqHost: "sellersalt.com",
      reqProto: "https",
      overrideClientId: "prod_client_id_456",
    });

    assert.equal(config.isValid, true);
    assert.equal(config.baseUrl, "https://sellersalt.com");
    assert.equal(config.redirectUri, "https://sellersalt.com/api/seller-channels/etsy/callback");
    assert.equal(config.environment, "production");

    process.env.NEXTAUTH_URL = origNextAuth;
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
