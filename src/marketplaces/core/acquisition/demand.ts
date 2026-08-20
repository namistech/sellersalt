/**
 * SellerSalt Product Demand Intelligence Engine
 * 
 * Computes deterministic demand proxy scores and engagement metrics from legitimate
 * observable marketplace signals (listing freshness, reviews, favorites, persistence).
 * 
 * STRICT PROVENANCE & ZERO-FABRICATION:
 * - Signal types are explicitly classified: OBSERVED vs ESTIMATED vs DERIVED vs UNAVAILABLE.
 * - Never fabricates exact monthly search volume or exact unit sales.
 */

import type { NormalizedProduct, SignalProvenance } from "../types";

export interface DemandSignalItem {
  name: string;
  label: string;
  value: number | string | null;
  provenance: SignalProvenance;
  description: string;
}

export interface ProductDemandProfile {
  demandProxyScore: number | null; // 0 - 100
  demandTier: "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
  confidence: number; // 0 - 100
  observedSignals: DemandSignalItem[];
  derivedSignals: DemandSignalItem[];
  unavailableSignals: string[];
  summary: string;
}

export class ProductDemandEngine {
  /**
   * Evaluates demand proxy intelligence from a normalized product.
   */
  public static evaluateDemand(product: NormalizedProduct): ProductDemandProfile {
    const observedSignals: DemandSignalItem[] = [];
    const derivedSignals: DemandSignalItem[] = [];
    const unavailableSignals: string[] = [];

    let scoreAccumulator = 0;
    let weightTotal = 0;
    let confidenceAccumulator = 0;

    // 1. Review Volume (Observed)
    if (product.reviewCount !== null && product.reviewCount !== undefined) {
      observedSignals.push({
        name: "reviewCount",
        label: "Observed Reviews",
        value: product.reviewCount,
        provenance: "ACTUAL_DATA",
        description: `${product.reviewCount} verified buyer reviews recorded.`,
      });

      let revScore = 0;
      if (product.reviewCount >= 500) revScore = 100;
      else if (product.reviewCount >= 100) revScore = 80;
      else if (product.reviewCount >= 25) revScore = 60;
      else if (product.reviewCount > 0) revScore = 40;
      else revScore = 20;

      scoreAccumulator += revScore * 0.35;
      weightTotal += 0.35;
      confidenceAccumulator += 30;
    } else {
      unavailableSignals.push("Review volume unobserved on source listing card");
    }

    // 2. Buyer Rating (Observed)
    if (product.rating !== null && product.rating !== undefined) {
      observedSignals.push({
        name: "rating",
        label: "Buyer Rating",
        value: product.rating,
        provenance: "ACTUAL_DATA",
        description: `${product.rating.toFixed(1)} star buyer rating.`,
      });

      const ratScore = Math.min(100, Math.max(0, ((product.rating - 3.0) / 2.0) * 100));
      scoreAccumulator += ratScore * 0.25;
      weightTotal += 0.25;
      confidenceAccumulator += 25;
    } else {
      unavailableSignals.push("Buyer rating unobserved");
    }

    // 3. Favorites / Wishlist Count (Observed)
    if (product.favoritesCount !== null && product.favoritesCount !== undefined) {
      observedSignals.push({
        name: "favoritesCount",
        label: "Observed Favorites / Saves",
        value: product.favoritesCount,
        provenance: "ACTUAL_DATA",
        description: `${product.favoritesCount} buyer saves recorded.`,
      });

      const favScore = product.favoritesCount >= 500 ? 100 : product.favoritesCount >= 100 ? 80 : 40;
      scoreAccumulator += favScore * 0.20;
      weightTotal += 0.20;
      confidenceAccumulator += 25;
    }

    // 4. Listing Velocity / Engagement Proxy (Derived)
    const reviewVelocity = product.shop?.reviewVelocity ?? null;
    if (reviewVelocity !== null) {
      derivedSignals.push({
        name: "reviewVelocity",
        label: "Review Velocity Rate",
        value: `${reviewVelocity} rev/mo`,
        provenance: "SELLERSALT_SCORE",
        description: "Estimated monthly review accumulation pace.",
      });

      const velScore = reviewVelocity >= 10 ? 90 : reviewVelocity >= 3 ? 70 : 40;
      scoreAccumulator += velScore * 0.20;
      weightTotal += 0.20;
      confidenceAccumulator += 20;
    }

    // Search volume is ALWAYS unavailable without external volume provider
    unavailableSignals.push("Exact monthly search query volume unavailable (Zero-Fabrication Contract)");

    if (weightTotal === 0) {
      return {
        demandProxyScore: null,
        demandTier: "UNAVAILABLE",
        confidence: 0,
        observedSignals,
        derivedSignals,
        unavailableSignals,
        summary: "Insufficient observable demand signals on public product listing.",
      };
    }

    const demandProxyScore = Math.round(scoreAccumulator / weightTotal);
    const confidence = Math.min(100, confidenceAccumulator);

    const demandTier =
      demandProxyScore >= 75 ? "HIGH" : demandProxyScore >= 50 ? "MODERATE" : "LOW";

    const summary = `${demandTier} demand proxy (${demandProxyScore}/100) derived from ${observedSignals.length} observed signals with ${confidence}% confidence.`;

    return {
      demandProxyScore,
      demandTier,
      confidence,
      observedSignals,
      derivedSignals,
      unavailableSignals,
      summary,
    };
  }
}
