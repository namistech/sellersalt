/**
 * Batch 40 — Data Foundation, Historical Observations & Keyword Research
 * Repair: dedicated regression suite. Covers:
 *  1. Prospect.price/reviewCount/activeListings/shopAgeMonths are never
 *     fabricated (write null, never 0/12/1) when the source marketplace
 *     genuinely didn't observe them.
 *  2. KeywordObservationSnapshot/CategoryObservationSnapshot are created
 *     only on a genuine change, never once per re-observation.
 *  3. Keyword Research's non-Etsy path never fabricates avgFavorers or a
 *     hardcoded competition level/score, and minPrice/maxPrice actually
 *     reach the adapter instead of being silently dropped.
 *  4. Multi-keyword OR-fanout for Keyword Research: bounded, deduped,
 *     merges real per-seed results.
 *
 * Deterministic fixture adapters only — no live network, CI-safe. Real
 * database tests (persistence/snapshots/organization isolation) use a
 * dedicated, cleaned-up test org, matching the pattern established in
 * batch-38-marketplace-native-product-research.test.ts.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import { persistPublicProductObservations, persistKeywordObservations, persistCategoryObservation } from "@/marketplaces/core/acquisition/persistence";
import { fetchMarketplaceKeywordResearch } from "@/services/keyword-research";
import type { PublicWebAcquisitionAdapter, PublicAcquisitionResult, PublicSearchQuery } from "@/marketplaces/core/acquisition/contracts";
import type { NormalizedProduct } from "@/marketplaces/core/types";
import type { CapabilityUnavailable } from "@/marketplaces/core/availability";
import type { KeywordSearchResponse } from "@/types/keyword-research";

registerAllConnectors();

// ---------------------------------------------------------------------------
// Fixture Amazon public-web adapter for Keyword Research — deterministic,
// no live network. No harvestPublicKeywords implemented, so
// harvestPublicMarketplaceKeywords exercises its "analyze search listings
// directly" fallback path, which is exactly the code path Batch 40 touched.
// ---------------------------------------------------------------------------
const KEYWORD_FIXTURE_CATALOG: NormalizedProduct[] = [
  { marketplace: "amazon", externalId: "K1", title: "Wooden Desk Organizer Classic Bamboo", url: "https://amazon.com/dp/K1", price: 24.99, currency: "USD", rating: null, reviewCount: null, source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: new Date("2026-08-21T00:00:00Z") },
  { marketplace: "amazon", externalId: "K2", title: "Wooden Desk Organizer Premium Bamboo", url: "https://amazon.com/dp/K2", price: 45.0, currency: "USD", rating: null, reviewCount: null, source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: new Date("2026-08-21T00:00:00Z") },
  { marketplace: "amazon", externalId: "K3", title: "Wood Storage Tray Bamboo Handmade", url: "https://amazon.com/dp/K3", price: 19.99, currency: "USD", rating: null, reviewCount: null, source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: new Date("2026-08-21T00:00:00Z") },
];

class FixtureKeywordAmazonAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "amazon" as const;
  readonly displayName = "Amazon";
  readonly domain = "amazon.com";
  readonly capabilities = {
    productSearch: true, productDetail: true, shopResearch: false, keywordDiscovery: true,
    categoryDiscovery: false, reviews: true, ratings: true, pricing: true, images: true,
    taxonomy: true, engagement: false, salesEstimation: false,
  };

  async searchPublicProducts(query: PublicSearchQuery): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const now = new Date();
    const q = (query.query || "").toLowerCase();

    let matched = KEYWORD_FIXTURE_CATALOG.filter((p) => {
      const title = p.title.toLowerCase();
      return q.split(" ").every((word) => word.length < 3 || title.includes(word));
    });

    // Batch 40: proves minPrice/maxPrice actually reach the adapter call
    // (previously silently dropped by harvestPublicMarketplaceKeywords).
    if (typeof query.minPrice === "number") {
      matched = matched.filter((p) => p.price !== null && p.price >= query.minPrice!);
    }
    if (typeof query.maxPrice === "number") {
      matched = matched.filter((p) => p.price !== null && p.price <= query.maxPrice!);
    }

    if (matched.length === 0) {
      return { success: false, marketplace: "amazon", items: [], sourceType: "PUBLIC_WEB", provenance: "UNAVAILABLE", statusCode: 200, failureReason: "NO_DATA", fetchedAt: now };
    }
    return { success: true, marketplace: "amazon", items: matched, sourceType: "PUBLIC_WEB", provenance: "ACTUAL_DATA", statusCode: 200, fetchedAt: now };
  }

  async fetchPublicProduct(): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    return { success: false, marketplace: "amazon", items: [], sourceType: "PUBLIC_WEB", provenance: "UNAVAILABLE", fetchedAt: new Date() };
  }
  // Deliberately no harvestPublicKeywords — exercises the fallback path.
}

const FIXTURE_ORG_ID = `batch40_fixture_org_${Date.now()}`;

before(async () => {
  MarketplaceRegistry.registerPublicWebAdapter(new FixtureKeywordAmazonAdapter());
  await prisma.organization.create({ data: { id: FIXTURE_ORG_ID, name: "Batch 40 Fixture Org" } });
});

after(async () => {
  await prisma.keywordObservationSnapshot.deleteMany({ where: { keywordObservation: { organizationId: FIXTURE_ORG_ID } } });
  await prisma.keywordObservation.deleteMany({ where: { organizationId: FIXTURE_ORG_ID } });
  await prisma.organization.delete({ where: { id: FIXTURE_ORG_ID } });
});

function isCapabilityUnavailable(res: unknown): res is CapabilityUnavailable {
  return typeof res === "object" && res !== null && (res as any).available === false;
}

describe("Batch 40: Keyword Research repair (fixture adapter, no live network)", () => {
  it("1. non-Etsy marketplace: avgFavorers is null, never a fabricated 0", async () => {
    const res = await fetchMarketplaceKeywordResearch("amazon", FIXTURE_ORG_ID, { query: "desk organizer" });
    assert.ok(!isCapabilityUnavailable(res), "must return real results, not a capability failure");
    const success = res as KeywordSearchResponse;
    assert.equal(success.summary.avgFavorers, null);
  });

  it("2. non-Etsy marketplace: competitionLevel/competitionScore are a real aggregate of the per-term scores, not a hardcoded MODERATE/50", async () => {
    const res = await fetchMarketplaceKeywordResearch("amazon", FIXTURE_ORG_ID, { query: "desk organizer" });
    assert.ok(!isCapabilityUnavailable(res));
    const success = res as KeywordSearchResponse;
    const perTermScores = success.keywords.map((k) => k.competitionScore);
    assert.ok(perTermScores.length > 0, "fixture must have harvested at least one term");
    const expectedAvg = Math.round(perTermScores.reduce((a, b) => a + b, 0) / perTermScores.length);
    assert.equal(success.summary.competitionScore, expectedAvg, "summary competitionScore must equal the real average of the per-term scores");
  });

  it("3. minPrice/maxPrice actually reach the adapter — previously silently dropped", async () => {
    const unfiltered = await fetchMarketplaceKeywordResearch("amazon", FIXTURE_ORG_ID, { query: "bamboo" });
    const filtered = await fetchMarketplaceKeywordResearch("amazon", FIXTURE_ORG_ID, { query: "bamboo", minPrice: 30 });
    assert.ok(!isCapabilityUnavailable(unfiltered) && !isCapabilityUnavailable(filtered));
    const u = unfiltered as KeywordSearchResponse;
    const f = filtered as KeywordSearchResponse;
    // K1=24.99, K2=45.0, K3=19.99 all match "bamboo"; minPrice=30 must leave only K2.
    assert.ok(u.summary.totalEtsySupply > f.summary.totalEtsySupply, "the price filter must actually narrow the observed sample, proving it reached the adapter");
    assert.equal(f.summary.avgPrice, 45.0);
  });

  it("4. multi-keyword OR-fanout merges real per-seed results and reports matchedKeywords", async () => {
    const res = await fetchMarketplaceKeywordResearch("amazon", FIXTURE_ORG_ID, {
      query: "desk organizer",
      keywords: ["desk organizer", "wood tray"],
    });
    assert.ok(!isCapabilityUnavailable(res));
    const success = res as KeywordSearchResponse;
    assert.deepEqual(success.matchedKeywords, ["desk organizer", "wood tray"]);
    const terms = success.keywords.map((k) => k.term);
    assert.ok(terms.some((t) => t.includes("organizer")), "must include a term only 'desk organizer' would harvest");
    assert.ok(terms.some((t) => t.includes("storage") || t.includes("handmade")), "must include a term only 'wood tray' would harvest, proving the second seed was actually searched");
  });

  it("5. multi-keyword fanout is bounded to 5 seeds", async () => {
    const res = await fetchMarketplaceKeywordResearch("amazon", FIXTURE_ORG_ID, {
      query: "a",
      keywords: ["a", "b", "c", "d", "e", "f", "g"],
    });
    assert.ok(!isCapabilityUnavailable(res));
    const success = res as KeywordSearchResponse;
    assert.ok(success.matchedKeywords && success.matchedKeywords.length <= 5, "must never fan out beyond MAX_FANOUT_KEYWORDS");
  });
});

describe("Batch 40: Historical snapshots created only on real change (real database)", () => {
  const orgId = `batch40_test_org_${Date.now()}`;

  before(async () => {
    await prisma.organization.create({ data: { id: orgId, name: "Batch 40 Test Org" } });
  });

  after(async () => {
    await prisma.keywordObservationSnapshot.deleteMany({ where: { keywordObservation: { organizationId: orgId } } });
    await prisma.keywordObservation.deleteMany({ where: { organizationId: orgId } });
    await prisma.categoryObservationSnapshot.deleteMany({ where: { categoryObservation: { organizationId: orgId } } });
    await prisma.categoryObservation.deleteMany({ where: { organizationId: orgId } });
    await prisma.productObservationSnapshot.deleteMany({ where: { productObservation: { organizationId: orgId } } });
    await prisma.productObservation.deleteMany({ where: { organizationId: orgId } });
    await prisma.searchConfig.deleteMany({ where: { organizationId: orgId } });
    await prisma.prospect.deleteMany({ where: { organizationId: orgId } });
    await prisma.connector.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
  });

  it("6. first keyword observation creates a baseline KeywordObservationSnapshot", async () => {
    const result = await persistKeywordObservations(
      [{ keyword: "batch40 unique term", occurrenceCount: 3, listingFrequencyPercent: 40, observedAveragePrice: 22.5, demandProxyScore: 60, competitionProxy: "MODERATE", intentCategory: "GENERAL" }],
      { organizationId: orgId, marketplace: "amazon" }
    );
    assert.equal(result.savedCount, 1);
    assert.equal(result.snapshotsCreated, 1);

    const row = await prisma.keywordObservation.findUnique({
      where: { organizationId_marketplace_keyword: { organizationId: orgId, marketplace: "amazon", keyword: "batch40 unique term" } },
    });
    assert.ok(row);
    assert.equal(row!.occurrenceCount, 3);
    assert.ok(row!.fingerprint);
  });

  it("7. an unchanged re-observation does not create a duplicate snapshot; a real change does", async () => {
    const row = await prisma.keywordObservation.findUnique({
      where: { organizationId_marketplace_keyword: { organizationId: orgId, marketplace: "amazon", keyword: "batch40 unique term" } },
    });
    const before = await prisma.keywordObservationSnapshot.count({ where: { keywordObservationId: row!.id } });

    await persistKeywordObservations(
      [{ keyword: "batch40 unique term", occurrenceCount: 3, listingFrequencyPercent: 40, observedAveragePrice: 22.5, demandProxyScore: 60, competitionProxy: "MODERATE", intentCategory: "GENERAL" }],
      { organizationId: orgId, marketplace: "amazon" }
    );
    const afterUnchanged = await prisma.keywordObservationSnapshot.count({ where: { keywordObservationId: row!.id } });
    assert.equal(afterUnchanged, before, "an unchanged re-observation must not create a duplicate snapshot");

    await persistKeywordObservations(
      [{ keyword: "batch40 unique term", occurrenceCount: 8, listingFrequencyPercent: 65, observedAveragePrice: 27.0, demandProxyScore: 60, competitionProxy: "HIGH", intentCategory: "GENERAL" }],
      { organizationId: orgId, marketplace: "amazon" }
    );
    const afterChanged = await prisma.keywordObservationSnapshot.count({ where: { keywordObservationId: row!.id } });
    assert.equal(afterChanged, before + 1, "a real occurrence/competition change must create exactly one new snapshot");
  });

  it("8. same pattern holds for CategoryObservationSnapshot", async () => {
    const first = await persistCategoryObservation(
      { categoryName: "batch40 test category", observedCatalogCount: 100, totalListings: 100, priceDistribution: { min: 5, max: 50, median: 20, average: 22 }, opportunityDistribution: { averageScore: 55, highOpportunityCount: 10 }, freshness: { status: "LIVE" } } as any,
      { organizationId: orgId, marketplace: "amazon" }
    );
    assert.equal(first.success, true);
    assert.equal(first.snapshotCreated, true);

    const unchanged = await persistCategoryObservation(
      { categoryName: "batch40 test category", observedCatalogCount: 100, totalListings: 100, priceDistribution: { min: 5, max: 50, median: 20, average: 22 }, opportunityDistribution: { averageScore: 55, highOpportunityCount: 10 }, freshness: { status: "LIVE" } } as any,
      { organizationId: orgId, marketplace: "amazon" }
    );
    assert.equal(unchanged.snapshotCreated, false, "an unchanged category re-observation must not create a duplicate snapshot");

    const changed = await persistCategoryObservation(
      { categoryName: "batch40 test category", observedCatalogCount: 140, totalListings: 140, priceDistribution: { min: 5, max: 50, median: 20, average: 22 }, opportunityDistribution: { averageScore: 55, highOpportunityCount: 10 }, freshness: { status: "LIVE" } } as any,
      { organizationId: orgId, marketplace: "amazon" }
    );
    assert.equal(changed.snapshotCreated, true, "a real catalog-count change must create a new snapshot");
  });

  it("9. Prospect.price/reviewCount/shopAgeMonths/activeListings are never fabricated — write real null, not 0/12/1", async () => {
    const connector = await prisma.connector.create({
      data: { organizationId: orgId, type: "AMAZON", label: "Batch 40 Test Connector", encryptedCredentials: "test", status: "ACTIVE" },
    });
    const searchConfig = await prisma.searchConfig.create({
      data: { organizationId: orgId, connectorId: connector.id, name: "Batch 40 Test Config", keywords: ["batch40 test"], minPrice: 0, maxPrice: 1000 },
    });

    const product: NormalizedProduct = {
      marketplace: "amazon",
      externalId: "batch40_prospect_p1",
      title: "Batch 40 Test Product With No Observed Price Or Shop Stats",
      url: "https://amazon.com/dp/batch40_prospect_p1",
      price: null,
      currency: null,
      rating: null,
      reviewCount: null,
      // No `shop` object at all — shop.ageMonths/activeListings/reviewRatio/reviewVelocity are all genuinely unobserved.
      source: "ACTUAL_DATA",
      acquisitionMethod: "PUBLIC_WEB",
      isHistorical: false,
      capturedAt: new Date(),
    };

    await persistPublicProductObservations([product], {
      organizationId: orgId,
      searchConfigId: searchConfig.id,
      searchQuery: "batch40 test",
      marketplace: "amazon",
    });

    const prospect = await prisma.prospect.findFirst({
      where: { organizationId: orgId, listingExternalId: "batch40_prospect_p1" },
    });
    assert.ok(prospect, "Prospect row must have been created");
    assert.equal(prospect!.price, null, "unobserved price must be null, never a fabricated 0");
    assert.equal(prospect!.reviewCount, null, "unobserved reviewCount must be null, never a fabricated 0");
    assert.equal(prospect!.shopAgeMonths, null, "unobserved shopAgeMonths must be null, never a fabricated 12");
    assert.equal(prospect!.activeListings, null, "unobserved activeListings must be null, never a fabricated 1");
    assert.equal(prospect!.reviewRatio, null, "unobserved reviewRatio must be null, never a fabricated 1.0");
    assert.equal(prospect!.reviewVelocity, null, "unobserved reviewVelocity must be null, never a fabricated 0.1");
  });

  it("10. organization isolation — keyword observations never cross organizations", async () => {
    const otherOrgId = `batch40_other_org_${Date.now()}`;
    await prisma.organization.create({ data: { id: otherOrgId, name: "Batch 40 Other Org" } });
    try {
      const otherRows = await prisma.keywordObservation.findMany({ where: { organizationId: otherOrgId } });
      assert.equal(otherRows.length, 0);
      const ourRows = await prisma.keywordObservation.findMany({ where: { organizationId: orgId } });
      assert.ok(ourRows.length > 0);
      assert.ok(ourRows.every((r) => r.organizationId === orgId));
    } finally {
      await prisma.organization.delete({ where: { id: otherOrgId } });
    }
  });
});
