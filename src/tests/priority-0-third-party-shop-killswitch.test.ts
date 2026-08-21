/**
 * Priority 0 Security Remediation Tests: Third-Party Shop Lookup Kill Switch
 * 
 * Verifies that:
 * 1. isThirdPartyShopLookupEnabled() correctly reads ENABLE_THIRD_PARTY_SHOP_LOOKUP and defaults to false.
 * 2. When disabled, Etsy connector methods (getShopStats, getShopByName, getShopTopListings) return null/empty.
 * 3. When disabled, marketplace connector getPublicShopStats returns null.
 * 4. When disabled, fetchCompleteShopIntelligence rejects with a disabled message.
 * 5. All shop routes and background workers guard against third-party shop polling.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isThirdPartyShopLookupEnabled } from "@/lib/feature-flags";
import { etsyConnector } from "@/connectors/etsy";
import { etsyConnector as etsyMarketplaceConnector } from "@/marketplaces/etsy/connector";
import { fetchCompleteShopIntelligence } from "@/services/shop-intelligence";

const ROOT = process.cwd();
function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Priority 0: Third-Party Shop Lookup Kill Switch", () => {
  const originalEnv = process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP = originalEnv;
    } else {
      delete process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP;
    }
  });

  it("1. isThirdPartyShopLookupEnabled() defaults to false when env var is unset or false", () => {
    delete process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP;
    assert.strictEqual(isThirdPartyShopLookupEnabled(), false);

    process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP = "false";
    assert.strictEqual(isThirdPartyShopLookupEnabled(), false);

    process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP = "0";
    assert.strictEqual(isThirdPartyShopLookupEnabled(), false);

    process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP = "true";
    assert.strictEqual(isThirdPartyShopLookupEnabled(), true);
  });

  it("2. When disabled, Etsy connector getShopStats returns null immediately", async () => {
    process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP = "false";
    const result = await etsyConnector.getShopStats!({ apiKey: "test", sharedSecret: "test" }, "12345");
    assert.strictEqual(result, null);
  });

  it("3. When disabled, Etsy connector getShopByName returns null immediately", async () => {
    process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP = "false";
    const result = await etsyConnector.getShopByName!({ apiKey: "test", sharedSecret: "test" }, "TestShop");
    assert.strictEqual(result, null);
  });

  it("4. When disabled, Etsy connector getShopTopListings returns empty array immediately", async () => {
    process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP = "false";
    const result = await etsyConnector.getShopTopListings!({ apiKey: "test", sharedSecret: "test" }, "12345", 10);
    assert.deepStrictEqual(result, []);
  });

  it("5. When disabled, Etsy marketplace connector getPublicShopStats returns null", async () => {
    process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP = "false";
    const result = await etsyMarketplaceConnector.getPublicShopStats!("12345");
    assert.strictEqual(result, null);
  });

  it("6. When disabled, fetchCompleteShopIntelligence throws disabled error", async () => {
    process.env.ENABLE_THIRD_PARTY_SHOP_LOOKUP = "false";
    await assert.rejects(
      async () => {
        await fetchCompleteShopIntelligence("org_test", "12345");
      },
      /Third-party shop lookup is currently disabled/
    );
  });

  it("7. Verifies call-site source codes are protected by kill switch", () => {
    const shopApiCode = readSrc("src/app/api/shops/[shopExternalId]/route.ts");
    assert.ok(shopApiCode.includes("isThirdPartyShopLookupEnabled"), "src/app/api/shops/[shopExternalId]/route.ts must check kill switch");

    const trackApiCode = readSrc("src/app/api/shops/[shopExternalId]/track/route.ts");
    assert.ok(trackApiCode.includes("isThirdPartyShopLookupEnabled"), "src/app/api/shops/[shopExternalId]/track/route.ts must check kill switch");

    const resolveApiCode = readSrc("src/app/api/shops/resolve/route.ts");
    assert.ok(resolveApiCode.includes("isThirdPartyShopLookupEnabled"), "src/app/api/shops/resolve/route.ts must check kill switch");

    const trackingShopsApiCode = readSrc("src/app/api/tracking/shops/route.ts");
    assert.ok(trackingShopsApiCode.includes("isThirdPartyShopLookupEnabled"), "src/app/api/tracking/shops/route.ts must check kill switch");

    const workerCode = readSrc("src/workers/index.ts");
    assert.ok(workerCode.includes("isThirdPartyShopLookupEnabled"), "src/workers/index.ts must check kill switch in handleShopWatchJob");

    const envExample = readSrc(".env.example");
    assert.ok(envExample.includes("ENABLE_THIRD_PARTY_SHOP_LOOKUP="), ".env.example must declare ENABLE_THIRD_PARTY_SHOP_LOOKUP");
  });
});
