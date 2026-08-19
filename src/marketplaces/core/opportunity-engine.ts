// Centralized, marketplace-neutral opportunity scoring envelope. Wraps the
// existing deterministic scoring functions in
// src/services/intelligence/universal-scoring.ts (kept in place — this does
// not replace them, it standardizes how their output is reported) rather
// than reimplementing scoring logic, so behavior for existing callers is
// unchanged.
//
// The rule this file exists to enforce: a factor with no real data behind it
// is marked `available: false` and excluded from the weighted score — it is
// never defaulted to a fabricated number. See `factor()` below.

import {
  evaluateProductOpportunity,
  evaluateShopCompetition,
  type UniversalScoreResult,
  type ScoreFactorBreakdown,
} from "@/services/intelligence/universal-scoring";
import type { MarketplaceId } from "./types";

export interface OpportunityFactor {
  id: string;
  name: string;
  available: boolean;
  weight: number;
  score: number | null;
  explanation: string;
}

export interface OpportunityScore {
  score: number | null;
  factors: OpportunityFactor[];
  confidence: number;
  dataSources: MarketplaceId[];
  calculatedAt: Date;
}

function factorFromBreakdown(b: ScoreFactorBreakdown): OpportunityFactor {
  return {
    id: b.id,
    name: b.name,
    available: true,
    weight: b.weight,
    score: b.score,
    explanation: b.explanation,
  };
}

function unavailableFactor(id: string, name: string, weight: number, reason: string): OpportunityFactor {
  return { id, name, available: false, weight, score: null, explanation: reason };
}

function wrap(result: UniversalScoreResult, marketplace: MarketplaceId, extraUnavailable: OpportunityFactor[] = []): OpportunityScore {
  const factors = [...result.factors.map(factorFromBreakdown), ...extraUnavailable];
  const availableCount = factors.filter((f) => f.available).length;
  // Confidence reflects how much of the intended factor set actually had
  // real data, not just the model's own self-reported confidenceScore —
  // more factors missing should always read as lower confidence.
  const completeness = factors.length ? availableCount / factors.length : 0;
  const confidence = Math.round(result.confidenceScore * completeness);

  return {
    score: result.score,
    factors,
    confidence,
    dataSources: [marketplace],
    calculatedAt: new Date(),
  };
}

/**
 * Product-level opportunity score. `categoryMedianPrice` is optional in the
 * underlying engine but genuinely used by it (price-stability framing in the
 * explanation text) — when the caller doesn't have it, we say so explicitly
 * as an unavailable factor rather than silently proceeding as if pricing
 * context were considered.
 */
export function scoreProductOpportunity(params: {
  marketplace: MarketplaceId;
  price: number;
  estDailySales: number;
  shopReviewCount: number;
  listingAgeDays: number;
  numFavorers?: number;
  categoryMedianPrice?: number;
}): OpportunityScore {
  const result = evaluateProductOpportunity(params);
  const extra: OpportunityFactor[] = [];
  if (params.categoryMedianPrice === undefined) {
    extra.push(
      unavailableFactor(
        "price_stability",
        "Category Price Stability",
        0,
        "No category median price supplied for this marketplace/category — price-stability signal is unavailable, not estimated."
      )
    );
  }
  return wrap(result, params.marketplace, extra);
}

export function scoreShopCompetition(params: {
  marketplace: MarketplaceId;
  shopName: string;
  totalSales: number;
  reviewCount: number;
  activeListings: number;
  shopAgeMonths: number;
  estDailySales: number;
}): OpportunityScore {
  const result = evaluateShopCompetition(params);
  return wrap(result, params.marketplace);
}
