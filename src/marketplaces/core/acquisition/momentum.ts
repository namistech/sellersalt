/**
 * SellerSalt Unified Market Momentum Engine
 * 
 * Classifies market, product, keyword, category, and seller trajectory
 * into deterministic momentum states using empirical longitudinal observation history.
 * 
 * ZERO-FABRICATION RULE:
 * - Minimum observation requirement: n >= 2 historical snapshots separated in time.
 * - Single snapshot (n <= 1) strictly returns INSUFFICIENT_DATA with null deltas.
 * - Never fabricates growth percentages from a single point in time.
 */

import type { MomentumState } from "../discovery-types";
import type { MarketplaceId } from "../types";
import { LongitudinalIntelligenceEngine } from "./longitudinal";

export interface MarketMomentumReport {
  state: MomentumState;
  hasLongitudinalData: boolean;
  observationCount: number;
  deltaPercent: number | null;
  velocityDaily: number | null;
  explanation: string;
  evaluatedAt: Date;
}

export class MarketMomentumEngine {
  /**
   * Evaluates momentum for a product based on historical snapshots.
   */
  public static async evaluateProductMomentum(
    externalId: string,
    marketplace: MarketplaceId,
    organizationId?: string
  ): Promise<MarketMomentumReport> {
    const longIntel = await LongitudinalIntelligenceEngine.evaluateProduct(
      externalId,
      marketplace,
      organizationId
    );

    if (!longIntel.hasLongitudinalData || longIntel.observationCount <= 1) {
      return {
        state: "INSUFFICIENT_DATA",
        hasLongitudinalData: false,
        observationCount: longIntel.observationCount,
        deltaPercent: null,
        velocityDaily: null,
        explanation: "Single point observation: historical trajectory is unavailable without multi-snapshot time series.",
        evaluatedAt: new Date(),
      };
    }

    const vel = longIntel.reviewVelocityDaily ?? 0;
    const priceDeltaPct = longIntel.priceDeltaPercent ?? 0;

    let state: MomentumState = "STABLE";
    if (vel >= 1.0) {
      state = "ACCELERATING";
    } else if (vel > 0.2) {
      state = "RISING";
    } else if (vel === 0 && priceDeltaPct <= -10) {
      state = "COOLING";
    } else if (longIntel.persistenceTier === "STALE") {
      state = "DECLINING";
    }

    return {
      state,
      hasLongitudinalData: true,
      observationCount: longIntel.observationCount,
      deltaPercent: priceDeltaPct,
      velocityDaily: longIntel.reviewVelocityDaily,
      explanation: `${state} trajectory based on ${longIntel.observationCount} observations over ${longIntel.daysObserved} days.`,
      evaluatedAt: new Date(),
    };
  }

  /**
   * Evaluates momentum for a keyword term based on historical listing prevalence.
   */
  public static async evaluateKeywordMomentum(
    keyword: string,
    marketplace: MarketplaceId,
    organizationId?: string
  ): Promise<MarketMomentumReport> {
    const kwRes = await LongitudinalIntelligenceEngine.evaluateKeywordMomentum(
      keyword,
      marketplace,
      organizationId
    );

    if (!kwRes.hasLongitudinalData || kwRes.observationsCount <= 1) {
      return {
        state: "INSUFFICIENT_DATA",
        hasLongitudinalData: false,
        observationCount: kwRes.observationsCount,
        deltaPercent: null,
        velocityDaily: null,
        explanation: "Historical keyword prevalence trajectory requires >= 2 observation windows.",
        evaluatedAt: new Date(),
      };
    }

    const delta = kwRes.deltaPrevalencePercent ?? 0;
    let state: MomentumState = "STABLE";
    if (delta >= 10.0) {
      state = "ACCELERATING";
    } else if (delta >= 3.0) {
      state = "RISING";
    } else if (delta <= -10.0) {
      state = "DECLINING";
    } else if (delta <= -3.0) {
      state = "COOLING";
    }

    return {
      state,
      hasLongitudinalData: true,
      observationCount: kwRes.observationsCount,
      deltaPercent: delta,
      velocityDaily: null,
      explanation: `${state} keyword momentum with ${delta > 0 ? "+" : ""}${delta}% listing prevalence shift.`,
      evaluatedAt: new Date(),
    };
  }
}
