/**
 * Batch 34: Real Acquisition Runtime Forensics — Integration Tests
 *
 * Proves the specific defects found and repaired while tracing why a real
 * merchant search ("wooden desk organizer", "ceramic mug", "wedding gifts",
 * "leather wallet") against the live staging environment produced zero
 * usable observations:
 *
 * 1. An upstream/credential failure (Etsy rejecting the configured API key
 *    with a real 403) must be classified as REQUIRES_CREDENTIALS — not
 *    silently discarded into an indistinguishable empty array.
 * 2. A rate-limit failure (429) must be classified as RATE_LIMITED.
 * 3. A genuine, clean zero-match search must NOT be misreported as a
 *    failure — no unavailableReason, itemCount 0.
 * 4. The HISTORICAL_OBSERVATION fallback (src/marketplaces/core/acquisition/
 *    orchestrator.ts) must never return another organization's Prospect
 *    rows — the cross-tenant leak this batch found and fixed.
 * 5. src/connectors/etsy/index.ts's runSearch must not swallow every
 *    keyword's search error into a silent [] — it must surface the
 *    failure so callers can distinguish it from real emptiness.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { orchestrateProductResearch } from "@/marketplaces/core/acquisition/orchestrator";
import { etsyConnector as marketplaceEtsyConnector } from "@/marketplaces/etsy/connector";
import { etsyPublicWebAdapter } from "@/marketplaces/etsy/public-adapter";
import { etsyConnector as researchEtsyConnector } from "@/connectors/etsy";
import { EtsyApiError } from "@/connectors/etsy/client";

function fakeEtsyApiError(statusCode: number, message: string): EtsyApiError {
  return new EtsyApiError({
    message: `Etsy API request failed on /listings/active (${statusCode}): ${message}`,
    path: "/listings/active",
    statusCode,
    isRetryable: false,
    retryCount: 0,
  });
}

describe("Batch 34: Real Acquisition Runtime Forensics", () => {
  describe("1. Credential/upstream failures are distinguishable from real emptiness", () => {
    const originalSearchProducts = marketplaceEtsyConnector.searchProducts;
    const originalSearchPublic = etsyPublicWebAdapter.searchPublicProducts;

    after(() => {
      marketplaceEtsyConnector.searchProducts = originalSearchProducts;
      etsyPublicWebAdapter.searchPublicProducts = originalSearchPublic;
    });

    it("classifies a real 403 (Etsy rejecting the API key) as REQUIRES_CREDENTIALS, with the real Etsy error text preserved", async () => {
      etsyPublicWebAdapter.searchPublicProducts = async () => ({
        success: false,
        marketplace: "etsy",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        statusCode: 403,
        error: "HTTP error 403",
        fetchedAt: new Date(),
      });
      marketplaceEtsyConnector.searchProducts = async () => {
        throw fakeEtsyApiError(403, "API key not found or not active, or incorrect shared secret for API key.");
      };

      const res = await orchestrateProductResearch(
        { query: "wooden desk organizer", marketplace: "etsy", organizationId: "nonexistent_org_batch34_test", limit: 10 },
        { preferredSources: ["PUBLIC_WEB", "MARKETPLACE_API"], allowHistoricalFallback: false }
      );

      assert.equal(res.items.length, 0);
      assert.equal(res.report.status, "UNAVAILABLE");
      assert.equal(res.report.unavailableReason, "REQUIRES_CREDENTIALS");
      assert.ok(
        res.report.limitations.some((l) => l.includes("API key not found or not active")),
        "the real Etsy rejection reason must survive into the report, not just a generic 403"
      );
    });

    it("classifies a 429 as RATE_LIMITED, not REQUIRES_CREDENTIALS", async () => {
      etsyPublicWebAdapter.searchPublicProducts = async () => ({
        success: false,
        marketplace: "etsy",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        statusCode: 429,
        error: "Etsy rate limit reached",
        fetchedAt: new Date(),
      });
      marketplaceEtsyConnector.searchProducts = async () => {
        throw fakeEtsyApiError(429, "Too many requests.");
      };

      const res = await orchestrateProductResearch(
        { query: "ceramic mug", marketplace: "etsy", organizationId: "nonexistent_org_batch34_test", limit: 10 },
        { preferredSources: ["PUBLIC_WEB", "MARKETPLACE_API"], allowHistoricalFallback: false }
      );

      assert.equal(res.report.unavailableReason, "RATE_LIMITED");
    });

    it("does NOT report a failure reason for a genuine, cleanly-executed zero-match search", async () => {
      etsyPublicWebAdapter.searchPublicProducts = async () => ({
        success: true,
        marketplace: "etsy",
        items: [],
        sourceType: "PUBLIC_WEB",
        provenance: "ACTUAL_DATA",
        statusCode: 200,
        fetchedAt: new Date(),
      });
      marketplaceEtsyConnector.searchProducts = async () => [];

      const res = await orchestrateProductResearch(
        { query: "a query genuinely matching nothing at all", marketplace: "etsy", organizationId: "nonexistent_org_batch34_test", limit: 10 },
        { preferredSources: ["PUBLIC_WEB", "MARKETPLACE_API"], allowHistoricalFallback: false }
      );

      assert.equal(res.items.length, 0);
      assert.equal(res.report.unavailableReason, undefined, "a clean empty result must never be classified as a failure");
    });
  });

  describe("2. HISTORICAL_OBSERVATION fallback never leaks across organizations", () => {
    const orgAId = `batch34_test_org_a_${Date.now()}`;
    const orgBId = `batch34_test_org_b_${Date.now()}`;
    let searchConfigAId: string;
    let connectorAId: string;

    before(async () => {
      await prisma.organization.create({ data: { id: orgAId, name: "Batch 34 Test Org A" } });
      await prisma.organization.create({ data: { id: orgBId, name: "Batch 34 Test Org B" } });

      const connector = await prisma.connector.create({
        data: {
          organizationId: orgAId,
          type: "ETSY",
          label: "Batch34 Test Connector",
          encryptedCredentials: "unused-in-this-test",
        },
      });
      connectorAId = connector.id;

      const config = await prisma.searchConfig.create({
        data: {
          organizationId: orgAId,
          connectorId: connectorAId,
          name: "batch34-test-config",
          keywords: ["batch34 unique marker term"],
          minPrice: 0,
          maxPrice: 1000,
          isActive: true,
        },
      });
      searchConfigAId = config.id;

      await prisma.prospect.create({
        data: {
          organizationId: orgAId,
          searchConfigId: searchConfigAId,
          keyword: "batch34 unique marker term",
          marketplace: "ETSY",
          shopExternalId: "batch34_shop",
          listingExternalId: "batch34_listing",
          shopName: "Batch34 Shop",
          shopUrl: "https://www.etsy.com/shop/batch34shop",
          shopAgeMonths: 12,
          reviewCount: 10,
          activeListings: 5,
          reviewRatio: 1,
          reviewVelocity: 1,
          listingTitle: "batch34 unique marker term test listing",
          listingUrl: "https://www.etsy.com/listing/batch34",
          price: 19.99,
        },
      });
    });

    after(async () => {
      await prisma.prospect.deleteMany({ where: { organizationId: orgAId } });
      await prisma.searchConfig.deleteMany({ where: { organizationId: orgAId } });
      await prisma.connector.deleteMany({ where: { organizationId: orgAId } });
      await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    });

    it("returns the owning organization's historical observation", async () => {
      const res = await orchestrateProductResearch(
        { query: "batch34 unique marker term", marketplace: "etsy", organizationId: orgAId, limit: 10 },
        { preferredSources: ["HISTORICAL_OBSERVATION"], allowHistoricalFallback: true, persistObservations: false }
      );
      assert.equal(res.report.itemCount, 1);
      assert.equal(res.items[0].externalId, "batch34_listing");
    });

    it("does not leak org A's historical observation into org B's search", async () => {
      const res = await orchestrateProductResearch(
        { query: "batch34 unique marker term", marketplace: "etsy", organizationId: orgBId, limit: 10 },
        { preferredSources: ["HISTORICAL_OBSERVATION"], allowHistoricalFallback: true, persistObservations: false }
      );
      assert.equal(res.report.itemCount, 0, "org B must never see org A's Prospect rows");
    });

    it("does not run an unscoped historical query when no organizationId is provided", async () => {
      const res = await orchestrateProductResearch(
        { query: "batch34 unique marker term", marketplace: "etsy", organizationId: "", limit: 10 },
        { preferredSources: ["HISTORICAL_OBSERVATION"], allowHistoricalFallback: true, persistObservations: false }
      );
      assert.equal(res.report.itemCount, 0);
    });
  });

  describe("3. Etsy research connector surfaces search failures instead of swallowing them", () => {
    it("runSearch throws (rather than silently returning []) when every keyword attempt fails", async () => {
      const badCredentials = { apiKey: "batch34_intentionally_invalid_key_000000" };
      await assert.rejects(
        () => researchEtsyConnector.runSearch(badCredentials, {
          keywords: ["wooden desk organizer"],
          minPrice: 0,
          maxPrice: 1_000_000,
          minShopAgeMonths: 0,
          maxShopAgeMonths: 1200,
          minReviewCount: 0,
        }),
        (err: any) => {
          assert.ok(err instanceof EtsyApiError, "must surface the real EtsyApiError, not swallow it");
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });
  });
});
