import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTerm,
  calculateTokenOverlap,
  classifyIntent,
  computeKeywordCompetition,
  harvestTagsAndNgrams,
} from "@/services/keyword-research";

test("Phase F: Keyword Term Normalization & Relevance Scoring", async (t) => {
  await t.test("normalizes raw query terms cleanly", () => {
    assert.equal(normalizeTerm("  Leather  Passport   Holder!! "), "leather passport holder");
    assert.equal(normalizeTerm("Digital-Planner & Stickers"), "digital-planner stickers");
    assert.equal(normalizeTerm(""), "");
  });

  await t.test("calculates semantic token overlap score accurately", () => {
    const exact = calculateTokenOverlap("leather passport holder", "leather passport holder");
    assert.equal(exact, 100);

    const partial = calculateTokenOverlap("leather passport holder", "custom leather passport cover");
    assert.ok(partial >= 40);

    const subset = calculateTokenOverlap("passport holder", "luxury leather passport holder for travel");
    assert.ok(subset >= 50);

    const none = calculateTokenOverlap("leather passport holder", "wooden coffee mug");
    assert.equal(none, 0);
  });
});

test("Phase F: Tag & Title N-Gram Harvesting Pipeline", async (t) => {
  await t.test("harvests tags and extracts 2-word, 3-word, and 4-word title n-grams", () => {
    const sampleListings = [
      {
        listing_id: 101,
        title: "Personalized Leather Passport Holder Cover with Custom Engraving",
        tags: ["leather passport holder", "travel wallet", "custom passport cover", "gift for him"],
        num_favorers: 120,
      },
      {
        listing_id: 102,
        title: "Slim Leather Travel Wallet and Passport Case",
        tags: ["leather passport holder", "travel wallet", "minimalist wallet"],
        num_favorers: 80,
      },
    ];

    const harvested = harvestTagsAndNgrams(sampleListings, "leather passport holder");
    assert.ok(harvested.length > 0);

    const topTag = harvested.find((h) => h.term === "leather passport holder");
    assert.ok(topTag);
    assert.equal(topTag.frequency, 2);
    assert.equal(topTag.percentage, 100);
    assert.equal(topTag.wordCount, 3);
    assert.equal(topTag.tailClassification, "LONG_TAIL");
    assert.equal(topTag.isTagCompliant, false); // "leather passport holder" is 23 chars (>20)
    assert.equal(topTag.relevanceScore, 100);
    assert.equal(topTag.estimatedDemandSignal, 100); // (120+80)/2

    const compliantTag = harvested.find((h) => h.term === "travel wallet");
    assert.ok(compliantTag);
    assert.equal(compliantTag.isTagCompliant, true); // 13 chars (<= 20)
    assert.equal(compliantTag.tailClassification, "MID_TAIL");
    assert.equal(compliantTag.wordCount, 2);

    // Verify title n-gram extraction
    const titleNgram = harvested.find((h) => h.provenance === "TITLE_NGRAM");
    assert.ok(titleNgram);
  });

  await t.test("handles empty listings array gracefully", () => {
    const emptyResult = harvestTagsAndNgrams([], "planner");
    assert.deepEqual(emptyResult, []);
  });
});

test("Phase F: Intent Classification & Competition Rating", async (t) => {
  await t.test("correctly categorizes keyword search intent", () => {
    assert.equal(classifyIntent("groomsmen gift for him"), "RECIPIENT_OCCASION");
    assert.equal(classifyIntent("rustic wooden desk organizer"), "MATERIAL_STYLE");
    assert.equal(classifyIntent("digital budget planner template"), "PRODUCT_TYPE");
    assert.equal(classifyIntent("daily inspiration"), "GENERAL");
  });

  await t.test("calculates deterministic competition score within bounds", () => {
    const highComp = computeKeywordCompetition(50, 50, 200);
    assert.ok(highComp.score >= 70);
    assert.ok(["HIGH", "VERY_HIGH"].includes(highComp.level));

    const lowComp = computeKeywordCompetition(1, 50, 5);
    assert.ok(lowComp.score <= 30);
    assert.ok(["VERY_LOW", "LOW"].includes(lowComp.level));
  });
});
