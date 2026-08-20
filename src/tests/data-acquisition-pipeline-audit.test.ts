import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import { buildCrossMarketplaceComparison } from "@/services/intelligence/cross-marketplace-comparison";
import { discoverNichesFromProducts } from "@/services/intelligence/niche-discovery";
import { scoreShopCompetition } from "@/marketplaces/core/opportunity-engine";
import type { NormalizedProduct } from "@/marketplaces/core/types";

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

describe("Data Acquisition & Research Pipeline Deep Audit", () => {
  registerAllConnectors();

  describe("1. Marketplace Connector Reality Matrix", () => {
    it("Etsy is the only connector with research: true", () => {
      const etsy = MarketplaceRegistry.getConnector("etsy");
      assert.equal(etsy.capabilities.research, true);
      assert.equal(etsy.capabilities.readOrders, true);
    });

    it("Shopify & WooCommerce are PARTIAL (orders only, research false)", () => {
      const shopify = MarketplaceRegistry.getConnector("shopify");
      assert.equal(shopify.capabilities.research, false);
      assert.equal(shopify.capabilities.readOrders, true);

      const woo = MarketplaceRegistry.getConnector("woocommerce");
      assert.equal(woo.capabilities.research, false);
      assert.equal(woo.capabilities.readOrders, true);
    });

    it("Amazon, eBay, and TikTok Shop are ARCHITECTURE READY (all false)", () => {
      for (const id of ["amazon", "ebay", "tiktok_shop"] as const) {
        const conn = MarketplaceRegistry.getConnector(id);
        assert.equal(conn.capabilities.research, false);
        assert.equal(conn.capabilities.readOrders, false);
        assert.equal(conn.capabilities.createListing, false);
      }
    });
  });

  describe("2. End-to-End Pipeline Data Flows", () => {
    const sampleProduct: NormalizedProduct = {
      marketplace: "etsy",
      externalId: "listing-12345",
      title: "Handmade Ceramic Coffee Mug",
      price: 28.5,
      currency: "USD",
      url: "https://etsy.com/listing/12345",
      categoryPath: ["Home & Living", "Kitchen & Dining", "Drinkware", "Mugs"],
      salesCount: 450,
      reviewCount: 88,
      rating: 4.95,
      favoritesCount: 320,
      shop: {
        externalId: "shop-999",
        name: "CeramicArtisan",
        ageMonths: 12,
        activeListings: 20,
        avgSellingRatio: 22.5,
      },
      source: "ACTUAL_DATA",
      capturedAt: new Date(),
    };

    it("Product Research evaluates canonical opportunity without fabricating missing signals", () => {
      const input = extractOpportunityInputFromNormalizedProduct(sampleProduct);
      const report = evaluateCanonicalOpportunity(input);

      assert.ok(report.overallScore !== null);
      assert.ok(report.overallScore >= 0 && report.overallScore <= 100);
      assert.ok(report.confidenceScore >= 50);
      assert.ok(["ACTUAL_DATA", "ESTIMATED", "SELLERSALT_SCORE"].includes(report.provenance));
    });

    it("Shop Intelligence computes competition score using real shop metrics", () => {
      const comp = scoreShopCompetition({
        marketplace: "etsy",
        shopName: sampleProduct.shop!.name!,
        totalSales: sampleProduct.salesCount!,
        reviewCount: sampleProduct.reviewCount!,
        activeListings: sampleProduct.shop!.activeListings!,
        shopAgeMonths: sampleProduct.shop!.ageMonths!,
        estDailySales: 1.25,
      });

      assert.ok(comp.score !== null && comp.score >= 0 && comp.score <= 100);
      assert.ok(comp.factors.length >= 3);
    });

    it("Niche Discovery groups products into clusters and derives demand proxies without fake query volumes", () => {
      const summary = discoverNichesFromProducts([sampleProduct], "etsy", "mug");

      assert.equal(summary.totalNichesFound, 1);
      const niche = summary.niches[0];
      assert.equal(niche.nicheName, "Mugs");
      assert.equal(niche.demand.provenance, "ESTIMATED");
      assert.equal(niche.demand.observedFavoritesTotal, 320);
      assert.equal(niche.momentum.isHistorical, false);
      assert.equal(niche.momentum.growthRatePercent, null, "Never manufactures growth percent");
    });

    it("Cross-Marketplace Comparison ranks only live channels", () => {
      const comparison = buildCrossMarketplaceComparison("ceramic mug", [
        {
          marketplace: "etsy",
          status: "AVAILABLE",
          products: [sampleProduct],
          summary: {
            totalProducts: 1,
            scoredProductsCount: 1,
            averageOpportunityScore: 82,
            averageConfidence: 88,
            availableSignalGroups: ["price", "demand"],
            unavailableSignalGroups: [],
          },
          generatedAt: new Date(),
        },
        {
          marketplace: "amazon",
          status: "NOT_IMPLEMENTED",
          products: [],
          generatedAt: new Date(),
        },
      ]);

      assert.equal(comparison.rankings.length, 1);
      assert.equal(comparison.rankings[0].marketplace, "etsy");
      assert.equal(comparison.availableMarketplaces[0], "etsy");
      assert.ok(comparison.unavailableMarketplaces.includes("amazon"));
    });
  });

  describe("3. Terminology & Zero-Fabrication Integrity", () => {
    it("tool-registry.ts contains zero fabricated keyword volume or fallback cards", () => {
      const toolSrc = readSrc("src/services/assistant/tool-registry.ts");
      assert.ok(!toolSrc.includes("4,850"));
      assert.ok(!toolSrc.includes("4850"));
      assert.ok(!toolSrc.includes("Sample Fallback"));
    });

    it("category-hunting.ts contains zero synthetic fallback root categories", () => {
      const catSrc = readSrc("src/services/category-hunting.ts");
      assert.ok(!catSrc.includes("Fallback Category"));
      assert.ok(!catSrc.includes("mockRoots"));
    });

    it("keyword-research route does not coerce missing values to zero when averaging", () => {
      const kwRouteSrc = readSrc("src/app/api/keyword-research/route.ts");
      assert.ok(kwRouteSrc.includes("priceListings = listings.filter"));
      assert.ok(kwRouteSrc.includes("reviewListings = listings.filter"));
      assert.ok(kwRouteSrc.includes("salesListings = listings.filter"));
    });

    it("prospect export preserves canonical provenance and honest column labels", () => {
      const prospectsSrc = readSrc("src/app/(dashboard)/prospects/page.tsx");
      assert.ok(prospectsSrc.includes("Est Daily Sales"));
      assert.ok(prospectsSrc.includes("Reviews"));
      assert.ok(prospectsSrc.includes("Active Listings"));
    });
  });
});
