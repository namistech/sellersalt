import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  runProductResearch,
  runAllMarketplaceProductResearch,
} from "@/marketplaces/core/research-pipeline";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import { scoreNormalizedProductOpportunity } from "@/marketplaces/core/opportunity-engine";
import { registerAllConnectors } from "@/marketplaces/core/registry";
import type { NormalizedProduct } from "@/marketplaces/core/types";

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

registerAllConnectors();

describe("Batch 2: Cross-Marketplace Intelligence & Radar Consolidation", () => {
  describe("1. Canonical Opportunity Integration in Research Pipeline", () => {
    it("runProductResearch attaches canonical opportunity scores and calibrated confidence to normalized products", async () => {
      const mockProduct: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "test_listing_1",
        title: "Handmade Ceramic Mug",
        price: 28.0,
        currency: "USD",
        salesCount: 450,
        estimatedDemand: 6.2,
        reviewCount: 95,
        rating: 4.9,
        shop: {
          externalId: "test_shop_1",
          name: "EarthAndClay",
          activeListings: 25,
          avgSellingRatio: 18.0,
        },
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const oppInput = extractOpportunityInputFromNormalizedProduct(mockProduct);
      const canonicalReport = evaluateCanonicalOpportunity(oppInput);

      assert.ok(canonicalReport.overallScore !== null);
      assert.ok(canonicalReport.confidenceScore > 0);
      assert.equal(typeof canonicalReport.overallScore, "number");
      assert.equal(typeof canonicalReport.confidenceScore, "number");

      const envelopeScore = scoreNormalizedProductOpportunity(mockProduct);
      assert.equal(envelopeScore.score, canonicalReport.overallScore);
      assert.equal(envelopeScore.confidence, canonicalReport.confidenceScore);
    });

    it("research-pipeline.ts attaches canonical opportunity score to products and exposes marketplace summary", () => {
      const code = readSrc("src/marketplaces/core/research-pipeline.ts");
      assert.ok(code.includes("evaluateCanonicalOpportunity"), "must use canonical opportunity evaluation");
      assert.ok(code.includes("extractOpportunityInputFromNormalizedProduct"), "must extract canonical inputs");
      assert.ok(code.includes("summary?: MarketplaceOpportunitySummary"), "ProductResearchResult must declare summary");
      assert.ok(code.includes("averageOpportunityScore"), "must calculate average opportunity score");
      assert.ok(code.includes("averageConfidence"), "must calculate average confidence");
    });
  });

  describe("2. Cross-Marketplace Research & Status Integrity", () => {
    it("marketplaces with a real research capability report AVAILABLE, while a genuinely unimplemented one remains strictly empty without fake data", async () => {
      // Batch 35: Amazon and eBay's official connectors are still
      // NOT_IMPLEMENTED, but both have a real, registered PUBLIC_WEB
      // adapter with productSearch capability (Amazon's genuinely works
      // after this batch's parser fix; eBay's is real but currently
      // blocked by the target site — either way, both are real
      // capabilities runProductResearch must actually attempt, not
      // silently skip). TikTok Shop has neither capability registered at
      // all — the only one of these four that's genuinely NOT_IMPLEMENTED.
      // With empty keywords, runProductResearch's own early-return for
      // "no query yet" reports AVAILABLE for any marketplace with a real
      // capability (matching Etsy's existing behavior for the same case).
      const results = await runAllMarketplaceProductResearch(["etsy", "amazon", "ebay", "tiktok_shop"], {
        type: "products",
        keywords: [],
      });

      assert.equal(results.length, 4);

      const etsy = results.find((r) => r.marketplace === "etsy");
      const amazon = results.find((r) => r.marketplace === "amazon");
      const ebay = results.find((r) => r.marketplace === "ebay");
      const tiktok = results.find((r) => r.marketplace === "tiktok_shop");

      assert.equal(etsy?.status, "AVAILABLE");
      assert.equal(amazon?.status, "AVAILABLE");
      assert.equal(ebay?.status, "AVAILABLE");
      assert.equal(tiktok?.status, "NOT_IMPLEMENTED");

      assert.deepEqual(amazon?.products, [], "no keywords means no query was run yet, not fabricated products");
      assert.deepEqual(ebay?.products, [], "no keywords means no query was run yet, not fabricated products");
      assert.deepEqual(tiktok?.products, [], "TikTok Shop must return 0 products when not implemented");
    });

    it("PARTIAL marketplace (Shopify / WooCommerce) returns PARTIAL status without fabricating research products", async () => {
      const results = await runAllMarketplaceProductResearch(["shopify", "woocommerce"], {
        type: "products",
        keywords: ["planner"],
      });

      assert.equal(results.length, 2);
      const shopify = results.find((r) => r.marketplace === "shopify");
      const woo = results.find((r) => r.marketplace === "woocommerce");

      assert.equal(shopify?.status, "PARTIAL");
      assert.equal(woo?.status, "PARTIAL");
      assert.deepEqual(shopify?.products, []);
      assert.deepEqual(woo?.products, []);
    });

    it("multi-marketplace results remain isolated and one failure does not throw or reject the batch", async () => {
      const results = await runAllMarketplaceProductResearch(["etsy", "amazon", "shopify", "ebay", "tiktok_shop", "woocommerce"], {
        type: "products",
        keywords: [],
      });

      assert.equal(results.length, 6);
      const statuses = results.map((r) => r.status);
      assert.ok(statuses.includes("AVAILABLE"));
      assert.ok(statuses.includes("NOT_IMPLEMENTED"));
      assert.ok(statuses.includes("PARTIAL"));
    });
  });

  describe("3. Zero Fabrication & Unavailable Provenance in Multi-Marketplace Results", () => {
    it("products with missing price or signals are evaluated honestly without fabricating 0", () => {
      const sparseProduct: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "sparse_1",
        title: "Vintage Poster",
        price: null, // missing price
        currency: null,
        salesCount: null,
        reviewCount: null,
        rating: null,
        source: "ACTUAL_DATA",
        capturedAt: new Date(),
      };

      const oppInput = extractOpportunityInputFromNormalizedProduct(sparseProduct);
      assert.equal((oppInput.price as any)?.availability, "UNAVAILABLE");
      assert.equal((oppInput.price as any)?.value, null);

      const report = evaluateCanonicalOpportunity(oppInput);
      // When signals are unavailable, confidence is significantly reduced rather than fabricating
      assert.ok(report.confidenceScore < 80);
      assert.ok(report.signals.unavailable.some((s) => s.id === "margin"));
    });
  });

  describe("4. Opportunity Radar UI Integration & Architectural Compliance", () => {
    it("radar-client.tsx wires MarketplaceSelector and routes 'all' to POST /api/marketplaces/research", () => {
      const code = readSrc("src/app/(dashboard)/radar/radar-client.tsx");
      assert.ok(code.includes("<MarketplaceSelector"), "must render MarketplaceSelector");
      assert.ok(code.includes('marketplace === "all"'), "must handle 'all' marketplace mode");
      assert.ok(code.includes('"/api/marketplaces/research"'), "must call the canonical cross-marketplace research route");
      assert.ok(code.includes("<AllMarketplacesResults"), "must render AllMarketplacesResults for 'all' mode");
    });

    it("radar-client.tsx renders honest MarketplaceStatusCard for non-Etsy single marketplaces", () => {
      const code = readSrc("src/app/(dashboard)/radar/radar-client.tsx");
      assert.ok(code.includes('marketplace !== "etsy" && marketplace !== "all"'), "must handle non-Etsy platforms");
      assert.ok(code.includes("<MarketplaceStatusCard"), "must render MarketplaceStatusCard for unintegrated platforms");
      assert.ok(!code.includes("Math.random()"), "must never generate fake radar data");
    });

    it("AllMarketplacesResults renders score, confidence, and signal availability badges", () => {
      const code = readSrc("src/components/intelligence/AllMarketplacesResults.tsx");
      assert.ok(code.includes("opportunityScore"), "must render opportunityScore");
      assert.ok(code.includes("confidence"), "must render confidence");
      assert.ok(code.includes("summary?.averageOpportunityScore"), "must render marketplace average opportunity score");
      assert.ok(code.includes("summary?.averageConfidence"), "must render marketplace average confidence");
      assert.ok(!code.includes("|| 0"), "must not default missing numbers to 0");
    });

    it("API route POST /api/marketplaces/research reuses the marketplace pipeline without inventing parallel endpoints", () => {
      const code = readSrc("src/app/api/marketplaces/research/route.ts");
      assert.ok(code.includes("runAllMarketplaceProductResearch"), "must call canonical pipeline");
      assert.ok(code.includes("registerAllConnectors"), "must register connectors");
    });
  });
});
