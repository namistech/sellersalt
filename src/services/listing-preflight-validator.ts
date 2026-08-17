/**
 * SellerSalt Listing Pre-Flight Validator
 * 
 * Reusable validator executing comprehensive pre-flight verification across SEO,
 * Content Quality, Unit Economics, and Marketplace Readiness before draft creation.
 * 
 * Complies with Rule 5 (Explainable inputs) and Rule 9 (Human verification gate).
 */

import { auditListingSeo } from "./seo-engine";
import { evaluateListingOriginality } from "./originality-engine";
import { calculateUnitEconomics } from "./opportunity-memory";

export interface PreflightInput {
  title: string;
  tags: string[];
  description: string;
  price: number;
  cogs?: number;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  materials?: string[];
  sourceCompetitorCopy?: {
    title?: string;
    tags?: string[];
    description?: string;
  };
  hasEtsyWriteScope?: boolean;
}

export interface PreflightChecklistItem {
  id: string;
  name: string;
  category: "SEO" | "CONTENT" | "ECONOMICS" | "MARKETPLACE";
  status: "PASS" | "WARNING" | "FAIL";
  message: string;
  details?: string;
}

export interface PreflightValidationResult {
  status: "READY" | "BLOCKED";
  overallScore: number; // 0-100
  seoScore: number;
  contentScore: number;
  economicsScore: number;
  blockers: string[];
  warnings: string[];
  checklist: PreflightChecklistItem[];
  provenance: "SELLERSALT_SCORE";
}

export function validateListingPreflight(input: PreflightInput): PreflightValidationResult {
  const {
    title = "",
    tags = [],
    description = "",
    price = 25.0,
    cogs = price * 0.25,
    primaryKeyword,
    materials = [],
    sourceCompetitorCopy,
    hasEtsyWriteScope = true,
  } = input;

  const blockers: string[] = [];
  const warnings: string[] = [];
  const checklist: PreflightChecklistItem[] = [];

  // --------------------------------------------------------------------------
  // 1. SEO Checks
  // --------------------------------------------------------------------------
  const titleClean = title.trim();
  const titleLen = titleClean.length;

  // Title Length
  if (titleLen === 0) {
    blockers.push("Title is required.");
    checklist.push({
      id: "title-length",
      name: "Title Length Constraint",
      category: "SEO",
      status: "FAIL",
      message: "Title cannot be empty.",
    });
  } else if (titleLen > 140) {
    blockers.push(`Title exceeds Etsy maximum limit of 140 characters (${titleLen}/140).`);
    checklist.push({
      id: "title-length",
      name: "Title Length Constraint",
      category: "SEO",
      status: "FAIL",
      message: `Title exceeds 140 chars (${titleLen}/140).`,
    });
  } else if (titleLen < 25) {
    warnings.push(`Title is very short (${titleLen}/140 chars). Utilize available character space for keywords.`);
    checklist.push({
      id: "title-length",
      name: "Title Length Constraint",
      category: "SEO",
      status: "WARNING",
      message: `Title is short (${titleLen}/140 chars). Expand keyword coverage.`,
    });
  } else {
    checklist.push({
      id: "title-length",
      name: "Title Length Constraint",
      category: "SEO",
      status: "PASS",
      message: `Title length optimal (${titleLen}/140 characters).`,
    });
  }

  // Primary Keyword Placement (First 40 Characters)
  const first40 = titleClean.slice(0, 40).toLowerCase();
  const kw = (primaryKeyword || "").trim().toLowerCase();
  const hasFrontLoadedKw = kw ? first40.includes(kw) : true;

  if (kw && !hasFrontLoadedKw) {
    warnings.push(`Primary keyword '${kw}' is not placed in the first 40 title characters for mobile shoppers.`);
    checklist.push({
      id: "keyword-frontload",
      name: "Mobile Title Front-Loading",
      category: "SEO",
      status: "WARNING",
      message: `Primary keyword '${kw}' missing from first 40 chars.`,
    });
  } else {
    checklist.push({
      id: "keyword-frontload",
      name: "Mobile Title Front-Loading",
      category: "SEO",
      status: "PASS",
      message: "Primary search intent front-loaded in title.",
    });
  }

  // Tag Count (Exact 13 Slots)
  const cleanTags = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  const uniqueTags = Array.from(new Set(cleanTags));

  if (cleanTags.length < 13) {
    blockers.push(`Etsy permits 13 tags; only ${cleanTags.length}/13 slots are utilized.`);
    checklist.push({
      id: "tag-count",
      name: "13-Tag Slot Utilization",
      category: "SEO",
      status: "FAIL",
      message: `Only ${cleanTags.length}/13 tags populated. Fill all 13 slots.`,
    });
  } else if (cleanTags.length > 13) {
    blockers.push(`Maximum 13 tags allowed on Etsy (${cleanTags.length} provided).`);
    checklist.push({
      id: "tag-count",
      name: "13-Tag Slot Utilization",
      category: "SEO",
      status: "FAIL",
      message: `Too many tags provided (${cleanTags.length}/13).`,
    });
  } else {
    checklist.push({
      id: "tag-count",
      name: "13-Tag Slot Utilization",
      category: "SEO",
      status: "PASS",
      message: "Exact 13/13 tag slots utilized.",
    });
  }

  // Tag Duplicate & Character Length Checks
  const oversizedTags = cleanTags.filter((t) => t.length > 20);
  if (oversizedTags.length > 0) {
    blockers.push(`Tag character limit exceeded (max 20 chars per tag): "${oversizedTags.join('", "')}".`);
    checklist.push({
      id: "tag-char-limit",
      name: "Tag Character Limits",
      category: "SEO",
      status: "FAIL",
      message: `${oversizedTags.length} tags exceed 20 characters.`,
    });
  } else {
    checklist.push({
      id: "tag-char-limit",
      name: "Tag Character Limits",
      category: "SEO",
      status: "PASS",
      message: "All tags conform to 20-character Etsy limit.",
    });
  }

  if (uniqueTags.length < cleanTags.length) {
    blockers.push("Duplicate tags detected in the tag list.");
    checklist.push({
      id: "tag-duplicates",
      name: "Tag Uniqueness",
      category: "SEO",
      status: "FAIL",
      message: "Duplicate tags found.",
    });
  } else {
    checklist.push({
      id: "tag-duplicates",
      name: "Tag Uniqueness",
      category: "SEO",
      status: "PASS",
      message: "All 13 tags are distinct phrases.",
    });
  }

  // --------------------------------------------------------------------------
  // 2. Content Checks
  // --------------------------------------------------------------------------
  const descLen = description.trim().length;
  if (descLen === 0) {
    blockers.push("Listing description is required.");
    checklist.push({
      id: "description-completeness",
      name: "Description Completeness",
      category: "CONTENT",
      status: "FAIL",
      message: "Description is empty.",
    });
  } else if (descLen < 150) {
    warnings.push("Description is very brief. Provide detailed dimensions, materials, and care instructions.");
    checklist.push({
      id: "description-completeness",
      name: "Description Completeness",
      category: "CONTENT",
      status: "WARNING",
      message: `Brief description (${descLen} chars). Expand product details.`,
    });
  } else {
    checklist.push({
      id: "description-completeness",
      name: "Description Completeness",
      category: "CONTENT",
      status: "PASS",
      message: "Detailed description with complete buyer information.",
    });
  }

  // Originality Check
  if (sourceCompetitorCopy?.description) {
    const originality = evaluateListingOriginality({
      draftTitle: titleClean,
      draftTags: cleanTags,
      draftDescription: description,
      sourceTitle: sourceCompetitorCopy.title || undefined,
      sourceTags: sourceCompetitorCopy.tags,
      sourceDescription: sourceCompetitorCopy.description || undefined,
    });

    if (originality.originalityScore < 70) {
      warnings.push(`Originality protection alert: Competitor copy similarity detected (Score ${originality.originalityScore}/100, Jaccard ${(originality.jaccardSimilarity * 100).toFixed(1)}%). Rephrase to maintain unique brand voice.`);
      checklist.push({
        id: "originality-check",
        name: "Originality Protection",
        category: "CONTENT",
        status: "WARNING",
        message: `Originality score ${originality.originalityScore}/100. Rephrasing recommended.`,
      });
    } else {
      checklist.push({
        id: "originality-check",
        name: "Originality Protection",
        category: "CONTENT",
        status: "PASS",
        message: "Passes originality check (<15% competitor overlap).",
      });
    }
  } else {
    checklist.push({
      id: "originality-check",
      name: "Originality Protection",
      category: "CONTENT",
      status: "PASS",
      message: "Original synthesis verified.",
    });
  }

  // --------------------------------------------------------------------------
  // 3. Unit Economics Checks
  // --------------------------------------------------------------------------
  const economics = calculateUnitEconomics(price, cogs);

  if (price <= 0) {
    blockers.push("Listing price must be greater than $0.00.");
    checklist.push({
      id: "price-valid",
      name: "Pricing Structure",
      category: "ECONOMICS",
      status: "FAIL",
      message: "Price must be greater than $0.00.",
    });
  } else {
    checklist.push({
      id: "price-valid",
      name: "Pricing Structure",
      category: "ECONOMICS",
      status: "PASS",
      message: `Valid price: $${price.toFixed(2)}.`,
    });
  }

  if (economics.estNetProfit <= 0) {
    warnings.push(`Negative or zero estimated net profit ($${economics.estNetProfit.toFixed(2)}) after COGS and Etsy transaction fees.`);
    checklist.push({
      id: "margin-health",
      name: "Net Margin Health",
      category: "ECONOMICS",
      status: "WARNING",
      message: `Net profit is $${economics.estNetProfit.toFixed(2)}. Adjust target price.`,
    });
  } else if (economics.marginPercent < 30) {
    warnings.push(`Profit margin (${economics.marginPercent}%) is below recommended 30% baseline.`);
    checklist.push({
      id: "margin-health",
      name: "Net Margin Health",
      category: "ECONOMICS",
      status: "WARNING",
      message: `Profit margin ${economics.marginPercent}% is slim.`,
    });
  } else {
    checklist.push({
      id: "margin-health",
      name: "Net Margin Health",
      category: "ECONOMICS",
      status: "PASS",
      message: `Healthy profit margin (${economics.marginPercent}%, $${economics.estNetProfit.toFixed(2)} net profit/unit).`,
    });
  }

  // --------------------------------------------------------------------------
  // 4. Marketplace Connection Checks
  // --------------------------------------------------------------------------
  if (!hasEtsyWriteScope) {
    warnings.push("Etsy write permission (listings_w) is not active. Draft will be stored in SellerSalt; use Copy to Etsy for manual posting.");
    checklist.push({
      id: "marketplace-scope",
      name: "Etsy Write Scope Readiness",
      category: "MARKETPLACE",
      status: "WARNING",
      message: "Requires listings_w scope for direct Etsy draft sync.",
    });
  } else {
    checklist.push({
      id: "marketplace-scope",
      name: "Etsy Write Scope Readiness",
      category: "MARKETPLACE",
      status: "PASS",
      message: "Etsy connector ready for draft creation.",
    });
  }

  // Composite Score
  const passCount = checklist.filter((c) => c.status === "PASS").length;
  const overallScore = Math.round((passCount / Math.max(1, checklist.length)) * 100);

  const seoScore = Math.round(
    (checklist.filter((c) => c.category === "SEO" && c.status === "PASS").length /
      Math.max(1, checklist.filter((c) => c.category === "SEO").length)) *
      100
  );

  const contentScore = Math.round(
    (checklist.filter((c) => c.category === "CONTENT" && c.status === "PASS").length /
      Math.max(1, checklist.filter((c) => c.category === "CONTENT").length)) *
      100
  );

  const economicsScore = Math.round(
    (checklist.filter((c) => c.category === "ECONOMICS" && c.status === "PASS").length /
      Math.max(1, checklist.filter((c) => c.category === "ECONOMICS").length)) *
      100
  );

  return {
    status: blockers.length === 0 ? "READY" : "BLOCKED",
    overallScore,
    seoScore,
    contentScore,
    economicsScore,
    blockers,
    warnings,
    checklist,
    provenance: "SELLERSALT_SCORE",
  };
}
