/**
 * SellerSalt SEO Diagnostics & Audit Domain Types
 */

import type { ListingSeoAudit as PrismaListingSeoAudit } from "@prisma/client";

export type SeoIssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type SeoGrade = "A" | "B" | "C" | "D" | "F";

export interface SeoDiagnostic {
  code: string;
  severity: SeoIssueSeverity;
  title: string;
  message: string;
  recommendation: string;
  pointsDeducted: number;
}

export interface SeoRecommendation {
  id: string;
  category: "TITLE" | "TAGS" | "DESCRIPTION" | "ATTRIBUTES" | "TAXONOMY";
  title: string;
  action: string;
  impactScore: number;
  isAutomatedFixAvailable: boolean;
}

export interface SeoScoreBreakdown {
  overallScore: number; // 0–100 [SELLERSALT SCORE]
  grade: SeoGrade;
  titleScore: number; // 30 max
  tagScore: number; // 35 max
  keywordSynergyScore: number; // 15 max
  descriptionScore: number; // 10 max
  taxonomyScore: number; // 5 max
  attributeScore: number; // 5 max
}

export interface TagAnalysisItem {
  tag: string;
  charCount: number;
  isCompliant: boolean; // charCount <= 20
  wordCount: number;
  isInTitle: boolean;
}

export interface SeoTitleAnalysis {
  characterCount: number;
  score: number; // max 30
  isOptimalLength: boolean; // 120–140 chars
  hasHighIntentStart: boolean; // keywords in first 40 chars
  hasNaturalDelimiters: boolean; // pipe/comma delimiters
  detectedKeywords: string[];
  diagnostics: SeoDiagnostic[];
}

export interface SeoTagAnalysis {
  tagCount: number;
  score: number; // max 35
  isComplete: boolean; // 13 tags
  allCompliantLength: boolean; // all <= 20 chars
  longTailTagCount: number; // >= 2 words
  duplicateCount: number;
  tags: TagAnalysisItem[];
  diagnostics: SeoDiagnostic[];
}

export interface SeoSynergyAnalysis {
  score: number; // max 15
  exactMatchesCount: number;
  matchingPhrases: string[];
  missingFromTitle: string[];
  diagnostics: SeoDiagnostic[];
}

export interface SeoDescriptionAnalysis {
  score: number; // max 10
  characterCount: number;
  wordCount: number;
  hasFirst160Keyword: boolean;
  hasStructuredHeadings: boolean;
  diagnostics: SeoDiagnostic[];
}

export interface SeoTaxonomyAnalysis {
  score: number; // max 10 (5 taxonomy + 5 attributes)
  taxonomyId?: number;
  categoryPath?: string;
  isDeepTaxonomy: boolean;
  attributeCount: number;
  materialsCount: number;
  materials: string[];
  diagnostics: SeoDiagnostic[];
}

export interface CompleteListingSeoAudit {
  id?: string;
  listingId?: string;
  title: string;
  tags: string[];
  description: string;
  materials: string[];
  taxonomyId?: number;
  categoryPath?: string;
  imageUrl?: string | null;
  listingUrl?: string;
  shopName?: string;
  price?: number;
  overallScore: number; // 0–100 [SELLERSALT SCORE]
  grade: SeoGrade;
  breakdown: SeoScoreBreakdown;
  titleAnalysis: SeoTitleAnalysis;
  tagAnalysis: SeoTagAnalysis;
  synergyAnalysis: SeoSynergyAnalysis;
  descriptionAnalysis: SeoDescriptionAnalysis;
  taxonomyAnalysis: SeoTaxonomyAnalysis;
  diagnostics: SeoDiagnostic[];
  recommendations: SeoRecommendation[];
  auditedAt: string;
}

export interface ListingSeoAudit extends Omit<PrismaListingSeoAudit, "diagnostics" | "recommendations" | "beforeAfterState"> {
  diagnostics: SeoDiagnostic[];
  recommendations: SeoRecommendation[];
  beforeAfterState: {
    originalState?: Record<string, unknown>;
    proposedState?: Record<string, unknown>;
    projectedScore?: number;
  } | null;
}

export interface ListingSeoAuditInput {
  organizationId: string;
  plannerItemId?: string;
  listingDraftId?: string;
  sellerChannelId?: string;
  externalListingId?: string;

  title: string;
  description: string;
  tags: string[];
  materials?: string[];
  taxonomyId?: number;
  attributes?: Record<string, unknown>;
  imageUrl?: string;
  listingUrl?: string;
  shopName?: string;
  price?: number;
}
