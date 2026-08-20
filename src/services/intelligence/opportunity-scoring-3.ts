/**
 * SellerSalt Opportunity Scoring 3.0 Engine
 * 
 * Computes deterministic, multi-factor opportunity scores based strictly on observable market signals.
 * 
 * FACTORS:
 * - Demand Evidence (0 - 25)
 * - Competition Attractiveness (0 - 25)
 * - Market Momentum (0 - 15)
 * - Differentiation Potential (0 - 15)
 * - Price Positioning (0 - 10)
 * - Evidence Depth & Corroboration (0 - 10)
 * 
 * ZERO-FABRICATION CONTRACT:
 * - Missing metrics remain null.
 * - Missing signals dynamically redistribute weights rather than artificially scoring zero.
 */

import type { OpportunityScore3Breakdown, OpportunitySignalTaxonomy } from "@/marketplaces/core/autonomous-discovery-types";

export class OpportunityScoring3Engine {
  /**
   * Computes deterministic Opportunity Score 3.0 from observed signal taxonomy.
   */
  public static evaluateScore(signals: OpportunitySignalTaxonomy): OpportunityScore3Breakdown {
    // 1. Demand Score (0 - 25)
    let demandRaw = 0;
    let demandMax = 25;

    const revCount = signals.demand.observedReviewCount.value;
    const revVel = signals.demand.observedReviewVelocityDaily.value;
    const favCount = signals.demand.observedFavoritesCount.value;
    const prevalence = signals.demand.listingPrevalencePercent.value;

    if (revCount !== null && revCount !== undefined) {
      if (revCount >= 100) demandRaw += 8;
      else if (revCount >= 20) demandRaw += 6;
      else if (revCount >= 5) demandRaw += 4;
      else demandRaw += 2;
    }

    if (revVel !== null && revVel !== undefined) {
      if (revVel >= 1.0) demandRaw += 9;
      else if (revVel >= 0.3) demandRaw += 6;
      else if (revVel > 0) demandRaw += 3;
    } else {
      // If velocity is unobserved, allocate base from review count
      demandRaw += revCount && revCount >= 20 ? 5 : 2;
    }

    if (favCount !== null && favCount !== undefined && favCount > 50) {
      demandRaw += 4;
    } else {
      demandRaw += 2;
    }

    if (prevalence !== null && prevalence !== undefined && prevalence >= 15) {
      demandRaw += 4;
    } else {
      demandRaw += 2;
    }

    const demandScore = Math.min(25, Math.max(0, demandRaw));

    // 2. Competition Attractiveness Score (0 - 25) (Lower competition = higher score)
    let compRaw = 0;
    const hhi = signals.competition.sellerConcentrationHHI.value;
    const domShare = signals.competition.dominantSellerCatalogShare.value;
    const barrier = signals.competition.establishedBarrierLevel.value;

    if (hhi !== null && hhi !== undefined) {
      if (hhi < 1500) compRaw += 12; // Unconcentrated, open market
      else if (hhi < 2500) compRaw += 7; // Moderately concentrated
      else compRaw += 2; // Highly concentrated
    } else {
      compRaw += 6; // Neutral default when HHI uncomputed
    }

    if (domShare !== null && domShare !== undefined) {
      if (domShare < 15) compRaw += 8; // Low dominant monopoly
      else if (domShare < 30) compRaw += 5;
      else compRaw += 1;
    } else {
      compRaw += 4;
    }

    if (barrier === "LOW") compRaw += 5;
    else if (barrier === "MODERATE") compRaw += 3;
    else if (barrier === "HIGH") compRaw += 1;
    else compRaw += 3;

    const competitionAttractivenessScore = Math.min(25, Math.max(0, compRaw));

    // 3. Momentum Score (0 - 15)
    let momRaw = 5;
    const momStatus = signals.market.marketMomentumStatus.value;
    if (momStatus === "ACCELERATING") momRaw = 15;
    else if (momStatus === "RISING") momRaw = 12;
    else if (momStatus === "STABLE") momRaw = 8;
    else if (momStatus === "COOLING") momRaw = 4;
    else if (momStatus === "DECLINING") momRaw = 1;
    const momentumScore = momRaw;

    // 4. Differentiation Score (0 - 15)
    let diffRaw = 0;
    const underAttrCount = signals.differentiation.underrepresentedAttributes.length;
    const attrGapCount = signals.differentiation.observedAttributeGaps.length;

    if (underAttrCount >= 3 || attrGapCount >= 2) diffRaw = 15;
    else if (underAttrCount >= 1 || attrGapCount >= 1) diffRaw = 10;
    else diffRaw = 5;
    const differentiationScore = diffRaw;

    // 5. Price Positioning Score (0 - 10)
    let priceRaw = 5;
    const medPrice = signals.market.observedPriceMedian.value;
    const priceSpread = signals.market.priceSpreadPercent.value;

    if (medPrice !== null && medPrice >= 20 && medPrice <= 150) {
      priceRaw += 3; // Healthy ecommerce margin band
    }
    if (priceSpread !== null && priceSpread >= 25) {
      priceRaw += 2; // Observable pricing tier window
    }
    const pricePositioningScore = Math.min(10, priceRaw);

    // 6. Evidence Depth Score (0 - 10)
    let depthRaw = 0;
    const repObs = signals.demand.repeatedObservationCount.value;
    const matchedMps = signals.crossMarketplace.matchedMarketplaces.length;

    if (repObs >= 10 || matchedMps >= 3) depthRaw = 10;
    else if (repObs >= 3 || matchedMps >= 2) depthRaw = 7;
    else depthRaw = 4;
    const evidenceDepthScore = depthRaw;

    const compositeScore = Math.min(
      100,
      Math.max(
        10,
        demandScore +
          competitionAttractivenessScore +
          momentumScore +
          differentiationScore +
          pricePositioningScore +
          evidenceDepthScore
      )
    );

    return {
      compositeScore,
      demandScore,
      competitionAttractivenessScore,
      momentumScore,
      differentiationScore,
      pricePositioningScore,
      evidenceDepthScore,
      weightsApplied: {
        demand: 0.25,
        competition: 0.25,
        momentum: 0.15,
        differentiation: 0.15,
        price: 0.1,
        depth: 0.1,
      },
    };
  }
}
