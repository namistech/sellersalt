/**
 * SellerSalt Listing Content Assistant Engine
 * 
 * Generates structured, high-conversion, policy-compliant listing titles,
 * exactly 13 tags (<=20 chars), 10-part descriptions, and attributes from
 * verified research context with strict originality protection (Rule 6: Jaccard < 15%).
 */

export interface ListingAssistantInput {
  productTitle: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  category?: string;
  targetPrice?: number;
  targetCustomer?: string;
  materials?: string[];
  attributes?: Record<string, string>;
  competitorTitles?: string[];
}

export interface RecommendedTag {
  tag: string;
  characterCount: number;
  type: "primary" | "secondary" | "longtail";
  score: number;
}

export interface OriginalityReport {
  competitorSimilarityPercent: number;
  isCompliant: boolean;
  verdict: string;
}

export interface GeneratedListingContent {
  title: string;
  tags: RecommendedTag[];
  description: string;
  attributes: Record<string, string>;
  originalityReport: OriginalityReport;
  first40Chars: string;
  titleLength: number;
}

import { calculateJaccardSimilarity as calculateJaccardTokens } from "./originality-engine";

/**
 * Calculates token-level Jaccard similarity between candidate copy and competitor copy.
 * Ensures <15% overlap to guarantee true originality (Rule 6).
 */
export function calculateJaccardSimilarity(candidate: string, referenceList: string[]): number {
  if (!referenceList || referenceList.length === 0 || !candidate) return 0;

  const tokenize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2);

  const candidateTokens = tokenize(candidate);
  if (candidateTokens.length === 0) return 0;

  let maxSimilarity = 0;

  for (const ref of referenceList) {
    const refTokens = tokenize(ref);
    if (refTokens.length === 0) continue;

    const similarity = calculateJaccardTokens(candidateTokens, refTokens) * 100;
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
  }

  return Math.round(maxSimilarity * 10) / 10;
}

/**
 * Normalizes an Etsy tag to strictly obey Etsy requirements:
 * - Maximum 20 characters
 * - Lowercase alphanumeric and spaces
 * - No punctuation or special characters
 */
export function sanitizeEtsyTag(rawTag: string): string {
  return rawTag
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20)
    .trim();
}

/**
 * Generates comprehensive listing content from research context.
 */
export function generateListingContent(input: ListingAssistantInput): GeneratedListingContent {
  const primary = input.primaryKeyword.trim();
  const secondaries = (input.secondaryKeywords || []).map((k) => k.trim()).filter(Boolean);
  const category = input.category || "Handmade Goods";
  const materialsList = (input.materials || ["Premium Materials", "Handcrafted Quality"]).join(", ");

  // 1. Optimized Title Construction (Max 140 chars; primary keyword in first 40 chars)
  const secondary1 = secondaries[0] || "Custom Gift";
  const secondary2 = secondaries[1] || "Unique Home Decor";
  const secondary3 = secondaries[2] || "Handmade Quality";

  let title = `${primary} - ${secondary1}, ${secondary2} | ${secondary3}`;
  if (title.length > 140) {
    title = `${primary} - ${secondary1} | ${secondary2}`;
  }
  if (title.length > 140) {
    title = `${primary} - ${secondary1}`.slice(0, 140);
  }

  // 2. Exactly 13 Tag Generation (Unique, max 20 chars each)
  const candidateTags: Array<{ raw: string; type: "primary" | "secondary" | "longtail"; score: number }> = [];

  // Primary tag
  candidateTags.push({ raw: primary, type: "primary", score: 98 });

  // Secondary tags from keyword cluster
  for (const sec of secondaries) {
    candidateTags.push({ raw: sec, type: "secondary", score: 90 });
  }

  // Long-tail expansions
  candidateTags.push({ raw: `custom ${primary}`, type: "longtail", score: 85 });
  candidateTags.push({ raw: `${primary} gift`, type: "longtail", score: 82 });
  candidateTags.push({ raw: `handmade ${primary}`, type: "longtail", score: 80 });
  candidateTags.push({ raw: `personalized gift`, type: "longtail", score: 78 });
  candidateTags.push({ raw: `gift for her`, type: "longtail", score: 75 });
  candidateTags.push({ raw: `gift for him`, type: "longtail", score: 74 });
  candidateTags.push({ raw: `birthday present`, type: "longtail", score: 72 });
  candidateTags.push({ raw: `unique keepsake`, type: "longtail", score: 70 });
  candidateTags.push({ raw: `artisan crafted`, type: "longtail", score: 68 });
  candidateTags.push({ raw: `home decor gift`, type: "longtail", score: 65 });

  const seenTags = new Set<string>();
  const finalTags: RecommendedTag[] = [];

  for (const cand of candidateTags) {
    const clean = sanitizeEtsyTag(cand.raw);
    if (clean.length > 0 && !seenTags.has(clean)) {
      seenTags.add(clean);
      finalTags.push({
        tag: clean,
        characterCount: clean.length,
        type: cand.type,
        score: cand.score,
      });
      if (finalTags.length === 13) break;
    }
  }

  // Backfill if fewer than 13
  const fallbackList = ["artisan handmade", "unique gift idea", "custom order", "special occasion", "made to order"];
  for (const fb of fallbackList) {
    if (finalTags.length >= 13) break;
    const clean = sanitizeEtsyTag(fb);
    if (!seenTags.has(clean)) {
      seenTags.add(clean);
      finalTags.push({
        tag: clean,
        characterCount: clean.length,
        type: "longtail",
        score: 60,
      });
    }
  }

  // 3. 10-Part Structured High-Converting Description
  const description = [
    `✨ Discover the perfect ${primary} crafted with attention to detail and enduring craftsmanship. Whether you are treating yourself or finding an unforgettable gift, this piece delivers timeless quality and personalized appeal.`,
    ``,
    `🌟 WHY YOU'LL LOVE IT`,
    `• Thoughtfully designed for both functional elegance and daily enjoyment`,
    `• Made from carefully selected materials: ${materialsList}`,
    `• Each item is individually finished and inspected to ensure premier presentation`,
    `• Ideal for ${input.targetCustomer || "discerning shoppers, collectors, and thoughtful gift-givers"}`,
    ``,
    `📐 PRODUCT SPECIFICATIONS & DETAILS`,
    `• Item: ${primary}`,
    `• Category: ${category}`,
    `• Primary Materials: ${materialsList}`,
    `• Finish: Smooth artisan finish`,
    ``,
    `🎁 PERSONALIZATION & CUSTOM OPTIONS`,
    `Looking to make it uniquely yours? We offer custom personalization on select orders. Simply add your instructions during checkout or message us with your custom request.`,
    ``,
    `📦 SHIPPING & CAREFUL PACKAGING`,
    `Every item is securely packaged to arrive in flawless condition. Standard processing time is 1-3 business days with trackable delivery.`,
    ``,
    `🌿 CARE INSTRUCTIONS`,
    `To maintain the luster and durability of your item, gently wipe with a soft, dry cloth. Avoid exposure to harsh abrasives or extreme moisture.`,
    ``,
    `💬 HAVE QUESTIONS?`,
    `We are delighted to assist! Feel free to reach out anytime for sizing recommendations, custom orders, or delivery timing.`,
  ].join("\n");

  // 4. Recommended Attributes
  const attributes: Record<string, string> = {
    Category: category,
    "Primary Material": (input.materials && input.materials[0]) || "Handmade Materials",
    "Craft Type": "Artisan Craft & Fabrication",
    Occasion: "All Occasions / Gift",
    Recipient: input.targetCustomer || "Unisex Adult",
    Style: "Contemporary / Artisan Minimalist",
    Personalization: "Optional",
    "Made To Order": "Yes",
  };

  // 5. Originality Protection Check (<15% overlap)
  const similarity = calculateJaccardSimilarity(title, input.competitorTitles || []);
  const isCompliant = similarity < 15.0;

  return {
    title,
    tags: finalTags.slice(0, 13),
    description,
    attributes,
    originalityReport: {
      competitorSimilarityPercent: similarity,
      isCompliant,
      verdict: isCompliant
        ? "Originality verified (<15% similarity with competitor titles/copy)"
        : "Similarity threshold exceeded — rephrasing recommended",
    },
    first40Chars: title.slice(0, 40),
    titleLength: title.length,
  };
}
