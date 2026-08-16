import { test } from "node:test";
import assert from "node:assert/strict";
import {
  type EtsyRawTaxonomyNode,
  flattenTaxonomyTree,
  searchTaxonomyNodes,
} from "@/connectors/etsy/taxonomy";
import {
  calculatePercentile,
  computeCategoryBenchmarks,
  computeCategoryStrategicAdvice,
} from "@/services/category-hunting";

test("Phase E: Taxonomy Tree Traversal & Hierarchical Indexing", async (t) => {
  await t.test("recursively flattens nested taxonomy tree with path hierarchies", () => {
    const rawRoots: EtsyRawTaxonomyNode[] = [
      {
        id: 1,
        level: 1,
        name: "Paper & Party Supplies",
        parent_id: null,
        children: [
          {
            id: 10,
            level: 2,
            name: "Paper",
            parent_id: 1,
            children: [
              {
                id: 100,
                level: 3,
                name: "Planners & Refills",
                parent_id: 10,
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: 2,
        level: 1,
        name: "Jewelry",
        parent_id: null,
        children: [],
      },
    ];

    const flattened = flattenTaxonomyTree(rawRoots);
    assert.equal(flattened.size, 4);

    const rootNode = flattened.get(1);
    assert.ok(rootNode);
    assert.equal(rootNode.name, "Paper & Party Supplies");
    assert.equal(rootNode.fullPath, "Paper & Party Supplies");
    assert.deepEqual(rootNode.childIds, [10]);

    const leafNode = flattened.get(100);
    assert.ok(leafNode);
    assert.equal(leafNode.name, "Planners & Refills");
    assert.equal(leafNode.level, 3);
    assert.equal(leafNode.parentId, 10);
    assert.equal(leafNode.fullPath, "Paper & Party Supplies > Paper > Planners & Refills");
    assert.deepEqual(leafNode.childIds, []);
  });

  await t.test("searches taxonomy nodes by name, prefix, and path keyword", () => {
    const rawRoots: EtsyRawTaxonomyNode[] = [
      {
        id: 1,
        level: 1,
        name: "Paper & Party Supplies",
        parent_id: null,
        children: [
          {
            id: 10,
            level: 2,
            name: "Stationery",
            parent_id: 1,
            children: [
              {
                id: 100,
                level: 3,
                name: "Digital Planners",
                parent_id: 10,
                children: [],
              },
            ],
          },
        ],
      },
    ];

    const flattened = flattenTaxonomyTree(rawRoots);
    const searchByName = searchTaxonomyNodes(flattened.values(), "Digital Planners");
    assert.equal(searchByName.length, 1);
    assert.equal(searchByName[0].id, 100);

    const searchByPath = searchTaxonomyNodes(flattened.values(), "Stationery");
    assert.ok(searchByPath.length >= 1);

    const searchEmpty = searchTaxonomyNodes(flattened.values(), "");
    assert.equal(searchEmpty.length, 0);
  });
});

test("Phase E: Category Benchmark Percentiles & Market Metrics", async (t) => {
  await t.test("calculates exact median and 10th/90th percentiles accurately", () => {
    const sorted = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const median = calculatePercentile(sorted, 50);
    assert.equal(median, 55);

    const p10 = calculatePercentile(sorted, 10);
    assert.equal(p10, 19);

    const p90 = calculatePercentile(sorted, 90);
    assert.equal(p90, 91);

    // Single item edge case
    assert.equal(calculatePercentile([25], 50), 25);
    // Empty array edge case
    assert.equal(calculatePercentile([], 50), 0);
  });

  await t.test("computes category benchmarks and classifies low saturation niche", () => {
    const sampleListings = [
      { listing_id: 1, price: { amount: 1500, divisor: 100 } },
      { listing_id: 2, price: { amount: 2500, divisor: 100 } },
      { listing_id: 3, price: { amount: 3500, divisor: 100 } },
    ];

    const shopProfiles = new Map<string, any>([
      ["shop1", { transaction_sold_count: 3000, listing_active_count: 50, review_count: 60, create_date: Math.floor(Date.now() / 1000 - 180 * 24 * 3600) }],
    ]);

    const benchmarks = computeCategoryBenchmarks(sampleListings, shopProfiles);

    assert.equal(benchmarks.observedListingsCount, 3);
    assert.equal(benchmarks.medianPrice, 25);
    assert.equal(benchmarks.priceDistribution.minPrice, 15);
    assert.equal(benchmarks.priceDistribution.maxPrice, 35);
    assert.equal(benchmarks.priceDistribution.priceSpread, 20);
    assert.equal(benchmarks.nicheSaturationIndex, "LOW");
    assert.ok(benchmarks.opportunityScore >= 75);
    assert.equal(benchmarks.verdictBadge, "PRIME OPPORTUNITY");
  });

  await t.test("identifies HIGH_SATURATION and heavy incumbent barriers", () => {
    const sampleListings = [
      { listing_id: 1, price: { amount: 1000, divisor: 100 } },
      { listing_id: 2, price: { amount: 1200, divisor: 100 } },
    ];

    const shopProfiles = new Map<string, any>([
      ["shop1", { transaction_sold_count: 50000, listing_active_count: 800, review_count: 2500, create_date: Math.floor(Date.now() / 1000 - 1800 * 24 * 3600) }],
    ]);

    const benchmarks = computeCategoryBenchmarks(sampleListings, shopProfiles);

    assert.equal(benchmarks.nicheSaturationIndex, "SATURATED");
    assert.equal(benchmarks.verdictBadge, "HIGH SATURATION");
    assert.ok(benchmarks.reviewSaturationAverage >= 2000);
  });
});

test("Phase E: Category Strategic Action Guidance", async (t) => {
  await t.test("generates actionable guidance based on opportunity score and saturation", () => {
    const primeBenchmarks = {
      observedListingsCount: 30,
      medianPrice: 24.5,
      price10thPercentile: 15,
      price90thPercentile: 45,
      priceDistribution: { medianPrice: 24.5, minPrice: 10, maxPrice: 60, price10thPercentile: 15, price90thPercentile: 45, priceSpread: 50 },
      avgDailySalesProxy: 7.2,
      catalogYieldProxy: 32.5,
      reviewSaturationAverage: 80,
      nicheSaturationIndex: "LOW" as const,
      opportunityScore: 88,
      verdictBadge: "PRIME OPPORTUNITY" as const,
      verdictColor: "text-green-700 bg-green-50",
      verdictSummary: "Prime",
    };

    const advice = computeCategoryStrategicAdvice(primeBenchmarks, "Digital Planners");
    assert.ok(advice.whyInteresting.includes("Exceptional velocity"));
    assert.ok(advice.whatToStudy.includes("Digital Planners"));
    assert.ok(advice.whatToDoNext.includes("export to Planner"));
  });
});
