import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildCrossMarketplaceComparison,
  compareAllMarketplaceProducts,
} from "@/services/intelligence/cross-marketplace-comparison";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import { NO_CAPABILITIES } from "@/marketplaces/core/capabilities";
import type { ProductResearchResult } from "@/marketplaces/core/research-pipeline";
import type { NormalizedProduct } from "@/marketplaces/core/types";

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

describe("Batch 7: Cross-Marketplace Intelligence & Comparison Engine", () => {
  registerAllConnectors();

  const mockEtsyProduct: NormalizedProduct = {
    marketplace: "etsy",
    externalId: "etsy-123",
    title: "Handmade Minimalist Ceramic Mug",
    price: 28.5,
    currency: "USD",
    salesCount: 1450,
    reviewCount: 320,
    rating: 4.9,
    favoritesCount: 890,
    shop: {
      externalId: "shop-999",
      name: "ClayAndCraft",
      ageMonths: 24,
      activeListings: 45,
      avgSellingRatio: 32.2,
    },
    source: "ACTUAL_DATA",
    capturedAt: new Date(),
  };

  const sampleResults: ProductResearchResult[] = [
    {
      marketplace: "etsy",
      status: "AVAILABLE",
      products: [mockEtsyProduct],
      generatedAt: new Date(),
      summary: {
        totalProducts: 1,
        scoredProductsCount: 1,
        averageOpportunityScore: 84,
        averageConfidence: 91,
        availableSignalGroups: ["Demand Momentum", "Unit Economics", "Competition Barrier", "Listing Freshness"],
        unavailableSignalGroups: [],
      },
    },
    {
      marketplace: "shopify",
      status: "PARTIAL",
      products: [],
      message: "Shopify product research is not available yet.",
      generatedAt: new Date(),
    },
    {
      marketplace: "amazon",
      status: "NOT_IMPLEMENTED",
      products: [],
      message: "Amazon product research is not available yet.",
      generatedAt: new Date(),
    },
    {
      marketplace: "ebay",
      status: "NOT_IMPLEMENTED",
      products: [],
      message: "eBay product research is not available yet.",
      generatedAt: new Date(),
    },
    {
      marketplace: "tiktok_shop",
      status: "NOT_IMPLEMENTED",
      products: [],
      message: "TikTok Shop product research is not available yet.",
      generatedAt: new Date(),
    },
  ];

  describe("1. Cross-Marketplace Domain Model & Evaluation", () => {
    it("buildCrossMarketplaceComparison evaluates available and unavailable channels independently", () => {
      const comparison = buildCrossMarketplaceComparison("ceramic mug", sampleResults);

      assert.equal(comparison.query, "ceramic mug");
      assert.equal(comparison.evaluations.length, 5);
      assert.deepEqual(comparison.availableMarketplaces, ["etsy"]);
      assert.deepEqual(comparison.unavailableMarketplaces, ["shopify", "amazon", "ebay", "tiktok_shop"]);
    });

    it("Etsy produces real evaluation with canonical opportunity score and calibrated confidence", () => {
      const comparison = buildCrossMarketplaceComparison("ceramic mug", sampleResults);
      const etsyEval = comparison.evaluations.find((e) => e.marketplace === "etsy");

      assert.ok(etsyEval);
      assert.equal(etsyEval.status, "AVAILABLE");
      assert.equal(etsyEval.opportunityScore, 84);
      assert.equal(etsyEval.confidence, 91);
      assert.equal(etsyEval.tier, "High Opportunity");
      assert.equal(etsyEval.verdict, "Strong Opportunity");
      assert.equal(etsyEval.verdictVariant, "success");
      assert.equal(etsyEval.provenance, "ACTUAL_DATA");
      assert.equal(etsyEval.products.length, 1);
    });

    it("Unimplemented marketplaces strictly produce null score, null confidence, and zero products", () => {
      const comparison = buildCrossMarketplaceComparison("ceramic mug", sampleResults);
      const unavail = comparison.evaluations.filter((e) => e.status === "NOT_IMPLEMENTED");

      assert.equal(unavail.length, 3);
      for (const item of unavail) {
        assert.equal(item.opportunityScore, null, `${item.marketplace} must have null score`);
        assert.equal(item.confidence, null, `${item.marketplace} must have null confidence`);
        assert.equal(item.products.length, 0, `${item.marketplace} must have 0 products`);
        assert.notEqual(item.opportunityScore, 0, "must never set score to 0 for unavailable channels");
      }
    });

    it("Partial marketplaces produce honest partial status with null public research scores", () => {
      const comparison = buildCrossMarketplaceComparison("ceramic mug", sampleResults);
      const shopifyEval = comparison.evaluations.find((e) => e.marketplace === "shopify");

      assert.ok(shopifyEval);
      assert.equal(shopifyEval.status, "PARTIAL");
      assert.equal(shopifyEval.opportunityScore, null);
      assert.equal(shopifyEval.confidence, null);
      assert.equal(shopifyEval.products.length, 0);
    });
  });

  describe("2. Cross-Marketplace Ranking Honesty", () => {
    it("Rankings exclude unavailable marketplaces and only rank channels with real data", () => {
      const comparison = buildCrossMarketplaceComparison("ceramic mug", sampleResults);

      assert.equal(comparison.rankings.length, 1, "Only Etsy should be in the rankings");
      assert.equal(comparison.rankings[0].rank, 1);
      assert.equal(comparison.rankings[0].marketplace, "etsy");
      assert.equal(comparison.rankings[0].opportunityScore, 84);
      assert.equal(comparison.rankings[0].confidence, 91);
    });

    it("Best available marketplace is identified without fabricated competitors", () => {
      const comparison = buildCrossMarketplaceComparison("ceramic mug", sampleResults);

      assert.ok(comparison.bestAvailableMarketplace);
      assert.equal(comparison.bestAvailableMarketplace.marketplace, "etsy");
      assert.equal(comparison.bestAvailableMarketplace.opportunityScore, 84);
      assert.equal(comparison.bestAvailableMarketplace.confidence, 91);
      assert.equal(comparison.bestAvailableMarketplace.verdict, "Strong Opportunity");
    });

    it("Multi-channel ranking sorts strictly by canonical score and confidence", () => {
      const multiResults: ProductResearchResult[] = [
        {
          marketplace: "etsy",
          status: "AVAILABLE",
          products: [mockEtsyProduct],
          generatedAt: new Date(),
          summary: {
            totalProducts: 1,
            scoredProductsCount: 1,
            averageOpportunityScore: 78,
            averageConfidence: 90,
            availableSignalGroups: ["Demand Momentum"],
            unavailableSignalGroups: [],
          },
        },
        {
          marketplace: "amazon",
          status: "AVAILABLE",
          products: [{ ...mockEtsyProduct, marketplace: "amazon" }],
          generatedAt: new Date(),
          summary: {
            totalProducts: 1,
            scoredProductsCount: 1,
            averageOpportunityScore: 88,
            averageConfidence: 85,
            availableSignalGroups: ["Demand Momentum", "Unit Economics"],
            unavailableSignalGroups: [],
          },
        },
      ];

      const comparison = buildCrossMarketplaceComparison("test query", multiResults);
      assert.equal(comparison.rankings.length, 2);
      assert.equal(comparison.rankings[0].marketplace, "amazon");
      assert.equal(comparison.rankings[0].rank, 1);
      assert.equal(comparison.rankings[1].marketplace, "etsy");
      assert.equal(comparison.rankings[1].rank, 2);
    });

    it("Transparent limitations explicitly explain channel status and estimation proxies", () => {
      const comparison = buildCrossMarketplaceComparison("ceramic mug", sampleResults);

      assert.ok(comparison.limitations.length >= 3);
      assert.ok(comparison.limitations.some((l) => l.includes("Etsy is currently the only active public market research integration")));
      assert.ok(comparison.limitations.some((l) => l.includes("Amazon, eBay, and TikTok Shop connectors are architecture-ready")));
      assert.ok(comparison.limitations.some((l) => l.includes("Shopify and WooCommerce connectors support authenticated seller order synchronization")));
    });
  });

  describe("3. API Route & Component Integration", () => {
    it("/api/marketplaces/research route returns both results and comparison envelope", () => {
      const routeSrc = readSrc("src/app/api/marketplaces/research/route.ts");
      assert.ok(routeSrc.includes("runAllMarketplaceProductResearch"));
      assert.ok(routeSrc.includes("buildCrossMarketplaceComparison"));
      assert.ok(routeSrc.includes("return NextResponse.json({ results, comparison })"));
    });

    it("AllMarketplacesResults component renders Cross-Marketplace Intelligence Matrix without fake scores", () => {
      const componentSrc = readSrc("src/components/intelligence/AllMarketplacesResults.tsx");
      assert.ok(componentSrc.includes("Cross-Marketplace Intelligence Comparison"));
      assert.ok(componentSrc.includes("Best Available Channel"));
      assert.ok(componentSrc.includes("Not Scored (Zero Fabrication)"));
      assert.ok(componentSrc.includes("Data Provenance & Channel Limitations"));
    });

    it("Opportunity Radar client consumes crossComparison from /api/marketplaces/research", () => {
      const radarSrc = readSrc("src/app/(dashboard)/radar/radar-client.tsx");
      assert.ok(radarSrc.includes("crossComparison"));
      assert.ok(radarSrc.includes("<AllMarketplacesResults results={crossResults} comparison={crossComparison} />"));
    });

    it("Product Detail page preserves canonical opportunity scoring and displays honest channel context", () => {
      const detailSrc = readSrc("src/app/(dashboard)/products/[listingId]/product-detail-client.tsx");
      assert.ok(detailSrc.includes("canonicalOpportunity"));
      assert.ok(detailSrc.includes("ACTUAL_ETSY_DATA"));
    });
  });
});
