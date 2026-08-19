/**
 * SellerSalt Canonical SEO Diagnostics & Audit Engine
 * 
 * Implements the deterministic 0–100 SellerSalt SEO scoring rubric,
 * evaluating title character utilization, 13-tag completeness, title/tag synergy,
 * description keyword placement, and taxonomy/attribute completeness.
 */

import { prisma } from "@/lib/db";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { createEtsyClient } from "@/connectors/etsy";
import { normalizeTerm } from "@/services/keyword-research";
import {
  ETSY_OPTIMIZATION_RULES,
  type MarketplaceOptimizationRules,
} from "@/marketplaces/core/optimization-rules";
import { marketplaceFromSellerChannelPlatform, type MarketplaceId } from "@/marketplaces/core/types";
import type {
  CompleteListingSeoAudit,
  ListingSeoAuditInput,
  SeoDiagnostic,
  SeoRecommendation,
  SeoScoreBreakdown,
  SeoTitleAnalysis,
  SeoTagAnalysis,
  SeoSynergyAnalysis,
  SeoDescriptionAnalysis,
  SeoTaxonomyAnalysis,
  TagAnalysisItem,
  SeoGrade,
} from "@/types/seo";

// --------------------------------------------------------------------------
// Core Deterministic SEO Audit Engine
// --------------------------------------------------------------------------

export function auditListingSeo(
  input: {
    title?: string;
    tags?: string[];
    description?: string;
    materials?: string[];
    taxonomyId?: number;
    categoryPath?: string;
    attributes?: Record<string, any>;
    imageUrl?: string | null;
    listingUrl?: string;
    shopName?: string;
    price?: number;
    listingId?: string;
  },
  rules: MarketplaceOptimizationRules = ETSY_OPTIMIZATION_RULES
): CompleteListingSeoAudit {
  const rawTitle = (input.title || "").trim();
  const rawTags = Array.isArray(input.tags) ? input.tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const rawDesc = (input.description || "").trim();
  const rawMaterials = Array.isArray(input.materials) ? input.materials.map((m) => String(m).trim()).filter(Boolean) : [];
  const taxonomyId = input.taxonomyId ? Number(input.taxonomyId) : undefined;

  // Marketplace-neutral thresholds — default (ETSY_OPTIMIZATION_RULES)
  // reduces to exactly 140/120/80/70 and 13/10/20, identical to this
  // engine's original hardcoded Etsy behavior. A marketplace with unknown
  // rules (titleMaxLength/tagCount: null) skips the length/count-dependent
  // checks entirely rather than scoring against a guessed limit.
  const marketplaceLabel = rules.marketplace.charAt(0).toUpperCase() + rules.marketplace.slice(1);
  const titleMax = rules.titleMaxLength;
  const titleOptimalMin = titleMax !== null ? Math.round(titleMax * (120 / 140)) : null;
  const titlePartialMin = titleMax !== null ? Math.round(titleMax * (80 / 140)) : null;
  const titleTooShortMax = titleMax !== null ? Math.round(titleMax * (70 / 140)) : null;

  const diagnostics: SeoDiagnostic[] = [];
  const recommendations: SeoRecommendation[] = [];

  // ========================================================================
  // 1. TITLE AUDIT (30 Points Max)
  // ========================================================================
  const titleLength = rawTitle.length;
  let titleScore = 0;
  const titleDiagnostics: SeoDiagnostic[] = [];

  // Title Length Check (10 pts) — skipped (0 pts, no diagnostic) when this
  // marketplace's title limit isn't known yet.
  let isOptimalLength = false;
  if (titleMax === null || titleOptimalMin === null || titlePartialMin === null || titleTooShortMax === null) {
    // Unknown rules for this marketplace — do not score or fabricate a limit.
  } else if (titleLength >= titleOptimalMin && titleLength <= titleMax) {
    titleScore += 10;
    isOptimalLength = true;
  } else if (titleLength >= titlePartialMin && titleLength < titleOptimalMin) {
    titleScore += 5;
  } else if (titleLength > titleMax) {
    const diag: SeoDiagnostic = {
      code: "TITLE_TOO_LONG",
      severity: "CRITICAL",
      title: `Title Exceeds ${marketplaceLabel} Limit (${titleMax} Characters)`,
      message: `Your title is ${titleLength} characters. ${marketplaceLabel} strictly enforces a ${titleMax}-character maximum.`,
      recommendation: `Trim title to under ${titleMax} characters to prevent a write rejection.`,
      pointsDeducted: 15,
    };
    titleDiagnostics.push(diag);
    diagnostics.push(diag);
    recommendations.push({
      id: "rec-title-length",
      category: "TITLE",
      title: `Shorten title to <= ${titleMax} characters`,
      action: `Remove redundant filler words to fit within ${marketplaceLabel}'s ${titleMax}-character ceiling.`,
      impactScore: 15,
      isAutomatedFixAvailable: true,
    });
  } else if (titleLength < titleTooShortMax) {
    const diag: SeoDiagnostic = {
      code: "TITLE_TOO_SHORT",
      severity: "HIGH",
      title: `Title is Underutilized (< ${titleTooShortMax} Characters)`,
      message: `Your title is only ${titleLength} characters. ${marketplaceLabel} search allows up to ${titleMax} characters for keyword matching.`,
      recommendation: `Expand title to ${titleOptimalMin}–${titleMax} characters by adding 2–3 relevant long-tail keyword phrases.`,
      pointsDeducted: 10,
    };
    titleDiagnostics.push(diag);
    diagnostics.push(diag);
    recommendations.push({
      id: "rec-title-expand",
      category: "TITLE",
      title: "Expand title with 2-3 long-tail phrases",
      action: "Add high-intent descriptive keywords to maximize search impression matching.",
      impactScore: 10,
      isAutomatedFixAvailable: true,
    });
  }

  // High-Intent Start Check (first 40 chars, 10 pts)
  const first40 = rawTitle.slice(0, 40);
  const first40Tokens = normalizeTerm(first40).split(" ").filter((w) => w.length >= 3);
  let hasHighIntentStart = false;
  if (first40Tokens.length >= 2 && first40.length >= 20) {
    titleScore += 10;
    hasHighIntentStart = true;
  } else if (rawTitle.length > 0) {
    const diag: SeoDiagnostic = {
      code: "WEAK_TITLE_START",
      severity: "MEDIUM",
      title: "Weak Opening Keyword Hook",
      message: "The first 40 characters of your title should feature your highest-intent search term.",
      recommendation: "Front-load your primary target keyword in the very first 40 characters for mobile display.",
      pointsDeducted: 5,
    };
    titleDiagnostics.push(diag);
    diagnostics.push(diag);
  }

  // Natural Delimiters & Formatting (10 pts)
  const hasPipeOrComma = /[,|/-]/.test(rawTitle);
  const isAllCaps = rawTitle.length > 10 && rawTitle === rawTitle.toUpperCase();
  let hasNaturalDelimiters = false;

  if (isAllCaps) {
    const diag: SeoDiagnostic = {
      code: "TITLE_ALL_CAPS",
      severity: "MEDIUM",
      title: "Title is in ALL CAPS",
      message: "ALL CAPS titles reduce readability and appear spammy to shoppers.",
      recommendation: "Use Title Case or sentence case with clean comma/pipe delimiters.",
      pointsDeducted: 5,
    };
    titleDiagnostics.push(diag);
    diagnostics.push(diag);
  } else if (hasPipeOrComma && rawTitle.length >= 40) {
    titleScore += 10;
    hasNaturalDelimiters = true;
  } else if (rawTitle.length > 0) {
    titleScore += 5;
  }

  const titleKeywords = normalizeTerm(rawTitle).split(" ").filter((w) => w.length >= 3);
  const titleAnalysis: SeoTitleAnalysis = {
    characterCount: titleLength,
    score: Math.min(30, titleScore),
    isOptimalLength,
    hasHighIntentStart,
    hasNaturalDelimiters,
    detectedKeywords: Array.from(new Set(titleKeywords)).slice(0, 8),
    diagnostics: titleDiagnostics,
  };

  // ========================================================================
  // 2. TAG AUDIT (35 Points Max)
  // ========================================================================
  let tagScore = 0;
  const tagDiagnostics: SeoDiagnostic[] = [];
  const tagCount = rawTags.length;
  const tagTarget = rules.supportsTags ? rules.tagCount : null;
  const tagPartialMin = tagTarget !== null ? Math.round(tagTarget * (10 / 13)) : null;
  const tagMaxLen = rules.supportsTags ? rules.tagMaxLength : null;
  const isComplete = tagTarget !== null && tagCount === tagTarget;

  // Tag count score (15 pts) — skipped when this marketplace doesn't
  // support tags at all, or its tag count isn't known yet.
  if (tagTarget === null || tagPartialMin === null) {
    // No fabricated target — e.g. a marketplace with supportsTags: false.
  } else if (tagCount === tagTarget) {
    tagScore += 15;
  } else if (tagCount >= tagPartialMin) {
    tagScore += 8;
    const diag: SeoDiagnostic = {
      code: "UNUSED_TAGS",
      severity: "HIGH",
      title: "Missing Available Tag Slots",
      message: `You are only using ${tagCount} of ${tagTarget} available ${marketplaceLabel} tags.`,
      recommendation: `Add ${tagTarget - tagCount} more long-tail tags to utilize all ${tagTarget} slots and expand search visibility.`,
      pointsDeducted: 7,
    };
    tagDiagnostics.push(diag);
    diagnostics.push(diag);
    recommendations.push({
      id: "rec-fill-tags",
      category: "TAGS",
      title: `Fill all ${tagTarget} tag slots (+${tagTarget - tagCount} tags)`,
      action: "Every unused tag is a lost search opportunity. Add relevant multi-word search phrases.",
      impactScore: 7,
      isAutomatedFixAvailable: true,
    });
  } else {
    const diag: SeoDiagnostic = {
      code: "UNUSED_TAGS",
      severity: "HIGH",
      title: `Critical Missing Tags (< ${tagPartialMin} Tags Used)`,
      message: `You are only using ${tagCount} of ${tagTarget} available tags. ${marketplaceLabel} heavily relies on all ${tagTarget} tags for query matching.`,
      recommendation: `Add ${tagTarget - tagCount} more tags to utilize all ${tagTarget} slots.`,
      pointsDeducted: 15,
    };
    tagDiagnostics.push(diag);
    diagnostics.push(diag);
    recommendations.push({
      id: "rec-fill-tags-critical",
      category: "TAGS",
      title: `Add missing tags to reach ${tagTarget} tags`,
      action: `Fill all ${tagTarget} slots with 2–3 word long-tail tags.`,
      impactScore: 15,
      isAutomatedFixAvailable: true,
    });
  }

  // Tag length validation (10 pts)
  const normTitle = normalizeTerm(rawTitle);
  const tagAnalysisItems: TagAnalysisItem[] = [];
  let overLengthCount = 0;
  let singleWordCount = 0;
  const seenTags = new Set<string>();
  let duplicateCount = 0;

  for (const t of rawTags) {
    const charCount = t.length;
    const isCompliant = tagMaxLen === null || charCount <= tagMaxLen;
    const words = t.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const cleanTag = normalizeTerm(t);
    const isInTitle = cleanTag.length > 0 && normTitle.includes(cleanTag);

    if (!isCompliant) overLengthCount++;
    if (wordCount === 1) singleWordCount++;
    if (seenTags.has(cleanTag)) duplicateCount++;
    seenTags.add(cleanTag);

    tagAnalysisItems.push({
      tag: t,
      charCount,
      isCompliant,
      wordCount,
      isInTitle,
    });
  }

  const allCompliantLength = overLengthCount === 0;
  if (allCompliantLength && tagCount > 0) {
    tagScore += 10;
  } else if (overLengthCount > 0) {
    const diag: SeoDiagnostic = {
      code: "TAG_OVER_LENGTH",
      severity: "CRITICAL",
      title: `Tags Exceed ${tagMaxLen}-Character Limit`,
      message: `${overLengthCount} tag(s) exceed ${marketplaceLabel}'s ${tagMaxLen}-character limit and cannot be published.`,
      recommendation: `Shorten tags to ${tagMaxLen} characters or fewer.`,
      pointsDeducted: 10,
    };
    tagDiagnostics.push(diag);
    diagnostics.push(diag);
    recommendations.push({
      id: "rec-fix-tag-length",
      category: "TAGS",
      title: "Shorten over-length tags",
      action: `Trim tags exceeding ${tagMaxLen} characters to comply with ${marketplaceLabel}'s tag constraints.`,
      impactScore: 10,
      isAutomatedFixAvailable: true,
    });
  }

  // Multi-word long-tail tags (5 pts)
  const longTailTagCount = tagAnalysisItems.filter((t) => t.wordCount >= 2).length;
  if (longTailTagCount >= 8) {
    tagScore += 5;
  } else if (singleWordCount > 4) {
    const diag: SeoDiagnostic = {
      code: "SINGLE_WORD_TAGS",
      severity: "MEDIUM",
      title: "Too Many Single-Word Tags",
      message: `${singleWordCount} tags are single words. Single-word tags have high competition and lower purchase intent.`,
      recommendation: "Replace broad single words with 2–3 word long-tail phrases (e.g., 'leather wallet' instead of 'wallet').",
      pointsDeducted: 5,
    };
    tagDiagnostics.push(diag);
    diagnostics.push(diag);
    recommendations.push({
      id: "rec-longtail-tags",
      category: "TAGS",
      title: "Convert single words into 2-3 word long-tail phrases",
      action: "Upgrade generic keywords to targeted buyer phrases.",
      impactScore: 5,
      isAutomatedFixAvailable: true,
    });
  }

  // Duplicate tags check (5 pts)
  if (duplicateCount === 0 && tagCount > 0) {
    tagScore += 5;
  } else if (duplicateCount > 0) {
    const diag: SeoDiagnostic = {
      code: "DUPLICATE_TAGS",
      severity: "MEDIUM",
      title: "Duplicate Tags Detected",
      message: `${duplicateCount} duplicate tag(s) found in your listing.`,
      recommendation: "Remove duplicate tags and replace with unique alternative search phrases.",
      pointsDeducted: 5,
    };
    tagDiagnostics.push(diag);
    diagnostics.push(diag);
  }

  const tagAnalysis: SeoTagAnalysis = {
    tagCount,
    score: Math.min(35, tagScore),
    isComplete,
    allCompliantLength,
    longTailTagCount,
    duplicateCount,
    tags: tagAnalysisItems,
    diagnostics: tagDiagnostics,
  };

  // ========================================================================
  // 3. TITLE-TAG SYNERGY (15 Points Max)
  // ========================================================================
  let synergyScore = 0;
  const synergyDiagnostics: SeoDiagnostic[] = [];
  const matchingPhrases = tagAnalysisItems.filter((t) => t.isInTitle).map((t) => t.tag);
  const exactMatchesCount = matchingPhrases.length;

  if (exactMatchesCount >= 3) {
    synergyScore += 15;
  } else if (exactMatchesCount >= 1) {
    synergyScore += 8;
    const diag: SeoDiagnostic = {
      code: "WEAK_TITLE_TAG_ALIGN",
      severity: "MEDIUM",
      title: "Moderate Title & Tag Keyword Synergy",
      message: `Only ${exactMatchesCount} tag(s) appear in your listing title. Strongest Etsy ranking occurs when top 3 tags match title phrases.`,
      recommendation: "Include your top 3 primary tags verbatim in your title phrases.",
      pointsDeducted: 7,
    };
    synergyDiagnostics.push(diag);
    diagnostics.push(diag);
  } else if (tagCount > 0 && rawTitle.length > 0) {
    const diag: SeoDiagnostic = {
      code: "WEAK_TITLE_TAG_ALIGN",
      severity: "HIGH",
      title: "Zero Title & Tag Keyword Overlap",
      message: "None of your tags appear in your title. Etsy's search algorithm favors listings with exact title-to-tag synergy.",
      recommendation: "Align your top 3 title phrases directly with your highest-priority tags.",
      pointsDeducted: 15,
    };
    synergyDiagnostics.push(diag);
    diagnostics.push(diag);
    recommendations.push({
      id: "rec-title-tag-synergy",
      category: "TAGS",
      title: "Align top 3 tags with title phrases",
      action: "Match primary title phrases with tags to trigger Etsy exact-match query boost.",
      impactScore: 15,
      isAutomatedFixAvailable: true,
    });
  }

  const missingFromTitle = tagAnalysisItems.filter((t) => !t.isInTitle).map((t) => t.tag);
  const synergyAnalysis: SeoSynergyAnalysis = {
    score: Math.min(15, synergyScore),
    exactMatchesCount,
    matchingPhrases,
    missingFromTitle,
    diagnostics: synergyDiagnostics,
  };

  // ========================================================================
  // 4. DESCRIPTION READABILITY & KEYWORDS (10 Points Max)
  // ========================================================================
  let descriptionScore = 0;
  const descDiagnostics: SeoDiagnostic[] = [];
  const descLength = rawDesc.length;
  const descWords = rawDesc.split(/\s+/).filter(Boolean);
  const descWordCount = descWords.length;

  const first160Desc = normalizeTerm(rawDesc.slice(0, 160));
  let hasFirst160Keyword = false;

  for (const t of rawTags) {
    const clean = normalizeTerm(t);
    if (clean.length >= 3 && first160Desc.includes(clean)) {
      hasFirst160Keyword = true;
      break;
    }
  }

  if (!hasFirst160Keyword && rawTitle.length > 0) {
    const titleWords = normalizeTerm(rawTitle).split(" ").filter((w) => w.length >= 4);
    for (const w of titleWords) {
      if (first160Desc.includes(w)) {
        hasFirst160Keyword = true;
        break;
      }
    }
  }

  if (hasFirst160Keyword) {
    descriptionScore += 5;
  } else if (rawDesc.length > 0) {
    const diag: SeoDiagnostic = {
      code: "DESCRIPTION_NO_KEYWORD_HOOK",
      severity: "LOW",
      title: "Opening Description Lacks Keywords",
      message: "Your primary keyword phrase is missing from the first 160 characters of your description.",
      recommendation: "Include your main target keyword in the first sentence to improve search context and snippet click-through.",
      pointsDeducted: 5,
    };
    descDiagnostics.push(diag);
    diagnostics.push(diag);
  }

  let hasStructuredHeadings = false;
  if (descWordCount >= 150) {
    descriptionScore += 5;
    hasStructuredHeadings = true;
  } else if (rawDesc.length > 0) {
    const diag: SeoDiagnostic = {
      code: "DESCRIPTION_TOO_SHORT",
      severity: "LOW",
      title: "Description is Brief (< 150 Words)",
      message: `Your description is only ${descWordCount} words. Informative descriptions answer buyer questions and boost conversion.`,
      recommendation: "Expand description with clear sections for Product Details, Dimensions, Materials, and Care Instructions.",
      pointsDeducted: 5,
    };
    descDiagnostics.push(diag);
    diagnostics.push(diag);
  }

  const descriptionAnalysis: SeoDescriptionAnalysis = {
    score: Math.min(10, descriptionScore),
    characterCount: descLength,
    wordCount: descWordCount,
    hasFirst160Keyword,
    hasStructuredHeadings,
    diagnostics: descDiagnostics,
  };

  // ========================================================================
  // 5. ATTRIBUTES & TAXONOMY (10 Points Max)
  // ========================================================================
  let taxonomyScore = 0;
  let attributeScore = 0;
  const taxDiagnostics: SeoDiagnostic[] = [];

  const isDeepTaxonomy = Boolean(taxonomyId && taxonomyId > 0);
  if (isDeepTaxonomy) {
    taxonomyScore += 5;
  } else {
    const diag: SeoDiagnostic = {
      code: "NO_DEEP_TAXONOMY",
      severity: "LOW",
      title: "Missing Specific Taxonomy Category",
      message: "No specific Etsy sub-category taxonomy ID is attached to this listing.",
      recommendation: "Assign the deepest available category leaf node in Etsy's buyer taxonomy.",
      pointsDeducted: 5,
    };
    taxDiagnostics.push(diag);
    diagnostics.push(diag);
  }

  const materialsCount = rawMaterials.length;
  const attributesCount = input.attributes ? Object.keys(input.attributes).length : 0;

  if (materialsCount >= 2 || attributesCount >= 2) {
    attributeScore += 5;
  } else if (materialsCount === 1 || attributesCount === 1) {
    attributeScore += 3;
  } else {
    const diag: SeoDiagnostic = {
      code: "MISSING_MATERIALS_ATTRIBUTES",
      severity: "LOW",
      title: "Missing Materials & Structured Attributes",
      message: "No materials or item attributes are listed. Etsy filters rely on structured attributes.",
      recommendation: "Add 2–5 material keywords (e.g. 'Full Grain Leather', 'Brass Hardware') and fill item attributes.",
      pointsDeducted: 5,
    };
    taxDiagnostics.push(diag);
    diagnostics.push(diag);
  }

  const taxonomyAnalysis: SeoTaxonomyAnalysis = {
    score: Math.min(10, taxonomyScore + attributeScore),
    taxonomyId,
    categoryPath: input.categoryPath,
    isDeepTaxonomy,
    attributeCount: attributesCount,
    materialsCount,
    materials: rawMaterials,
    diagnostics: taxDiagnostics,
  };

  // ========================================================================
  // COMPOSITE SCORE & GRADE CALCULATION
  // ========================================================================
  const rawOverall =
    titleAnalysis.score +
    tagAnalysis.score +
    synergyAnalysis.score +
    descriptionAnalysis.score +
    taxonomyAnalysis.score;

  const overallScore = Math.min(100, Math.max(0, Math.round(rawOverall)));

  let grade: SeoGrade = "F";
  if (overallScore >= 90) grade = "A";
  else if (overallScore >= 80) grade = "B";
  else if (overallScore >= 70) grade = "C";
  else if (overallScore >= 60) grade = "D";

  const breakdown: SeoScoreBreakdown = {
    overallScore,
    grade,
    titleScore: titleAnalysis.score,
    tagScore: tagAnalysis.score,
    keywordSynergyScore: synergyAnalysis.score,
    descriptionScore: descriptionAnalysis.score,
    taxonomyScore,
    attributeScore,
  };

  return {
    listingId: input.listingId,
    title: rawTitle,
    tags: rawTags,
    description: rawDesc,
    materials: rawMaterials,
    taxonomyId,
    categoryPath: input.categoryPath,
    imageUrl: input.imageUrl || null,
    listingUrl: input.listingUrl,
    shopName: input.shopName,
    price: input.price,
    overallScore,
    grade,
    breakdown,
    titleAnalysis,
    tagAnalysis,
    synergyAnalysis,
    descriptionAnalysis,
    taxonomyAnalysis,
    diagnostics,
    recommendations,
    auditedAt: new Date().toISOString(),
  };
}

// --------------------------------------------------------------------------
// Orchestration & Persistence Methods
// --------------------------------------------------------------------------

export async function fetchAndAuditEtsyListing(
  organizationId: string,
  listingId: string | number
): Promise<CompleteListingSeoAudit> {
  const active = await getActiveConnectorWithCredentials(organizationId, "ETSY");
  const apiKey = active?.credentials?.apiKey || process.env.ETSY_API_KEY || "";
  const sharedSecret = active?.credentials?.sharedSecret || process.env.ETSY_SHARED_SECRET || "";

  if (!apiKey) {
    throw new Error("No active Etsy API credentials configured. Please configure an Etsy connector in Settings.");
  }

  const client = createEtsyClient(apiKey, sharedSecret);
  const l = await client.getListing(listingId);

  if (!l) {
    throw new Error(`Etsy listing ${listingId} could not be retrieved.`);
  }

  const price = (l.price?.amount ?? 0) / (l.price?.divisor ?? 100);
  const images: string[] = [];
  if (l.images && Array.isArray(l.images)) {
    for (const img of l.images) {
      const url = img.url_570xN || img.url_fullxfull || img.url_75x75;
      if (url) images.push(url);
    }
  }

  return auditListingSeo({
    listingId: String(l.listing_id),
    title: l.title,
    tags: Array.isArray(l.tags) ? l.tags : [],
    description: l.description,
    materials: Array.isArray(l.materials) ? l.materials : [],
    taxonomyId: l.taxonomy_id,
    imageUrl: images[0] || l.image_url || null,
    listingUrl: l.url || `https://www.etsy.com/listing/${l.listing_id}`,
    shopName: l.shop_name,
    price,
  });
}

/** A connected seller channel is the authoritative source for "which
 * marketplace" an audit belongs to — a draft/listing tied to a real store
 * shouldn't be scored against a marketplace picked by hand that disagrees
 * with where it's actually going. `organizationId`-scoped so an id from
 * another tenant can never leak a marketplace decision across orgs. Falls
 * back to `fallback` when no channel id is given, or it doesn't resolve to
 * one this org owns. */
export async function resolveMarketplaceForAudit(
  organizationId: string,
  sellerChannelId: string | undefined | null,
  fallback: MarketplaceId
): Promise<MarketplaceId> {
  if (sellerChannelId) {
    const channel = await prisma.sellerChannel.findFirst({
      where: { id: sellerChannelId, organizationId },
      select: { platform: true },
    });
    const fromChannel = channel && marketplaceFromSellerChannelPlatform(channel.platform);
    if (fromChannel) return fromChannel;
  }
  return fallback;
}

export async function saveListingSeoAuditRecord(
  organizationId: string,
  input: ListingSeoAuditInput,
  rules: MarketplaceOptimizationRules = ETSY_OPTIMIZATION_RULES
): Promise<CompleteListingSeoAudit> {
  const audit = auditListingSeo(
    {
      title: input.title,
      tags: input.tags,
      description: input.description,
      materials: input.materials,
      taxonomyId: input.taxonomyId,
      attributes: input.attributes,
      imageUrl: input.imageUrl,
      listingUrl: input.listingUrl,
      shopName: input.shopName,
      price: input.price,
      listingId: input.externalListingId,
    },
    rules
  );

  const record = await prisma.listingSeoAudit.create({
    data: {
      organizationId,
      plannerItemId: input.plannerItemId ?? null,
      listingDraftId: input.listingDraftId ?? null,
      sellerChannelId: input.sellerChannelId ?? null,
      externalListingId: input.externalListingId ?? null,
      overallScore: audit.overallScore,
      titleScore: audit.breakdown.titleScore,
      tagScore: audit.breakdown.tagScore,
      keywordSynergyScore: audit.breakdown.keywordSynergyScore,
      descriptionScore: audit.breakdown.descriptionScore,
      taxonomyScore: audit.breakdown.taxonomyScore,
      attributeScore: audit.breakdown.attributeScore,
      titleCharCount: audit.titleAnalysis.characterCount,
      tagCount: audit.tagAnalysis.tagCount,
      tagsOver20Chars: audit.tagAnalysis.tags.filter((t) => !t.isCompliant).map((t) => t.tag),
      duplicateTags: audit.diagnostics.filter((d) => d.code === "DUPLICATE_TAGS").map((d) => d.message),
      singleWordTags: audit.tagAnalysis.tags.filter((t) => t.wordCount === 1).map((t) => t.tag),
      missingAttributes: audit.taxonomyAnalysis.materialsCount === 0 ? ["materials"] : [],
      diagnostics: audit.diagnostics as any,
      recommendations: audit.recommendations as any,
      provenance: "SELLERSALT_SCORE",
      auditVersion: "2.0",
    },
  });

  audit.id = record.id;
  return audit;
}
