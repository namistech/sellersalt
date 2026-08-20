import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runProductResearch, runAllMarketplaceProductResearch } from "@/marketplaces/core/research-pipeline";
import { normalizeEtsyProspectToNormalizedProduct } from "@/marketplaces/core/normalizers/etsy";

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

describe("Real defect fix: research methods no longer call the Etsy API with empty credentials", () => {
  it("the Etsy connector's public-research methods resolve real credentials, never a bare {} literal", () => {
    const code = readSrc("src/marketplaces/etsy/connector.ts");
    assert.ok(!code.includes("runSearch({}, {"), "must not call the raw research connector with empty credentials");
    assert.ok(!code.includes("getShopByName({}, "), "must not call getShopByName with empty credentials");
    assert.ok(code.includes("resolveResearchCredentials"), "must resolve real per-organization or platform-shared credentials");
  });
});

describe("runProductResearch — explicit AVAILABLE/PARTIAL/UNAVAILABLE/NOT_IMPLEMENTED envelope", () => {
  it("Etsy with empty keywords returns AVAILABLE with zero results (no network call needed)", async () => {
    const result = await runProductResearch({ marketplace: "etsy", type: "products", keywords: [] });
    assert.equal(result.status, "AVAILABLE");
    assert.deepEqual(result.products, []);
  });

  it("TikTok Shop (zero capabilities — neither official API nor public web registered) returns NOT_IMPLEMENTED, never fabricated products", async () => {
    const result = await runProductResearch({ marketplace: "tiktok_shop", type: "products", keywords: ["desk organizer"] });
    assert.equal(result.status, "NOT_IMPLEMENTED");
    assert.deepEqual(result.products, []);
  });

  it("Amazon (official API not implemented, but a real PUBLIC_WEB capability is registered) with empty keywords returns AVAILABLE, not NOT_IMPLEMENTED (Batch 35 fix)", async () => {
    // Deterministic, no live network call — mirrors the Etsy test above:
    // empty keywords hits runProductResearch's "no query yet" early
    // return, which reports AVAILABLE for any marketplace with a real
    // capability. Before the Batch 35 fix, this incorrectly returned
    // NOT_IMPLEMENTED because the gate only checked the official
    // connector's capability, ignoring the registered public-web adapter.
    const result = await runProductResearch({ marketplace: "amazon", type: "products", keywords: [] });
    assert.equal(result.status, "AVAILABLE");
    assert.deepEqual(result.products, []);
  });

  it("Shopify (some capabilities, but not research) returns PARTIAL, not NOT_IMPLEMENTED", async () => {
    const result = await runProductResearch({ marketplace: "shopify", type: "products", keywords: ["desk organizer"] });
    assert.equal(result.status, "PARTIAL");
  });

  it("runAllMarketplaceProductResearch tags every marketplace independently, no cross-contamination", async () => {
    // Batch 35: amazon and ebay both have a real, registered PUBLIC_WEB
    // capability now (see the Amazon/TikTok Shop tests above), so with
    // empty keywords they report AVAILABLE like Etsy, not NOT_IMPLEMENTED
    // — the point of this test (independence, no cross-contamination) is
    // unaffected by which exact status each one reports.
    const results = await runAllMarketplaceProductResearch(["etsy", "amazon", "shopify", "ebay", "tiktok_shop"], {
      type: "products",
      keywords: [],
    });
    const byMarketplace = Object.fromEntries(results.map((r) => [r.marketplace, r.status]));
    assert.equal(byMarketplace.etsy, "AVAILABLE");
    assert.equal(byMarketplace.amazon, "AVAILABLE");
    assert.equal(byMarketplace.shopify, "PARTIAL");
    assert.equal(byMarketplace.ebay, "AVAILABLE");
    assert.equal(byMarketplace.tiktok_shop, "NOT_IMPLEMENTED");
  });
});

describe("NormalizedProduct carries every field the Prospect table (scheduled research pipeline) requires", () => {
  it("normalizeEtsyProspectToNormalizedProduct preserves shop metrics needed for opportunity scoring", () => {
    const product = normalizeEtsyProspectToNormalizedProduct({
      keyword: "desk organizer",
      shopExternalId: "shop_1",
      shopName: "TidyDeskCo",
      shopUrl: "https://etsy.com/shop/TidyDeskCo",
      shopAgeMonths: 30,
      reviewCount: 812,
      activeListings: 64,
      reviewRatio: 12.7,
      reviewVelocity: 27.1,
      totalSales: 5000,
      reviewAverage: 4.8,
      numFavorers: 340,
      avgSellingRatio: 78.1,
      estDailySales: 5.5,
      listingExternalId: "listing_99",
      listingTitle: "Wireless Desk Organizer",
      listingUrl: "https://etsy.com/listing/listing_99",
      price: 34.5,
    });

    assert.equal(product.marketplace, "etsy");
    assert.equal(product.externalId, "listing_99");
    assert.equal(product.shop?.activeListings, 64);
    assert.equal(product.shop?.reviewRatio, 12.7);
    assert.equal(product.shop?.reviewVelocity, 27.1);
    assert.equal(product.shop?.avgSellingRatio, 78.1);
    assert.equal(product.favoritesCount, 340);
    assert.equal(product.salesCount, 5000);
    assert.equal(product.estimatedDemand, 5.5);
    assert.equal(product.source, "ACTUAL_DATA");
  });
});

describe("Scheduled Prospects worker migrated off the old connector registry", () => {
  it("workers/index.ts's prospecting handler routes through runProductResearch, not a raw connector.runSearch call", () => {
    const code = readSrc("src/workers/index.ts");
    assert.ok(code.includes("runProductResearch"), "prospecting job must call the marketplace-neutral pipeline");
    assert.ok(code.includes('research.status !== "AVAILABLE"'), "must handle non-AVAILABLE status explicitly rather than assume success");
  });
});

describe("All-Marketplaces research API route", () => {
  // Not imported live here: route.ts pulls in next-auth's GoogleProvider,
  // which has a real ESM/CJS interop issue when loaded outside the Next.js
  // build (only Next's bundler applies the necessary default-export
  // shimming) — no existing test in this suite live-imports src/lib/auth.ts
  // for exactly this reason; they all read it as source text instead
  // (see src/tests/etsy-commercial-compliance-remediation.test.ts). Matching
  // that established convention here.
  it("checks for an authenticated organizationId and returns 401 before doing any research", () => {
    const code = readSrc("src/app/api/marketplaces/research/route.ts");
    assert.ok(code.includes("getServerSession(authOptions)"));
    assert.ok(code.includes('status: 401'));
    const orgCheckIndex = code.indexOf("if (!organizationId)");
    const researchCallIndex = code.indexOf("runAllMarketplaceProductResearch(");
    assert.ok(orgCheckIndex > -1 && researchCallIndex > -1 && orgCheckIndex < researchCallIndex, "auth check must happen before any research call");
  });

  it("defaults to every marketplace with a real research capability (official API OR public web) when none are specified, never a hardcoded list", () => {
    // Batch 35: this used to default to MarketplaceRegistry.listActive(),
    // which only reflects official API connector capability — Amazon and
    // Walmart's official connectors are architecture-ready stubs, so
    // "All Marketplaces" silently never attempted their real, working
    // PUBLIC_WEB adapters. Fixed to compute the default from either
    // capability source; verified functionally (not just textually) via
    // src/tests/batch-35-independent-acquisition.test.ts.
    const code = readSrc("src/app/api/marketplaces/research/route.ts");
    assert.ok(!code.includes("listActive().map("), "must not fall back to the official-API-only helper as the default marketplace list");
    assert.ok(code.includes("tryGetPublicWebAdapter"), "default marketplace computation must also consider public-web capability");
    assert.ok(code.includes("researchCapableMarketplaces"), "must compute the default from real combined research capability");
  });
});
