import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import {
  acquireProductObservations,
  deduplicateProductObservations,
  type AcquisitionRequest,
} from "@/marketplaces/core/acquisition";
import { runProductResearch } from "@/marketplaces/core/research-pipeline";
import {
  evaluateCanonicalOpportunity,
  extractOpportunityInputFromNormalizedProduct,
} from "@/services/intelligence/canonical-opportunity";
import type { NormalizedProduct, NormalizedObservation } from "@/marketplaces/core/types";

describe("Batch 9A: Marketplace-Independent Data Acquisition Foundation", () => {
  registerAllConnectors();

  const sampleLiveProduct: NormalizedProduct = {
    marketplace: "etsy",
    externalId: "live-listing-101",
    title: "Handmade Ceramic Espresso Mug",
    price: 24.0,
    currency: "USD",
    salesCount: 150,
    reviewCount: 32,
    rating: 4.9,
    favoritesCount: 180,
    source: "ACTUAL_DATA",
    acquisitionMethod: "MARKETPLACE_API",
    isHistorical: false,
    capturedAt: new Date("2026-08-20T00:00:00Z"),
    shop: {
      externalId: "shop-1",
      name: "ClayAndCraft",
      ageMonths: 18,
      activeListings: 45,
    },
  };

  const sampleHistoricalProduct: NormalizedProduct = {
    marketplace: "etsy",
    externalId: "hist-listing-202",
    title: "Vintage Minimalist Coffee Mug",
    price: 29.5,
    currency: "USD",
    salesCount: 420,
    reviewCount: 95,
    rating: 4.85,
    favoritesCount: 310,
    source: "ACTUAL_DATA",
    acquisitionMethod: "HISTORICAL_OBSERVATION",
    isHistorical: true,
    capturedAt: new Date("2026-07-01T00:00:00Z"),
    shop: {
      externalId: "shop-2",
      name: "RetroCeramics",
      ageMonths: 36,
      activeListings: 80,
    },
  };

  describe("1. Source-Agnostic Observation Normalization & Tagging", () => {
    it("NormalizedProduct carries explicit acquisitionMethod and historical status", () => {
      assert.equal(sampleLiveProduct.acquisitionMethod, "MARKETPLACE_API");
      assert.equal(sampleLiveProduct.isHistorical, false);

      assert.equal(sampleHistoricalProduct.acquisitionMethod, "HISTORICAL_OBSERVATION");
      assert.equal(sampleHistoricalProduct.isHistorical, true);
    });

    it("evaluates canonical opportunity scoring without calling any external marketplace API directly", () => {
      const input = extractOpportunityInputFromNormalizedProduct(sampleLiveProduct);
      const report = evaluateCanonicalOpportunity(input);

      assert.ok(report.overallScore !== null);
      assert.ok(report.overallScore >= 0 && report.overallScore <= 100);
      assert.ok(report.confidenceScore >= 50);
      assert.ok(["ACTUAL_DATA", "ESTIMATED", "SELLERSALT_SCORE"].includes(report.provenance));
    });
  });

  describe("2. Deterministic Observation Deduplication", () => {
    it("deduplicates observations by marketplace:externalId", () => {
      const obs1: NormalizedObservation<NormalizedProduct> = {
        id: "obs:etsy:live-101:1",
        data: sampleLiveProduct,
        metadata: {
          sourceType: "MARKETPLACE_API",
          sourceIdentifier: "etsy:api",
          marketplace: "etsy",
          observedAt: new Date("2026-08-20T00:00:00Z"),
          provenance: "ACTUAL_DATA",
          isHistorical: false,
        },
      };

      const obs2: NormalizedObservation<NormalizedProduct> = {
        id: "obs:etsy:live-101:2",
        data: { ...sampleLiveProduct, price: 26.0 },
        metadata: {
          sourceType: "MARKETPLACE_API",
          sourceIdentifier: "etsy:api",
          marketplace: "etsy",
          observedAt: new Date("2026-08-20T05:00:00Z"),
          provenance: "ACTUAL_DATA",
          isHistorical: false,
        },
      };

      const deduplicated = deduplicateProductObservations([obs1, obs2]);
      assert.equal(deduplicated.length, 1);
      assert.equal(deduplicated[0].data.price, 26.0, "Keeps freshest observation");
    });

    it("prefers fresh live observation over older historical observation for the same product", () => {
      const historicalObs: NormalizedObservation<NormalizedProduct> = {
        id: "obs:etsy:101:old",
        data: { ...sampleLiveProduct, price: 20.0 },
        metadata: {
          sourceType: "HISTORICAL_OBSERVATION",
          sourceIdentifier: "sellersalt:db:prospect",
          marketplace: "etsy",
          observedAt: new Date("2026-07-01T00:00:00Z"),
          provenance: "ACTUAL_DATA",
          isHistorical: true,
        },
      };

      const liveObs: NormalizedObservation<NormalizedProduct> = {
        id: "obs:etsy:101:fresh",
        data: { ...sampleLiveProduct, price: 24.0 },
        metadata: {
          sourceType: "MARKETPLACE_API",
          sourceIdentifier: "etsy:api",
          marketplace: "etsy",
          observedAt: new Date("2026-08-20T00:00:00Z"),
          provenance: "ACTUAL_DATA",
          isHistorical: false,
        },
      };

      const deduplicated = deduplicateProductObservations([historicalObs, liveObs]);
      assert.equal(deduplicated.length, 1);
      assert.equal(deduplicated[0].metadata.sourceType, "MARKETPLACE_API");
      assert.equal(deduplicated[0].data.price, 24.0);
    });
  });

  describe("3. Multi-Source Acquisition Orchestrator & Graceful Degradation", () => {
    it("handles unintegrated marketplace by returning NOT_IMPLEMENTED without fabricating results", async () => {
      const result = await acquireProductObservations({
        marketplace: "amazon",
        query: "ceramic mug",
      });

      assert.equal(result.marketplace, "amazon");
      assert.equal(result.status, "NOT_IMPLEMENTED");
      assert.equal(result.observations.length, 0);
      assert.equal(result.products.length, 0);
      assert.equal(result.hasLiveCoverage, false);
    });

    it("handles partial marketplace (Shopify) by returning PARTIAL without fabricating results", async () => {
      const result = await acquireProductObservations({
        marketplace: "shopify",
        query: "ceramic mug",
      });

      assert.equal(result.marketplace, "shopify");
      assert.equal(result.status, "PARTIAL");
      assert.equal(result.observations.length, 0);
      assert.equal(result.products.length, 0);
      assert.equal(result.hasLiveCoverage, false);
    });

    it("handles unknown marketplace with honest NOT_IMPLEMENTED status", async () => {
      const result = await acquireProductObservations({
        marketplace: "unknown_channel" as any,
        query: "ceramic mug",
      });

      assert.equal(result.status, "NOT_IMPLEMENTED");
      assert.equal(result.observations.length, 0);
    });
  });

  describe("4. Research Pipeline Integration & Zero-Fabrication Contract", () => {
    it("runProductResearch gracefully reports status without crashing when API is unavailable", async () => {
      const result = await runProductResearch({
        marketplace: "amazon",
        type: "products",
        keywords: ["ceramic mug"],
      });

      assert.equal(result.marketplace, "amazon");
      assert.equal(result.status, "NOT_IMPLEMENTED");
      assert.equal(result.products.length, 0);
    });

    it("evaluates canonical opportunity with calibrated confidence for partial signals", () => {
      // Partial product with only price and title
      const partialProduct: NormalizedProduct = {
        marketplace: "etsy",
        externalId: "partial-1",
        title: "Minimalist Stoneware Cup",
        price: 18.0,
        currency: "USD",
        source: "ACTUAL_DATA",
        capturedAt: new Date("2026-08-20T00:00:00Z"),
      };

      const input = extractOpportunityInputFromNormalizedProduct(partialProduct);
      const report = evaluateCanonicalOpportunity(input);

      assert.ok(report.overallScore !== null);
      // Because sales, reviews, ratings, shop metrics are missing, confidence is reduced
      assert.ok(report.confidenceScore < 60, "Confidence reflects missing signals");
      assert.ok(report.signals.unavailable.length >= 3, "Missing signals are explicitly tracked");
    });
  });
});
