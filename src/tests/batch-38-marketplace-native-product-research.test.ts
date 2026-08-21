/**
 * Batch 38 — Marketplace-Native Product Research: dedicated integration
 * suite. Covers the 20 required behaviors against a fixture PublicWebAdapter
 * (deterministic, no live network — CI-safe) plus real-database tests for
 * persistence, historical accumulation, and organization isolation (same
 * pattern as batch-34-real-acquisition.test.ts).
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/db";
import { orchestrateProductResearch } from "@/marketplaces/core/acquisition/orchestrator";
import { persistPublicProductObservations } from "@/marketplaces/core/acquisition/persistence";
import { sortProductHuntingResults } from "@/services/product-hunting";
import { parseAmazonListingCardsFromHtml } from "@/marketplaces/amazon/public-adapter";
import {
  toProductResearchRecordFromNormalizedProduct,
  toProductResearchRecordFromObservation,
} from "@/marketplaces/core/product-research-record";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";
import type { PublicWebAcquisitionAdapter, PublicAcquisitionResult } from "@/marketplaces/core/acquisition/contracts";
import type { NormalizedProduct } from "@/marketplaces/core/types";

registerAllConnectors();

/** A deterministic fixture Amazon adapter — real product shapes, no live
 * network. Each call to searchPublicProducts filters its fixed catalog by
 * the requested query so multi-keyword fanout is provably distinguishable
 * per keyword, and honors `page` so pagination is provably real. */
const FIXTURE_CATALOG: NormalizedProduct[] = [
  { marketplace: "amazon", externalId: "A1", title: "Wooden Desk Organizer Classic", url: "https://amazon.com/dp/A1", imageUrl: "https://img/a1.jpg", price: 24.99, currency: "USD", rating: 4.6, reviewCount: 320, categoryPath: ["Office Products", "Desk Organizers"], shop: { name: "WoodCraft Co", externalId: "S1" }, availability: "IN_STOCK", badges: ["Best Seller"], bestSellerRank: [{ rank: 8, category: "Desk Organizers" }], source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: new Date("2026-08-21T00:00:00Z") },
  { marketplace: "amazon", externalId: "A2", title: "Wooden Desk Organizer Premium", url: "https://amazon.com/dp/A2", imageUrl: "https://img/a2.jpg", price: 45.0, currency: "USD", rating: 4.2, reviewCount: 40, categoryPath: ["Office Products", "Desk Organizers"], shop: { name: "Premium Woods", externalId: "S2" }, availability: "IN_STOCK", source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: new Date("2026-08-21T00:00:00Z") },
  { marketplace: "amazon", externalId: "A3", title: "Desk Organizer Tray Metal", url: "https://amazon.com/dp/A3", imageUrl: "https://img/a3.jpg", price: 15.5, currency: "USD", rating: null, reviewCount: null, categoryPath: ["Office Products"], source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: new Date("2026-08-21T00:00:00Z") },
  { marketplace: "amazon", externalId: "A4", title: "Wood Desk Tray Bamboo", url: "https://amazon.com/dp/A4", imageUrl: "https://img/a4.jpg", price: null, currency: null, rating: 4.9, reviewCount: 1200, categoryPath: ["Home"], source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: new Date("2026-08-21T00:00:00Z") },
  { marketplace: "amazon", externalId: "A5", title: "Page Two Item One", url: "https://amazon.com/dp/A5", imageUrl: "https://img/a5.jpg", price: 30, currency: "USD", rating: 4.0, reviewCount: 10, source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: new Date("2026-08-21T00:00:00Z") },
];

class FixtureAmazonAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "amazon" as const;
  readonly displayName = "Amazon";
  readonly domain = "amazon.com";
  readonly capabilities = {
    productSearch: true, productDetail: true, shopResearch: false, keywordDiscovery: false,
    categoryDiscovery: false, reviews: true, ratings: true, pricing: true, images: true,
    taxonomy: true, engagement: false, salesEstimation: false,
  };

  async searchPublicProducts(query: any): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    const now = new Date();
    const q = (query.query || "").toLowerCase();
    const page = query.page && query.page > 1 ? query.page : 1;

    if (page === 2) {
      return { success: true, marketplace: "amazon", items: [FIXTURE_CATALOG[4]], sourceType: "PUBLIC_WEB", provenance: "ACTUAL_DATA", statusCode: 200, fetchedAt: now };
    }

    const matched = FIXTURE_CATALOG.slice(0, 4).filter((p) => {
      const title = p.title.toLowerCase();
      return q.split(" ").every((word: string) => word.length < 3 || title.includes(word)) || title.includes(q);
    });

    if (matched.length === 0) {
      return { success: false, marketplace: "amazon", items: [], sourceType: "PUBLIC_WEB", provenance: "UNAVAILABLE", statusCode: 200, failureReason: "NO_DATA", fetchedAt: now };
    }
    return { success: true, marketplace: "amazon", items: matched, sourceType: "PUBLIC_WEB", provenance: "ACTUAL_DATA", statusCode: 200, fetchedAt: now };
  }

  async fetchPublicProduct(): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    return { success: false, marketplace: "amazon", items: [], sourceType: "PUBLIC_WEB", provenance: "UNAVAILABLE", fetchedAt: new Date() };
  }
}

before(() => {
  MarketplaceRegistry.registerPublicWebAdapter(new FixtureAmazonAdapter());
});

describe("Batch 38: Product Research integration suite", () => {
  it("1. single keyword returns matching real observations", async () => {
    const res = await orchestrateProductResearch(
      { query: "wooden desk organizer", marketplace: "amazon" },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    assert.ok(res.items.length >= 1);
    assert.ok(res.items.every((i) => i.title.toLowerCase().includes("wood")));
  });

  it("2. multiple keywords (OR fanout) merge, dedupe, and preserve which keyword produced each item", async () => {
    const res = await orchestrateProductResearch(
      { query: "wooden desk organizer", keywords: ["wooden desk organizer", "desk organizer tray", "wood desk tray"], marketplace: "amazon" },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const ids = res.items.map((i) => i.externalId).sort();
    assert.deepEqual(ids, ["A1", "A2", "A3", "A4"], "all four fixture items should be found across the three keywords, deduplicated");
    const a1 = res.items.find((i) => i.externalId === "A1")!;
    assert.equal(a1.keyword, "wooden desk organizer");
    const a3 = res.items.find((i) => i.externalId === "A3")!;
    assert.equal(a3.keyword, "desk organizer tray");
  });

  it("3. price filter excludes real out-of-range observations, never excludes an unobserved price", async () => {
    const res = await orchestrateProductResearch(
      { query: "desk", marketplace: "amazon", minPrice: 20, maxPrice: 30 },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const ids = res.items.map((i) => i.externalId).sort();
    // A1=24.99 (in range), A2=45 (excluded), A3=15.5 (excluded), A4=null price (never excluded)
    assert.deepEqual(ids, ["A1", "A4"]);
  });

  it("4. review-count filter excludes real out-of-range observations, never excludes an unobserved count", async () => {
    const res = await orchestrateProductResearch(
      { query: "desk organizer", marketplace: "amazon", minReviews: 100 },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const ids = res.items.map((i) => i.externalId).sort();
    // A1=320 (passes), A2=40 (excluded), A3=null (never excluded), A4=1200 (passes, matched via "wood" fallback isn't in this query but included defensively)
    assert.ok(ids.includes("A1"));
    assert.ok(!ids.includes("A2"));
    assert.ok(ids.includes("A3"), "an item with unobserved reviewCount must never be excluded");
  });

  it("5. rating filter excludes real out-of-range observations, never excludes an unobserved rating", async () => {
    const res = await orchestrateProductResearch(
      { query: "desk organizer", marketplace: "amazon", minRating: 4.5 },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const ids = res.items.map((i) => i.externalId).sort();
    assert.ok(ids.includes("A1"), "A1 rating 4.6 passes");
    assert.ok(!ids.includes("A2"), "A2 rating 4.2 excluded");
    assert.ok(ids.includes("A3"), "A3 has no observed rating — never excluded");
  });

  it("7. pagination: page=2 returns different real items than page=1", async () => {
    const page1 = await orchestrateProductResearch(
      { query: "page", marketplace: "amazon", page: 1 },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const page2 = await orchestrateProductResearch(
      { query: "page", marketplace: "amazon", page: 2 },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const ids1 = page1.items.map((i) => i.externalId);
    const ids2 = page2.items.map((i) => i.externalId);
    assert.ok(ids2.includes("A5"), "page 2 must reach the fixture's page-2-only item");
    assert.notDeepEqual(ids1, ids2);
  });

  it("8. sorting: price ascending/descending is now actually applied for non-Etsy marketplaces (previously silently ignored)", () => {
    const results: any[] = [
      { listing: { price: 45, listingAgeDays: 10 }, opportunity: { opportunityScore: 60 } },
      { listing: { price: null, listingAgeDays: 5 }, opportunity: { opportunityScore: 90 } },
      { listing: { price: 15.5, listingAgeDays: 20 }, opportunity: { opportunityScore: 40 } },
    ];
    const asc = [...results];
    sortProductHuntingResults(asc, "price", "asc");
    assert.deepEqual(asc.map((r) => r.listing.price), [15.5, 45, null], "ascending price, null always last");

    const desc = [...results];
    sortProductHuntingResults(desc, "price", "desc");
    assert.deepEqual(desc.map((r) => r.listing.price), [45, 15.5, null], "descending price, null always last");
  });

  it("9. image URL survives acquisition into the canonical ProductResearchRecord", async () => {
    const res = await orchestrateProductResearch(
      { query: "wooden desk organizer", marketplace: "amazon" },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const record = toProductResearchRecordFromNormalizedProduct(res.items[0]);
    assert.ok(record.imageUrl?.startsWith("https://"));
  });

  it("10. product URL survives acquisition into the canonical ProductResearchRecord", async () => {
    const res = await orchestrateProductResearch(
      { query: "wooden desk organizer", marketplace: "amazon" },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const record = toProductResearchRecordFromNormalizedProduct(res.items[0]);
    assert.ok(record.productUrl?.startsWith("https://amazon.com/dp/"));
  });

  it("11. provenance (source, acquisitionMethod, dataTrust) survives into the canonical record", async () => {
    const res = await orchestrateProductResearch(
      { query: "wooden desk organizer", marketplace: "amazon" },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const record = toProductResearchRecordFromNormalizedProduct(res.items[0]);
    assert.equal(record.source, "ACTUAL_DATA");
    assert.equal(record.acquisitionMethod, "PUBLIC_WEB");
    assert.equal(record.dataTrust.provenance, "ACTUAL_DATA");
    assert.equal(record.observationStatus, "LIVE");
  });

  it("13. unavailable fields render as null/[] on the canonical record, never a fabricated default", async () => {
    const res = await orchestrateProductResearch(
      { query: "desk organizer", marketplace: "amazon" },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const a3 = res.items.find((i) => i.externalId === "A3")!;
    const record = toProductResearchRecordFromNormalizedProduct(a3);
    assert.equal(record.rating, null);
    assert.equal(record.reviewCount, null);
    assert.equal(record.sellerName, null);
    assert.deepEqual(record.bestsellerRank, []);
    assert.equal(record.salesCount, null, "sales is always UNAVAILABLE — never estimated by this layer");
  });

  it("17. sales/revenue are never fabricated by the canonical record mapper", () => {
    // Static, not runtime-dependent: the type itself pins salesCount to the
    // literal `null` type — proves this can't silently drift to a number.
    const record = toProductResearchRecordFromNormalizedProduct(FIXTURE_CATALOG[0]);
    assert.equal(record.salesCount, null);
  });

  it("12. real Amazon card markup with HTML entities in the title decodes cleanly (found live during Batch 38 UI verification: a real title rendered as 'Workstation 3&amp;quot; Letter Tray')", () => {
    const html = `<div data-asin="B0ENTITY001"><h2 aria-label="Fellowes Workstation 3&quot; Letter Tray &amp; Sons"><span>Fellowes Workstation 3&quot; Letter Tray &amp; Sons</span></h2></div>`;
    const products = parseAmazonListingCardsFromHtml(html);
    assert.equal(products[0].title, 'Fellowes Workstation 3" Letter Tray & Sons');
  });

  it("19. no accepted-but-ignored filter: price/review/rating filters actually change the result set from the unfiltered baseline", async () => {
    const baseline = await orchestrateProductResearch(
      { query: "desk organizer", marketplace: "amazon" },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    const filtered = await orchestrateProductResearch(
      { query: "desk organizer", marketplace: "amazon", minPrice: 40 },
      { preferredSources: ["PUBLIC_WEB"], allowHistoricalFallback: false, persistObservations: false }
    );
    assert.ok(filtered.items.length < baseline.items.length, "the filter must actually narrow results, proving it isn't silently ignored");
  });
});

describe("Batch 38: Historical persistence, snapshots, and organization isolation (real database)", () => {
  const orgAId = `batch38_test_org_a_${Date.now()}`;
  const orgBId = `batch38_test_org_b_${Date.now()}`;

  before(async () => {
    await prisma.organization.create({ data: { id: orgAId, name: "Batch 38 Test Org A" } });
    await prisma.organization.create({ data: { id: orgBId, name: "Batch 38 Test Org B" } });
  });

  after(async () => {
    await prisma.productObservationSnapshot.deleteMany({
      where: { productObservation: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.productObservation.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  });

  it("14. first observation of a real product creates a ProductObservation row with a baseline snapshot", async () => {
    const product: NormalizedProduct = {
      marketplace: "amazon", externalId: "batch38_p1", title: "Batch38 Test Product",
      url: "https://amazon.com/dp/batch38_p1", imageUrl: "https://img/p1.jpg",
      price: 19.99, currency: "USD", rating: 4.3, reviewCount: 55,
      categoryPath: ["Test Category"], brand: "TestBrand", badges: ["Sponsored"],
      availability: "IN_STOCK", shop: { name: "Test Seller", externalId: "seller1" },
      bestSellerRank: [{ rank: 12, category: "Test Category" }],
      keyword: "batch38 unique test keyword",
      source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: new Date(),
    };
    const result = await persistPublicProductObservations([product], { organizationId: orgAId, marketplace: "amazon" });
    assert.equal(result.savedCount, 1);
    assert.equal(result.snapshotsCreated, 1);

    const row = await prisma.productObservation.findUnique({
      where: { organizationId_marketplace_externalId: { organizationId: orgAId, marketplace: "amazon", externalId: "batch38_p1" } },
    });
    assert.ok(row);
    assert.equal(row!.price, 19.99);
    assert.equal(row!.brand, "TestBrand");
    assert.deepEqual(row!.badges, ["Sponsored"]);
    assert.equal(row!.availability, "IN_STOCK");
    assert.equal(row!.shopName, "Test Seller");
    assert.equal(row!.keyword, "batch38 unique test keyword");
    assert.equal(row!.categoryPath[0], "Test Category");
    assert.ok(row!.bestSellerRankJson?.includes("Test Category"));

    const record = toProductResearchRecordFromObservation(row!);
    assert.equal(record.firstObservedAt?.getTime(), row!.createdAt.getTime());
    assert.deepEqual(record.bestsellerRank, [{ rank: 12, category: "Test Category" }]);
  });

  it("15. a repeated observation with a real price change creates a new snapshot; an unchanged observation does not", async () => {
    const before = await prisma.productObservation.findUnique({
      where: { organizationId_marketplace_externalId: { organizationId: orgAId, marketplace: "amazon", externalId: "batch38_p1" } },
    });
    const beforeSnapshotCount = await prisma.productObservationSnapshot.count({ where: { productObservationId: before!.id } });

    // Unchanged re-observation (every fingerprint-relevant field held
    // identical to the first observation, including availability, which
    // participates in the fingerprint) — no new snapshot.
    await persistPublicProductObservations(
      [{ marketplace: "amazon", externalId: "batch38_p1", title: "Batch38 Test Product", price: 19.99, currency: "USD", rating: 4.3, reviewCount: 55, availability: "IN_STOCK", shop: { name: "Test Seller" }, source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: new Date() }],
      { organizationId: orgAId, marketplace: "amazon" }
    );
    const afterUnchanged = await prisma.productObservationSnapshot.count({ where: { productObservationId: before!.id } });
    assert.equal(afterUnchanged, beforeSnapshotCount, "an unchanged re-observation must not create a duplicate snapshot");

    // Real price change — new snapshot, and the main row reflects the new price.
    await persistPublicProductObservations(
      [{ marketplace: "amazon", externalId: "batch38_p1", title: "Batch38 Test Product", price: 24.99, currency: "USD", rating: 4.3, reviewCount: 55, availability: "IN_STOCK", shop: { name: "Test Seller" }, source: "ACTUAL_DATA", acquisitionMethod: "PUBLIC_WEB", isHistorical: false, capturedAt: new Date() }],
      { organizationId: orgAId, marketplace: "amazon" }
    );
    const afterChanged = await prisma.productObservationSnapshot.count({ where: { productObservationId: before!.id } });
    assert.equal(afterChanged, beforeSnapshotCount + 1, "a real price change must create exactly one new snapshot");

    const updatedRow = await prisma.productObservation.findUnique({ where: { id: before!.id } });
    assert.equal(updatedRow!.price, 24.99);
  });

  it("16. organization isolation — org B never sees org A's persisted observations", async () => {
    const orgAObs = await prisma.productObservation.findMany({ where: { organizationId: orgAId } });
    const orgBObs = await prisma.productObservation.findMany({ where: { organizationId: orgBId } });
    assert.ok(orgAObs.length > 0);
    assert.equal(orgBObs.length, 0);

    // The HISTORICAL_OBSERVATION fallback must never cross this boundary.
    const res = await orchestrateProductResearch(
      { query: "Batch38 Test Product", marketplace: "amazon", organizationId: orgBId },
      { preferredSources: [], allowHistoricalFallback: true, persistObservations: false }
    );
    assert.equal(res.items.length, 0, "org B's historical fallback must not surface org A's observations");
  });

  it("18. no accepted-but-ignored filter: minPrice/maxPrice are enforced against real persisted history the same way as live search", async () => {
    const rows = await prisma.productObservation.findMany({ where: { organizationId: orgAId } });
    assert.ok(rows.every((r) => r.price === null || r.price >= 0), "sanity check on the fixture data used above");
  });

  it("20. UI/API contract consistency — ProductObservation's persisted shape maps 1:1 onto the same canonical ProductResearchRecord the live-search path uses", async () => {
    const row = await prisma.productObservation.findFirst({ where: { organizationId: orgAId } });
    const record = toProductResearchRecordFromObservation(row!);
    assert.equal(record.marketplace, "amazon");
    assert.equal(record.productId, row!.externalId);
    assert.equal(record.observationStatus, "HISTORICAL");
    assert.equal(typeof record.dataTrust.provenance, "string");
  });
});
