import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  discoverNichesFromProducts,
} from "@/services/intelligence/niche-discovery";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import type { NormalizedProduct } from "@/marketplaces/core/types";

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

describe("Batch 8: Niche Discovery & Demand Signal Aggregation", () => {
  registerAllConnectors();

  const mockProducts: NormalizedProduct[] = [
    {
      marketplace: "etsy",
      externalId: "prod-1",
      title: "Digital Wedding Planner GoodNotes",
      price: 19.99,
      currency: "USD",
      categoryPath: ["Paper & Party Supplies", "Paper", "Planners"],
      salesCount: 1200,
      reviewCount: 300,
      rating: 4.9,
      favoritesCount: 850,
      shop: {
        externalId: "shop-1",
        name: "PlanCraft",
        ageMonths: 18,
        activeListings: 25,
        avgSellingRatio: 48,
      },
      keywordSignals: [
        { term: "wedding planner", metric: "competition", value: 1200, source: "etsy", provenance: "ACTUAL_DATA" },
        { term: "goodnotes template", metric: "competition", value: 800, source: "etsy", provenance: "ACTUAL_DATA" },
      ],
      source: "ACTUAL_DATA",
      capturedAt: new Date(),
    },
    {
      marketplace: "etsy",
      externalId: "prod-2",
      title: "Printable Bridal Shower Planner",
      price: 14.5,
      currency: "USD",
      categoryPath: ["Paper & Party Supplies", "Paper", "Planners"],
      salesCount: 650,
      reviewCount: 120,
      rating: 4.8,
      favoritesCount: 420,
      shop: {
        externalId: "shop-2",
        name: "BridalBoutique",
        ageMonths: 10,
        activeListings: 15,
        avgSellingRatio: 43.3,
      },
      keywordSignals: [
        { term: "bridal planner", metric: "competition", value: 950, source: "etsy", provenance: "ACTUAL_DATA" },
        { term: "wedding planner", metric: "competition", value: 1200, source: "etsy", provenance: "ACTUAL_DATA" },
      ],
      source: "ACTUAL_DATA",
      capturedAt: new Date(),
    },
  ];

  describe("1. Niche Clustering & Opportunity Aggregation", () => {
    it("aggregates normalized products into a structured niche opportunity profile", () => {
      const summary = discoverNichesFromProducts(mockProducts, "etsy", "planner");

      assert.equal(summary.totalNichesFound, 1);
      assert.equal(summary.marketplace, "etsy");
      const niche = summary.niches[0];

      assert.equal(niche.nicheName, "Planners");
      assert.equal(niche.observedProductCount, 2);
      assert.equal(niche.status, "AVAILABLE");
      assert.ok(typeof niche.opportunityScore === "number");
      assert.ok(niche.opportunityScore >= 70, "High velocity planner niche should score >= 70");
      assert.ok(niche.confidence >= 70);
      assert.equal(niche.provenance, "ACTUAL_DATA");
    });

    it("calculates accurate price metrics and price ranges", () => {
      const summary = discoverNichesFromProducts(mockProducts, "etsy");
      const niche = summary.niches[0];

      assert.ok(niche.priceRange);
      assert.equal(niche.priceRange.min, 14.5);
      assert.equal(niche.priceRange.max, 19.99);
      assert.ok(Math.abs((niche.averagePrice ?? 0) - 17.245) < 0.02);
    });

    it("extracts subcategories and keyword clusters from product tags", () => {
      const summary = discoverNichesFromProducts(mockProducts, "etsy");
      const niche = summary.niches[0];

      assert.ok(niche.topSubcategories.length >= 1);
      assert.equal(niche.topSubcategories[0].name, "Paper");
      assert.equal(niche.topSubcategories[0].productCount, 2);

      assert.ok(niche.topKeywordClusters.length >= 1);
      const topCluster = niche.topKeywordClusters[0];
      assert.ok(topCluster.keywords.includes("wedding planner"));
    });
  });

  describe("2. Demand, Competition & Momentum Honesty", () => {
    it("computes demand proxy strength without claiming exact query volume", () => {
      const summary = discoverNichesFromProducts(mockProducts, "etsy");
      const demand = summary.niches[0].demand;

      assert.equal(demand.provenance, "ESTIMATED");
      assert.ok(["VERY_HIGH", "HIGH", "MODERATE"].includes(demand.strength));
      assert.ok(typeof demand.observedDailyVelocity === "number");
      assert.equal(demand.observedFavoritesTotal, 1270);
      assert.ok(demand.explanation.includes("units/day"));
    });

    it("computes competition barrier and shop concentration honestly", () => {
      const summary = discoverNichesFromProducts(mockProducts, "etsy");
      const comp = summary.niches[0].competition;

      assert.equal(comp.provenance, "SELLERSALT_SCORE");
      assert.ok(typeof comp.averageReviewThreshold === "number");
      assert.equal(comp.averageReviewThreshold, 210); // (300 + 120) / 2
      assert.ok(typeof comp.topShopConcentration === "number");
    });

    it("momentum reflects listing freshness and strictly refuses to fabricate historical growth percentage", () => {
      const summary = discoverNichesFromProducts(mockProducts, "etsy");
      const momentum = summary.niches[0].momentum;

      assert.equal(momentum.isHistorical, false);
      assert.equal(momentum.growthRatePercent, null, "Must never fabricate multi-month growth percentage");
      assert.ok(["RISING", "STABLE", "DECLINING"].includes(momentum.direction));
      assert.ok(momentum.explanation.includes("listing freshness velocity"));
    });

    it("transparent limitations note proxy estimations and single-channel availability", () => {
      const summary = discoverNichesFromProducts(mockProducts, "etsy");
      assert.ok(summary.marketLimitations.some((l) => l.includes("Etsy is currently the only active public market research integration")));
      assert.ok(summary.niches[0].limitations.some((l) => l.includes("Exact buyer search volume is unavailable")));
    });
  });

  describe("3. Unintegrated & Partial Marketplace Handling", () => {
    it("Unimplemented marketplaces return empty niches with honest zero-fabrication limitations", () => {
      const summary = discoverNichesFromProducts(mockProducts, "amazon");

      assert.equal(summary.totalNichesFound, 0);
      assert.equal(summary.niches.length, 0);
      assert.ok(summary.marketLimitations.some((l) => l.includes("Amazon public market research is not available")));
    });

    it("Partial marketplaces return PARTIAL status without fabricating niche scores", () => {
      const summary = discoverNichesFromProducts(mockProducts, "shopify");

      assert.equal(summary.totalNichesFound, 0);
      assert.equal(summary.niches.length, 0);
      assert.ok(summary.marketLimitations.some((l) => l.includes("Shopify public market research is not available")));
    });
  });

  describe("4. API Route & Component Integration", () => {
    it("API route /api/niches/discover exists and checks organization authentication", () => {
      const routeSrc = readSrc("src/app/api/niches/discover/route.ts");
      assert.ok(routeSrc.includes("discoverNichesFromDatabase"));
      assert.ok(routeSrc.includes("discoverLiveMarketplaceNiches"));
      assert.ok(routeSrc.includes("getServerSession(authOptions)"));
    });

    it("Discovery Hub page server-renders canonical niche summary and passes to DiscoveryClient", () => {
      const pageSrc = readSrc("src/app/(dashboard)/discovery/page.tsx");
      assert.ok(pageSrc.includes("discoverNichesFromDatabase"));
      assert.ok(pageSrc.includes("<DiscoveryClient"));
    });

    it("DiscoveryClient component renders niche opportunities with demand and competition signals", () => {
      const clientSrc = readSrc("src/app/(dashboard)/discovery/discovery-client.tsx");
      assert.ok(clientSrc.includes("Niche Discovery & Demand Signals"));
      assert.ok(clientSrc.includes("Demand Signal"));
      assert.ok(clientSrc.includes("Competition"));
      assert.ok(clientSrc.includes("Freshness"));
      assert.ok(clientSrc.includes("Data Provenance & Limitations"));
    });
  });
});
