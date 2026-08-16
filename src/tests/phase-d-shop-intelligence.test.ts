/**
 * Phase D Shop Research & Competitor Intelligence Verification Tests
 * 
 * Tests:
 * 1. Long-Tail Tag Frequency Extraction & Deterministic Normalization
 * 2. Catalog Yield & Price Spread Calculator
 * 3. Strategic Shop Verdict & Opportunity Classification Rubric
 * 4. Empty Catalog & Edge Case Error Handling
 * 5. Data Provenance Categorization
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractLongTailTagFrequencies,
  computeCatalogYield,
  computeStrategicShopVerdict,
} from "../services/shop-intelligence";

describe("Phase D: Long-Tail Tag Frequency Analysis", () => {
  it("normalizes and aggregates tags across listing samples with word counts", () => {
    const mockListings = [
      {
        title: "Digital Budget Planner | Monthly Budget Template | Goodnotes PDF",
        tags: ["budget planner", "monthly budget", "ipad template", "financial tracker"],
      },
      {
        title: "ADHD Daily Planner - iPad Goodnotes Template / Digital Organizer",
        tags: ["adhd planner", "ipad template", "daily planner", "digital organizer"],
      },
      {
        title: "Small Business Bookkeeping Spreadsheet | Excel Template | Budget Planner",
        tags: ["budget planner", "bookkeeping template", "small business sheet"],
      },
    ];

    const result = extractLongTailTagFrequencies(mockListings, 10);

    assert.ok(result.length > 0);

    // "budget planner" appears in listing 1 (tags & title) and listing 3 (tags & title) -> count = 2 distinct listings
    const budgetTag = result.find((r) => r.tag.toLowerCase() === "budget planner");
    assert.ok(budgetTag, "budget planner should be found");
    assert.equal(budgetTag.count, 2);
    assert.equal(budgetTag.percentage, 67); // 2/3 listings
    assert.equal(budgetTag.isLongTail, true);
    assert.equal(budgetTag.wordCount, 2);

    // "ipad template" appears in listing 1 and listing 2 -> count = 2
    const ipadTag = result.find((r) => r.tag.toLowerCase() === "ipad template");
    assert.ok(ipadTag, "ipad template should be found");
    assert.equal(ipadTag.count, 2);
  });

  it("handles empty listing array gracefully", () => {
    const emptyResult = extractLongTailTagFrequencies([]);
    assert.deepEqual(emptyResult, []);
  });
});

describe("Phase D: Catalog Yield & Price Spread Analysis", () => {
  it("calculates median price, spread, and catalog efficiency correctly", () => {
    const listings = [
      { price: 10.0, category: "Digital > Planners" },
      { price: 15.0, category: "Digital > Planners" },
      { price: 20.0, category: "Digital > Spreadsheets" },
      { price: 25.0, category: "Digital > SVG" },
      { price: 50.0, category: "Digital > Bundles" },
    ];

    const yieldData = computeCatalogYield(listings, 3500, 50);

    assert.equal(yieldData.minPrice, 10.0);
    assert.equal(yieldData.maxPrice, 50.0);
    assert.equal(yieldData.medianPrice, 20.0);
    assert.equal(yieldData.priceSpread, 40.0);

    // Yield ratio = 3500 / 50 = 70 sales/listing -> HIGH_YIELD
    assert.equal(yieldData.catalogEfficiency, "HIGH_YIELD");

    // Category breakdown
    assert.ok(yieldData.topCategories.length >= 1);
    assert.equal(yieldData.topCategories[0].category, "Digital");
  });

  it("identifies LOW_YIELD for diluted giant catalogs", () => {
    const listings = [{ price: 12.0 }, { price: 14.0 }];
    const yieldData = computeCatalogYield(listings, 200, 500); // 200 / 500 = 0.4 sales/listing
    assert.equal(yieldData.catalogEfficiency, "LOW_YIELD");
  });
});

describe("Phase D: Strategic Shop Verdict & Opportunity Classification", () => {
  it("generates breakout emerging winner verdict for high opportunity scores", () => {
    const verdict = computeStrategicShopVerdict({
      opportunityScore: 84,
      totalSales: 4200,
      activeListings: 48,
      estDailySales: 12.5,
      shopAgeMonths: 11,
      reviewCount: 380,
      avgObservedPrice: 22.0,
    });

    assert.equal(verdict.opportunityScore, 84);
    assert.equal(verdict.verdictBadge, "EASY TO START");
    assert.equal(verdict.verdictLabel, "Breakout Emerging Winner");
    assert.ok(verdict.whyInteresting.length > 0);
    assert.ok(verdict.whatToStudy.length > 0);
    assert.ok(verdict.whatToAvoid.length > 0);
    assert.ok(verdict.whatToDoNext.length > 0);
  });

  it("generates high barrier verdict for saturated legacy shops", () => {
    const verdict = computeStrategicShopVerdict({
      opportunityScore: 35,
      totalSales: 85000,
      activeListings: 1200,
      estDailySales: 22.0,
      shopAgeMonths: 84,
      reviewCount: 15400,
      avgObservedPrice: 14.0,
    });

    assert.equal(verdict.opportunityScore, 35);
    assert.equal(verdict.verdictBadge, "HIGH BARRIER");
    assert.equal(verdict.verdictLabel, "Established Legacy Authority");
    assert.ok(verdict.whatToAvoid.includes("broad head-to-head"));
  });
});
