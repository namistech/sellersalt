import { test } from "node:test";
import assert from "node:assert/strict";
import { auditListingSeo } from "@/services/seo-engine";

test("Phase G: Title Analysis & Character Boundary Diagnostics", async (t) => {
  await t.test("awards maximum points for 120-140 char title with strong opening and delimiters", () => {
    const perfectTitle = "Personalized Leather Passport Holder | Custom Travel Wallet Cover with Engraved Monogram Initials | Luxury Vacation Gift for Him";
    assert.ok(perfectTitle.length >= 120 && perfectTitle.length <= 140);

    const audit = auditListingSeo({
      title: perfectTitle,
      tags: ["passport holder", "travel wallet"],
    });

    assert.equal(audit.titleAnalysis.score, 30);
    assert.equal(audit.titleAnalysis.isOptimalLength, true);
    assert.equal(audit.titleAnalysis.hasHighIntentStart, true);
    assert.equal(audit.titleAnalysis.hasNaturalDelimiters, true);
    assert.equal(audit.titleAnalysis.diagnostics.length, 0);
  });

  await t.test("detects critical error when title exceeds 140 characters", () => {
    const longTitle = "Personalized Leather Passport Holder Cover with Custom Engraved Initials and Names for International Travel Vacation Gifts for Men and Women Travelers Worldwide 2026";
    assert.ok(longTitle.length > 140);

    const audit = auditListingSeo({ title: longTitle });
    const criticalIssue = audit.diagnostics.find((d) => d.code === "TITLE_TOO_LONG");
    assert.ok(criticalIssue);
    assert.equal(criticalIssue.severity, "CRITICAL");
    assert.equal(audit.titleAnalysis.isOptimalLength, false);
  });

  await t.test("detects warning when title is underutilized (< 70 chars)", () => {
    const shortTitle = "Leather Wallet";
    const audit = auditListingSeo({ title: shortTitle });

    const shortIssue = audit.diagnostics.find((d) => d.code === "TITLE_TOO_SHORT");
    assert.ok(shortIssue);
    assert.equal(shortIssue.severity, "HIGH");
  });

  await t.test("handles empty and malformed title input without throwing NaN", () => {
    const audit = auditListingSeo({ title: "" });
    assert.equal(audit.titleAnalysis.characterCount, 0);
    assert.equal(Number.isNaN(audit.titleAnalysis.score), false);
  });
});

test("Phase G: 13-Tag Utilization & Structure Analysis", async (t) => {
  await t.test("awards full 35 points for 13 compliant long-tail unique tags", () => {
    const tags = [
      "leather passport",
      "travel wallet",
      "passport cover",
      "custom passport",
      "engraved wallet",
      "vacation gift",
      "gift for him",
      "luxury passport",
      "leather travel case",
      "monogram wallet",
      "personalized cover",
      "travel accessories",
      "groomsmen gift",
    ];
    assert.equal(tags.length, 13);

    const audit = auditListingSeo({
      title: "Personalized Leather Passport Holder | Custom Travel Wallet Cover with Monogram Initials",
      tags,
    });

    assert.equal(audit.tagAnalysis.score, 35);
    assert.equal(audit.tagAnalysis.isComplete, true);
    assert.equal(audit.tagAnalysis.allCompliantLength, true);
    assert.equal(audit.tagAnalysis.duplicateCount, 0);
    assert.ok(audit.tagAnalysis.longTailTagCount >= 8);
  });

  await t.test("detects over-length tags (> 20 chars)", () => {
    const tags = ["personalized leather passport holder", "travel wallet"]; // First tag is 36 chars
    const audit = auditListingSeo({ title: "Passport Holder", tags });

    const overLengthIssue = audit.diagnostics.find((d) => d.code === "TAG_OVER_LENGTH");
    assert.ok(overLengthIssue);
    assert.equal(overLengthIssue.severity, "CRITICAL");
    assert.equal(audit.tagAnalysis.allCompliantLength, false);
  });

  await t.test("detects unused tag slots (< 13 tags)", () => {
    const tags = ["leather passport", "travel wallet", "custom cover"];
    const audit = auditListingSeo({ title: "Passport Holder", tags });

    const unusedIssue = audit.diagnostics.find((d) => d.code === "UNUSED_TAGS");
    assert.ok(unusedIssue);
    assert.equal(audit.tagAnalysis.isComplete, false);
  });

  await t.test("detects duplicate tags and single-word tags", () => {
    const tags = ["wallet", "passport", "cover", "gift", "travel", "wallet"]; // 5 single words, 1 duplicate
    const audit = auditListingSeo({ title: "Passport Holder", tags });

    assert.ok(audit.diagnostics.some((d) => d.code === "DUPLICATE_TAGS"));
    assert.ok(audit.diagnostics.some((d) => d.code === "SINGLE_WORD_TAGS"));
  });
});

test("Phase G: Keyword Synergy, Description & Taxonomy Analysis", async (t) => {
  await t.test("awards full 15 synergy points for >=3 title-tag phrase matches", () => {
    const title = "Personalized Leather Passport Holder | Custom Travel Wallet | Monogram Vacation Gift";
    const tags = [
      "leather passport",
      "travel wallet",
      "vacation gift",
      "passport cover",
      "custom passport",
    ];

    const audit = auditListingSeo({ title, tags });
    assert.equal(audit.synergyAnalysis.score, 15);
    assert.ok(audit.synergyAnalysis.exactMatchesCount >= 3);
  });

  await t.test("diagnoses weak synergy when no tags appear in title", () => {
    const title = "Handmade Wooden Coffee Table For Living Room";
    const tags = ["leather passport", "travel wallet", "custom cover"];

    const audit = auditListingSeo({ title, tags });
    assert.equal(audit.synergyAnalysis.exactMatchesCount, 0);
    assert.ok(audit.diagnostics.some((d) => d.code === "WEAK_TITLE_TAG_ALIGN"));
  });

  await t.test("evaluates description keyword hook and word count", () => {
    const richDesc = `
      Our personalized leather passport holder is handcrafted from premium full-grain leather.
      Designed for international travelers who demand timeless elegance and durability.

      ### Product Features
      - Full-grain distressed leather
      - Hand-stitched with waxed polyester thread
      - Holds passport, 4 cards, boarding passes, and cash
      - Custom laser engraved monogram initials

      ### Dimensions & Sizing
      Closed: 4.25" x 5.75" inches
      Open: 8.5" x 5.75" inches

      ### Care Instructions
      Treat with organic leather balm once per year.
    `.repeat(3); // Ensure > 150 words

    const audit = auditListingSeo({
      title: "Leather Passport Holder",
      tags: ["leather passport"],
      description: richDesc,
    });

    assert.equal(audit.descriptionAnalysis.score, 10);
    assert.equal(audit.descriptionAnalysis.hasFirst160Keyword, true);
    assert.equal(audit.descriptionAnalysis.hasStructuredHeadings, true);
  });

  await t.test("evaluates deep taxonomy and materials", () => {
    const audit = auditListingSeo({
      title: "Leather Passport Holder",
      taxonomyId: 504,
      materials: ["Full Grain Leather", "Waxed Thread", "Brass Hardware"],
    });

    assert.equal(audit.taxonomyAnalysis.score, 10);
    assert.equal(audit.taxonomyAnalysis.isDeepTaxonomy, true);
    assert.equal(audit.taxonomyAnalysis.materialsCount, 3);
  });
});

test("Phase G: Deterministic Composite 0-100 Score & Grade Rubric", async (t) => {
  await t.test("computes Grade A score (>= 90) for perfectly optimized listing", () => {
    const title = "Personalized Leather Passport Holder | Custom Travel Wallet Cover with Monogram Initials | Luxury Vacation Gift for Him";
    const tags = [
      "leather passport",
      "travel wallet",
      "vacation gift",
      "passport cover",
      "custom passport",
      "engraved wallet",
      "gift for him",
      "luxury passport",
      "leather travel case",
      "monogram wallet",
      "personalized cover",
      "travel accessories",
      "groomsmen gift",
    ];
    const description = "Our personalized leather passport holder is the ultimate travel companion. ".repeat(30);

    const audit = auditListingSeo({
      title,
      tags,
      description,
      taxonomyId: 105,
      materials: ["Full Grain Leather", "Brass Hardware"],
    });

    assert.ok(audit.overallScore >= 90);
    assert.equal(audit.grade, "A");
    assert.equal(Number.isNaN(audit.overallScore), false);
    assert.ok(audit.overallScore <= 100);
  });

  await t.test("computes Grade F score (< 60) for un-optimized stub listing", () => {
    const audit = auditListingSeo({
      title: "Journal",
      tags: ["journal", "paper"],
      description: "A nice book.",
    });

    assert.ok(audit.overallScore < 60);
    assert.equal(audit.grade, "F");
    assert.ok(audit.diagnostics.length >= 3);
    assert.ok(audit.recommendations.length >= 2);
  });

  await t.test("never produces NaN, Infinity, or out-of-bounds score on empty input", () => {
    const audit = auditListingSeo({});
    assert.ok(audit.overallScore >= 0 && audit.overallScore <= 100);
    assert.equal(Number.isNaN(audit.overallScore), false);
    assert.equal(Number.isFinite(audit.overallScore), true);
  });
});
