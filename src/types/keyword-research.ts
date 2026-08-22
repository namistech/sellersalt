/**
 * SellerSalt Keyword Research Domain Contracts
 *
 * Canonical types for standalone keyword search, tag harvesting,
 * multi-tier tail classifications, competition ratings, and external
 * search volume abstractions.
 */
import type { SignalProvenance, DataSourceType } from "@/marketplaces/core/types";

/**
 * Batch 40: minimal field-level provenance record — same shape as
 * src/marketplaces/core/types.ts's FieldProvenanceRecord (Product
 * Research's existing provenance architecture), reused here rather than
 * inventing a second shape. `value: null` pairs with `provenance:
 * "UNAVAILABLE"` — the frontend never has to guess why a field is null.
 */
export interface KeywordFieldProvenance<T> {
  value: T;
  provenance: SignalProvenance;
  source: DataSourceType;
  observedAt: string;
}

export interface KeywordSearchRequest {
  query: string;
  categoryTaxonomyId?: number;
  minPrice?: number;
  maxPrice?: number;
  limit?: number; // Default: 50
  /** Which marketplace to research — defaults to "etsy" server-side when
   * omitted; "all" fans out across every registered connector. See
   * src/marketplaces/core/types.ts's MarketplaceId. */
  marketplace?: string;
  /** Batch 40: optional additional keywords (comma-split by the UI),
   * OR-fanout with `query`, bounded to 5 total, deduped by term. Mirrors
   * Batch 38's Product Research multi-keyword search — never silently
   * merged into one synthetic combined term. */
  keywords?: string[];
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
  // Batch 40: null on marketplaces with no "favorites" concept in their
  // observable public markup (Amazon, Walmart) — was previously
  // hardcoded 0 for every non-Etsy marketplace, a fabricated value.
  avgFavorers: number | null; // [ESTIMATED], Etsy only
  /** Which marketplace this response was actually researched against —
   * required so UI copy/badges can be marketplace-aware instead of
   * hardcoding "Etsy" for every response. */
  marketplace?: string;
  competitionLevel: KeywordCompetitionRating; // [SELLERSALT SCORE]
  competitionScore: number; // 0 - 100 [SELLERSALT SCORE]
  dominantCategoryName?: string;
  searchVolume?: number | null;
  externalMonthlyVolume?: number;
  searchVolumeStatus?: string;
  searchVolumeMessage?: string;
  searchVolumeProvenance?: string;
  /** Batch 40 (P1 #4): explicit provenance for the two fields whose
   * availability genuinely varies by marketplace — avgPrice is a real
   * observation everywhere; avgFavorers only exists where the source
   * marketplace has a "favorites" concept (Etsy) and is UNAVAILABLE
   * (never a fabricated 0) elsewhere. Additive/optional — existing
   * consumers reading the raw avgPrice/avgFavorers fields are unaffected. */
  fieldProvenance?: {
    avgPrice: KeywordFieldProvenance<number>;
    avgFavorers: KeywordFieldProvenance<number | null>;
    searchVolume?: KeywordFieldProvenance<number | null>;
  };
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
  /** Batch 40: which marketplace actually produced this response — the
   * UI must key its badges/copy off this, never assume Etsy. */
  marketplace?: string;
  /** Batch 40: keywords actually searched for (multi-keyword OR-fanout,
   * bounded to 5) — present when the request supplied more than one. */
  matchedKeywords?: string[];
}
