/**
 * SellerSalt AI Originality & Anti-Duplication Protection Types
 */

export type OriginalityStatus = "PASSED" | "FLAGGED" | "REJECTED";

export interface SimilarityMatch {
  matchedPhrase: string;
  wordCount: number;
  sourceContext: string;
  draftContext: string;
  isExactMatch: boolean;
}

export interface OriginalityCheckResult {
  originalityScore: number; // 0–100% (100 = completely unique)
  status: OriginalityStatus;
  jaccardSimilarity: number; // 0–1.0 (Must be < 0.35 to pass)
  maxCommonSubstringLength: number; // max consecutive words matched (Must be <= 4 words)
  matches: SimilarityMatch[];
  trademarkAlerts: string[];
  evaluatedAt: string;
}

export interface OriginalityCheckInput {
  draftTitle: string;
  draftDescription: string;
  draftTags: string[];
  sourceTitle?: string;
  sourceDescription?: string;
  sourceTags?: string[];
}
