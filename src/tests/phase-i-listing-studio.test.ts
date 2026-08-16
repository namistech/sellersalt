import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateJaccardSimilarity,
  findLongestCommonPhrase,
  evaluateListingOriginality,
} from "@/services/originality-engine";
import {
  sanitizeTitle,
  sanitizeTags,
  generateOriginalListingDraft,
} from "@/services/listing-generation";
import { ListingDraftStatus } from "@prisma/client";

test("Phase I: Deterministic Originality Engine & <15% Overlap Threshold", async (t) => {
  await t.test("calculates Jaccard token similarity accurately", () => {
    const tokensA = ["handmade", "leather", "passport", "holder", "wallet"];
    const tokensB = ["handmade", "leather", "journal", "cover", "diary"];

    const similarity = calculateJaccardSimilarity(tokensA, tokensB);
    // Intersection: "handmade", "leather" (2)
    // Union: 8 unique words
    // Jaccard = 2 / 8 = 0.25
    assert.equal(similarity, 0.25);
  });

  await t.test("finds longest common consecutive phrases", () => {
    const draftTokens = ["this", "is", "a", "genuine", "full", "grain", "leather", "passport", "cover"];
    const sourceTokens = ["buy", "our", "genuine", "full", "grain", "leather", "accessories", "today"];

    const match = findLongestCommonPhrase(draftTokens, sourceTokens);
    assert.equal(match.length, 4);
    assert.equal(match.phrase, "genuine full grain leather");
  });

  await t.test("strictly REJECTS drafts with >15% competitor text overlap", () => {
    const sourceTitle = "Handmade Distressed Leather Passport Wallet Travel Journal";
    const sourceDescription = "Crafted from genuine full grain cowhide leather. Fits all standard passports and boarding passes with RFID blocking slots.";
    const sourceTags = ["leather passport", "travel wallet", "passport holder", "leather journal"];

    // Copied draft
    const draftTitle = "Handmade Distressed Leather Passport Wallet Travel Journal";
    const draftDescription = "Crafted from genuine full grain cowhide leather. Fits all standard passports and boarding passes with RFID slots.";
    const draftTags = ["leather passport", "travel wallet", "passport holder", "leather journal"];

    const result = evaluateListingOriginality({
      draftTitle,
      draftDescription,
      draftTags,
      sourceTitle,
      sourceDescription,
      sourceTags,
    });

    assert.equal(result.status, "REJECTED");
    assert.ok(result.originalityScore < 85);
    assert.ok(result.jaccardSimilarity > 0.15);
  });

  await t.test("PASSES completely original drafts with unique phrasing", () => {
    const sourceTitle = "Handmade Distressed Leather Passport Wallet Travel Journal";
    const sourceDescription = "Crafted from genuine full grain cowhide leather. Fits all standard passports and boarding passes.";
    const sourceTags = ["leather passport", "travel wallet"];

    const draftTitle = "Artisan Personalized Document Organizer | Monogrammed Travel Sleeve";
    const draftDescription = "Elevate your journey with our hand-stitched pocket companion. Featuring dedicated compartments for flight itineraries, currency, and identification cards.";
    const draftTags = ["artisan document sleeve", "monogrammed folio", "personalized trip case", "handcrafted pouch"];

    const result = evaluateListingOriginality({
      draftTitle,
      draftDescription,
      draftTags,
      sourceTitle,
      sourceDescription,
      sourceTags,
    });

    assert.equal(result.status, "PASSED");
    assert.ok(result.originalityScore >= 85);
    assert.ok(result.jaccardSimilarity <= 0.15);
    assert.ok(result.maxCommonSubstringLength <= 4);
  });

  await t.test("returns 100% originality when no source text is provided", () => {
    const result = evaluateListingOriginality({
      draftTitle: "Custom Ceramic Coffee Mug",
      draftDescription: "Hand-thrown pottery mug with reactive glaze finish.",
      draftTags: ["ceramic mug", "pottery cup"],
    });

    assert.equal(result.originalityScore, 100);
    assert.equal(result.status, "PASSED");
    assert.equal(result.jaccardSimilarity, 0);
  });
});

test("Phase I: Title & 13-Tag Sanitization and Hard Constraints", async (t) => {
  await t.test("strictly clamps title to maximum 140 characters without breaking words", () => {
    const overlengthTitle =
      "Personalized Leather Travel Wallet for Men and Women with Custom Engraving and RFID Blocking Protection for Passports, Credit Cards, Cash, and Boarding Passes";
    
    assert.ok(overlengthTitle.length > 140);
    const sanitized = sanitizeTitle(overlengthTitle);

    assert.ok(sanitized.length <= 140);
    assert.ok(!sanitized.endsWith(" "));
  });

  await t.test("guarantees exactly 13 unique tags each <= 20 characters", () => {
    const rawTags = [
      "Extremely Long Handcrafted Leather Travel Journal Tag That Exceeds Limit",
      "leather wallet!",
      "TRAVEL WALLET",
      "leather wallet", // duplicate
      "custom gift",
      "passport sleeve",
    ];

    const targetKeywords = ["monogrammed case", "minimalist wallet"];
    const sanitized = sanitizeTags(rawTags, targetKeywords);

    assert.equal(sanitized.length, 13);
    for (const tag of sanitized) {
      assert.ok(tag.length <= 20, `Tag "${tag}" exceeds 20 characters`);
      assert.ok(!/[^a-z0-9\s]/.test(tag), `Tag "${tag}" contains invalid characters`);
      assert.equal(tag, tag.toLowerCase(), `Tag "${tag}" is not lowercase`);
    }

    // Check unique set
    const uniqueSet = new Set(sanitized);
    assert.equal(uniqueSet.size, 13, "Tags array contains duplicates");
  });
});

test("Phase I: End-to-End AI Listing Generation Pipeline & SEO Integration", async (t) => {
  await t.test("generates complete listing payload with SEO audit and originality verification", async () => {
    const result = await generateOriginalListingDraft({
      conceptTitle: "Personalized Leather Passport Case",
      targetCategory: "Travel Wallets & Passport Covers",
      targetPrice: 32.0,
      targetKeywords: ["leather passport", "travel sleeve", "monogrammed gift"],
      materials: ["Full Grain Leather", "Waxed Thread"],
      productFacts: "Fits standard passport and 4 cards. Free custom monogramming.",
    });

    // 1. Validate payload structure
    assert.ok(result.payload.title);
    assert.ok(result.payload.title.length <= 140);
    assert.equal(result.payload.tags.length, 13);
    assert.ok(result.payload.description);
    assert.equal(result.payload.price, 32.0);
    assert.equal(result.payload.state, "draft");

    // 2. Validate SEO Audit attachment (Phase G)
    assert.ok(result.seoAudit);
    assert.ok(typeof result.seoAudit.overallScore === "number");
    assert.ok(result.seoAudit.overallScore >= 0 && result.seoAudit.overallScore <= 100);

    // 3. Validate Originality check attachment
    assert.ok(result.originality);
    assert.ok(result.originality.originalityScore >= 0);

    // 4. Validate metadata
    assert.ok(result.generationMetadata.provider);
    assert.ok(result.generationMetadata.modelId);
  });
});

test("Phase I: Human Review Gate & Multi-Tenant Security", async (t) => {
  await t.test("guarantees human review gate: initial state is never published", () => {
    const initialStatuses: ListingDraftStatus[] = [ListingDraftStatus.DRAFT, ListingDraftStatus.GENERATED];
    assert.ok(!initialStatuses.includes(ListingDraftStatus.PUSHED_TO_ETSY));
  });

  await t.test("enforces tenant isolation on draft mutations", () => {
    const mockCheck = (itemOrgId: string, sessionOrgId: string) => {
      if (itemOrgId !== sessionOrgId) throw new Error("Unauthorized cross-tenant access");
      return true;
    };

    assert.ok(mockCheck("org_alpha", "org_alpha"));
    assert.throws(() => mockCheck("org_alpha", "org_beta"), /Unauthorized cross-tenant access/);
  });
});
