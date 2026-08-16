/**
 * SellerSalt Keyword Research Domain Contracts
 * 
 * Canonical types for standalone keyword search, tag harvesting,
 * multi-tier tail classifications, competition ratings, and external
 * search volume abstractions.
 */

export interface KeywordSearchRequest {
  query: string;
  categoryTaxonomyId?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number; // Default: 50
}

export type KeywordCompetitionRating = "VERY_LOW" | "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
export type KeywordTailClassification = "HEAD_TERM" | "MID_TAIL" | "LONG_TAIL";
export type KeywordIntentClassification = "PRODUCT_TYPE" | "RECIPIENT_OCCASION" | "MATERIAL_STYLE" | "GENERAL";
export type KeywordProvenanceType = "ETSY_EXTRACTED_TAG" | "TITLE_NGRAM" | "EXTERNAL_INDEX";

export interface KeywordSearchSummary {
  query: string;
  totalEtsySupply: number; // [ACTUAL ETSY DATA]
  sampledListingCount: number;
  avgPrice: number; // [ACTUAL ETSY DATA]
  avgFavorers: number; // [ESTIMATED]
  competitionLevel: KeywordCompetitionRating; // [SELLERSALT SCORE]
  competitionScore: number; // 0 - 100 [SELLERSALT SCORE]
  dominantCategoryName?: string;
}

export interface HarvestedKeyword {
  term: string;
  wordCount: number;
  charCount: number;
  isTagCompliant: boolean; // charCount <= 20 (Etsy tag limit)
  frequency: number; // occurrences in top listings
  percentage: number; // % of sampled listings containing this term
  relevanceScore: number; // 0 - 100 semantic token overlap
  estimatedDemandSignal: number; // [ESTIMATED] avg favorites of matching listings
  competitionLevel: KeywordCompetitionRating; // [SELLERSALT SCORE]
  competitionScore: number; // 0 - 100
  tailClassification: KeywordTailClassification;
  intentClassification: KeywordIntentClassification;
  externalMonthlyVolume?: number; // [EXTERNAL DATA]
  externalTrend?: number[]; // [EXTERNAL DATA]
  provenance: KeywordProvenanceType;
}

export interface ObservedListingEvidence {
  listingId: string;
  title: string;
  price: number;
  imageUrl: string | null;
  listingUrl: string;
  shopName: string;
  numFavorers: number;
  tags: string[];
}

export interface KeywordSearchResponse {
  query: string;
  summary: KeywordSearchSummary;
  keywords: HarvestedKeyword[];
  topListings: ObservedListingEvidence[];
  capturedAt: string;
}
