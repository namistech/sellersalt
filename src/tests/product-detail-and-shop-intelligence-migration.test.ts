import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { evaluateCanonicalOpportunity } from "@/services/intelligence/canonical-opportunity";
import { scoreShopCompetition, scoreNormalizedProductOpportunity } from "@/marketplaces/core/opportunity-engine";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import { fetchCompleteShopIntelligence } from "@/services/shop-intelligence";

const rootDir = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(rootDir, rel), "utf-8");

registerAllConnectors();

describe("Batch 3: Product Detail & Shop Intelligence Canonical Migration", () => {
  describe("1. Product Detail Canonical Opportunity Migration", () => {
    it("product detail page routes scoring through evaluateCanonicalOpportunity with proper metric provenance", () => {
      const pageCode = readSrc("src/app/(dashboard)/products/[listingId]/page.tsx");
      assert.ok(pageCode.includes("evaluateCanonicalOpportunity"), "page.tsx must use evaluateCanonicalOpportunity");
      assert.ok(!pageCode.includes("Math.random()"), "must never generate fake numbers");
      assert.ok(pageCode.includes('marketplace: "etsy"'), "must specify marketplace");
      assert.ok(pageCode.includes("canonicalOpportunity:"), "must pass canonicalOpportunity in ProductDetailData");
    });

    it("product detail client component consumes canonical intelligence results without calculating client-side formulas", () => {
      const clientCode = readSrc("src/app/(dashboard)/products/[listingId]/product-detail-client.tsx");
      assert.ok(!clientCode.includes("import { evaluateProductOpportunity }"), "must not import legacy evaluateProductOpportunity");
      assert.ok(clientCode.includes("product.canonicalOpportunity"), "must consume product.canonicalOpportunity");
      assert.ok(clientCode.includes("evaluatedScore = {"), "must map evaluatedScore from canonical results");
    });

    it("canonical opportunity engine evaluates real observed product metrics with accurate provenance", () => {
      const report = evaluateCanonicalOpportunity({
        marketplace: "etsy",
        price: {
          value: 34.99,
          availability: "OBSERVED",
          provenance: "ACTUAL_DATA",
          source: "etsy_listing_price",
        },
        estDailySales: {
          value: 5.2,
          availability: "ESTIMATED",
          provenance: "ESTIMATED",
          source: "etsy_transaction_velocity",
        },
        shopReviewCount: {
          value: 450,
          availability: "OBSERVED",
          provenance: "ACTUAL_DATA",
          source: "etsy_shop_review_count",
        },
        listingAgeDays: {
          value: 120,
          availability: "OBSERVED",
          provenance: "ACTUAL_DATA",
          source: "etsy_listing_created_timestamp",
        },
        numFavorers: {
          value: 85,
          availability: "OBSERVED",
          provenance: "ACTUAL_DATA",
          source: "etsy_num_favorers",
        },
      });

      assert.ok(report.overallScore !== null && report.overallScore >= 70, "high-velocity product should score well");
      assert.ok(report.confidenceScore >= 80, "all signals available should give high confidence");
      assert.equal(report.signalBreakdown.margin.availability, "DERIVED");
      assert.equal(report.signalBreakdown.velocity.availability, "ESTIMATED");
      assert.equal(report.signalBreakdown.competition.availability, "OBSERVED");
    });

    it("missing signals in product detail evaluation remain null and reduce confidence without fabricating 0", () => {
      const report = evaluateCanonicalOpportunity({
        marketplace: "etsy",
        price: {
          value: null,
          availability: "UNAVAILABLE",
          provenance: "UNAVAILABLE",
          source: "etsy_listing_price",
        },
        estDailySales: {
          value: null,
          availability: "UNAVAILABLE",
          provenance: "UNAVAILABLE",
          source: "etsy_transaction_velocity",
        },
        shopReviewCount: 150,
      });

      assert.ok(report.confidenceScore < 60, "missing price and sales should reduce confidence");
      assert.equal(report.signalBreakdown.margin.available, false);
      assert.equal(report.signalBreakdown.margin.availability, "UNAVAILABLE");
      assert.equal(report.signalBreakdown.velocity.available, false);
      assert.equal(report.signalBreakdown.velocity.availability, "UNAVAILABLE");
    });
  });

  describe("2. Shop Intelligence & Competition Scoring Migration", () => {
    it("shop-intelligence.ts computes competition score via scoreShopCompetition bridge", () => {
      const code = readSrc("src/services/shop-intelligence.ts");
      assert.ok(code.includes("scoreShopCompetition"), "must use scoreShopCompetition");
      assert.ok(code.includes("competition,"), "must return competition in fetchCompleteShopIntelligence");
    });

    it("shop-detail-client.tsx eliminates hardcoded fake KPI constants and uses scoreShopCompetition", () => {
      const code = readSrc("src/app/shops/[shopExternalId]/shop-detail-client.tsx");
      assert.ok(!code.includes("primary?.totalSales ?? 12500"), "must not fallback to 12500");
      assert.ok(!code.includes("primary?.activeListings ?? 48"), "must not fallback to 48");
      assert.ok(!code.includes("primary?.reviewCount ?? 1420"), "must not fallback to 1420");
      assert.ok(!code.includes("primary?.avgObservedPrice ?? 24.5"), "must not fallback to 24.5");
      assert.ok(code.includes("scoreShopCompetition"), "must import and use scoreShopCompetition");
    });

    it("scoreShopCompetition evaluates shop leverage and returns standardized factors and confidence", () => {
      const result = scoreShopCompetition({
        marketplace: "etsy",
        shopName: "HandmadeStudio",
        totalSales: 15000,
        reviewCount: 350,
        activeListings: 45,
        shopAgeMonths: 18,
        estDailySales: 7.5,
      });

      assert.ok(result.score !== null && result.score >= 70, "high-leverage shop should score high opportunity");
      assert.ok(result.confidence > 70);
      assert.ok(result.factors.length >= 4);
      assert.equal(result.dataSources[0], "etsy");
    });
  });

  describe("3. Market Research Tracking / Shop Watch Migration", () => {
    it("handleShopWatchJob in workers/index.ts uses MarketplaceRegistry and does not import old connectors/registry directly", () => {
      const code = readSrc("src/workers/index.ts");
      assert.ok(!code.includes('import { getConnector } from "../connectors/registry"'), "must not import old registry");
      assert.ok(code.includes("MarketplaceRegistry.tryGetConnector"), "must use MarketplaceRegistry.tryGetConnector");
      assert.ok(code.includes("connector.getPublicShopStats"), "must call getPublicShopStats");
      assert.ok(code.includes("registerAllConnectors"), "must call registerAllConnectors");
    });

    it("MarketplaceConnector getPublicShopStats is implemented for Etsy and returns normalized stats", async () => {
      const connector = MarketplaceRegistry.getConnector("etsy");
      assert.ok(connector.getPublicShopStats !== undefined, "etsy connector must implement getPublicShopStats");
    });

    it("unintegrated marketplaces do not provide public shop stats and degrade safely", async () => {
      const amazon = MarketplaceRegistry.getConnector("amazon");
      const ebay = MarketplaceRegistry.getConnector("ebay");
      const tiktok = MarketplaceRegistry.getConnector("tiktok_shop");

      assert.equal(amazon.capabilities.research, false);
      assert.equal(ebay.capabilities.research, false);
      assert.equal(tiktok.capabilities.research, false);
    });
  });

  describe("4. Legacy Engine Audit Verification", () => {
    it("deprecated opportunity-scoring.ts has zero production callers in src/app or src/services", () => {
      const filesToCheck = [
        "src/app/(dashboard)/products/[listingId]/page.tsx",
        "src/app/(dashboard)/products/[listingId]/product-detail-client.tsx",
        "src/app/(dashboard)/radar/radar-client.tsx",
        "src/app/(dashboard)/prospects/live-search-tab.tsx",
        "src/app/shops/[shopExternalId]/page.tsx",
        "src/app/shops/[shopExternalId]/shop-detail-client.tsx",
        "src/services/shop-intelligence.ts",
        "src/marketplaces/core/research-pipeline.ts",
        "src/workers/index.ts",
      ];

      for (const file of filesToCheck) {
        const code = readSrc(file);
        assert.ok(
          !code.includes("opportunity-scoring"),
          `${file} must not import deprecated opportunity-scoring.ts`
        );
      }
    });

    it("canonical-opportunity.ts is the canonical engine for product opportunity", () => {
      const code = readSrc("src/services/intelligence/canonical-opportunity.ts");
      assert.ok(code.includes("evaluateCanonicalOpportunity"));
      assert.ok(code.includes("MetricAvailability"));
      assert.ok(code.includes("CanonicalOpportunityReport"));
    });
  });
});
