/**
 * SellerSalt Deterministic Opportunity Detection Engine
 * 
 * Evaluates candidate market observations against deterministic detection rules
 * to identify high-value ecommerce opportunities with explicit provenance and evidence.
 */

import type {
  AutonomousOpportunityType,
  AutonomousOpportunityItem,
  OpportunitySignalTaxonomy,
  StructuredOpportunityExplanation,
} from "@/marketplaces/core/autonomous-discovery-types";
import type { NormalizedProduct, MarketplaceId } from "@/marketplaces/core/types";
import { EntityResolutionEngine } from "./entity-resolution-engine";
import { OpportunityScoring3Engine } from "./opportunity-scoring-3";
import { OpportunityConfidenceEngine } from "./opportunity-confidence";
import { evaluateFreshness } from "@/marketplaces/core/acquisition/freshness";

export class OpportunityDetectorEngine {
  /**
   * Detects and constructs an AutonomousOpportunityItem from product and market signals.
   */
  public static detectProductOpportunity(
    product: NormalizedProduct,
    signals: OpportunitySignalTaxonomy,
    options: {
      daysObserved?: number;
      observationCount?: number;
      matchedMarketplaces?: MarketplaceId[];
    } = {}
  ): AutonomousOpportunityItem {
    const canonicalId = EntityResolutionEngine.generateProductId(product.marketplace, product.externalId);
    const score = OpportunityScoring3Engine.evaluateScore(signals);
    const confidence = OpportunityConfidenceEngine.evaluate(signals, {
      observationCount: options.observationCount || 1,
      marketplaceCount: options.matchedMarketplaces?.length || 1,
      daysObserved: options.daysObserved || 0,
    });

    // Determine specific opportunity type
    let type: AutonomousOpportunityType = "EMERGING_PRODUCT";
    let whyFound = "Observed product listing shows viable commercial signals.";
    const observedEvidence: string[] = [];
    const derivedSignals: string[] = [];

    if (product.price !== null && product.price !== undefined) {
      observedEvidence.push(`Observed listing price is $${product.price.toFixed(2)}.`);
    }
    if (product.reviewCount !== null && product.reviewCount !== undefined) {
      observedEvidence.push(`Observed review count is ${product.reviewCount}.`);
    }
    if (product.shop?.name) {
      observedEvidence.push(`Sold by merchant "${product.shop.name}" on ${product.marketplace}.`);
    }

    const hhi = signals.competition.sellerConcentrationHHI.value;
    const momStatus = signals.market.marketMomentumStatus.value;
    const underAttrs = signals.differentiation.underrepresentedAttributes;

    if (options.matchedMarketplaces && options.matchedMarketplaces.length >= 2) {
      type = "CROSS_MARKETPLACE_OPPORTUNITY";
      whyFound = `Corroborated across multiple marketplaces (${options.matchedMarketplaces.join(", ")}).`;
      derivedSignals.push("Cross-marketplace presence indicates multi-channel product demand.");
    } else if (momStatus === "ACCELERATING" || momStatus === "RISING") {
      type = "MOMENTUM_OPPORTUNITY";
      whyFound = `Product demonstrates accelerating review velocity (${signals.demand.observedReviewVelocityDaily.value ?? ">0.5"} reviews/day).`;
      derivedSignals.push("Positive engagement trajectory over recent observation windows.");
    } else if (underAttrs.length >= 2) {
      type = "DIFFERENTIATION_OPPORTUNITY";
      whyFound = `Market shows differentiation gap in attributes (${underAttrs.slice(0, 2).join(", ")}).`;
      derivedSignals.push("Underrepresented attributes provide product positioning advantage.");
    } else if (hhi !== null && hhi < 1500) {
      type = "LOW_CONCENTRATION_MARKET";
      whyFound = `Low seller concentration (HHI: ${hhi}) indicating an open market.`;
      derivedSignals.push("Lack of dominant incumbent monopoly opens entry for new sellers.");
    } else if ((options.daysObserved ?? 0) >= 7 && score.compositeScore >= 70) {
      type = "PERSISTENT_PRODUCT";
      whyFound = `Maintained high commercial opportunity score across ${options.daysObserved} days of tracking.`;
    }

    let verdict: StructuredOpportunityExplanation["verdict"] = "WORTH_INVESTIGATING";
    if (score.compositeScore >= 75 && confidence.confidenceScore >= 60) {
      verdict = "HIGH_OPPORTUNITY";
    } else if (score.compositeScore < 45) {
      verdict = "WEAK_SIGNALS";
    }

    const explanation: StructuredOpportunityExplanation = {
      whatIsIt: `${product.title} on ${product.marketplace.toUpperCase()}`,
      whyFound,
      observedEvidence,
      derivedSignals,
      unknowns: confidence.unknownSignals,
      whyAttractive: [
        `Opportunity score of ${score.compositeScore}/100 with ${confidence.confidenceTier.toLowerCase()} confidence.`,
        "Balanced price point and manageable competition density.",
      ],
      potentialRisks: [
        "Public sample bounds may not capture all private seller listings.",
        "Supplier manufacturing costs must be validated before launch.",
      ],
      recommendedNextAction: "Run deep Product Validation or view unit economics.",
      verdict,
    };

    const now = new Date();

    return {
      id: `opp:${type.toLowerCase()}:${canonicalId}`,
      canonicalEntityId: canonicalId,
      type,
      title: product.title,
      subtitle: product.categoryPath ? product.categoryPath.join(" > ") : `${product.marketplace.toUpperCase()} Listing`,
      marketplace: product.marketplace,
      marketplaces: options.matchedMarketplaces || [product.marketplace],
      category: product.categoryPath ? product.categoryPath.join(" > ") : undefined,
      score,
      confidence,
      explanation,
      signals,
      momentum: (momStatus as any) || "STABLE",
      firstObservedAt: product.capturedAt || now,
      lastObservedAt: product.capturedAt || now,
      observationCount: options.observationCount || 1,
      freshness: evaluateFreshness(product.capturedAt || now, "general"),
    };
  }

  /**
   * Detects a keyword opportunity from harvested search terms.
   */
  public static detectKeywordOpportunity(
    term: string,
    marketplace: MarketplaceId | "all",
    signals: OpportunitySignalTaxonomy,
    options: {
      prevalencePercent: number;
      velocityDelta?: number;
      category?: string;
      observationCount?: number;
    }
  ): AutonomousOpportunityItem {
    const canonicalId = EntityResolutionEngine.generateKeywordId(term);
    const score = OpportunityScoring3Engine.evaluateScore(signals);
    const confidence = OpportunityConfidenceEngine.evaluate(signals, {
      observationCount: options.observationCount || 5,
    });

    const isRising = (options.velocityDelta ?? 0) > 10;
    const type: AutonomousOpportunityType = isRising ? "RISING_KEYWORD" : "NICHE_OPPORTUNITY";

    const explanation: StructuredOpportunityExplanation = {
      whatIsIt: `Keyword "${term}" in ${options.category || "General Catalog"}`,
      whyFound: isRising
        ? `Keyword prevalence expanded by +${options.velocityDelta}% in recent observations.`
        : `High listing prevalence (${options.prevalencePercent}%) across observed products.`,
      observedEvidence: [
        `Appears in ${options.prevalencePercent}% of observed market listings.`,
        `Identified on ${marketplace.toUpperCase()} catalog search.`,
      ],
      derivedSignals: [
        "Strong semantic alignment with active buyer product listings.",
      ],
      unknowns: confidence.unknownSignals,
      whyAttractive: [
        `Opportunity score ${score.compositeScore}/100.`,
        "Strong keyword anchor for listing SEO and product positioning.",
      ],
      potentialRisks: [
        "Search frequency volume requires licensed feed confirmation.",
      ],
      recommendedNextAction: "Harvest long-tail keyword variations in Keyword Research.",
      verdict: score.compositeScore >= 70 ? "HIGH_OPPORTUNITY" : "WORTH_INVESTIGATING",
    };

    const now = new Date();

    return {
      id: `opp:${type.toLowerCase()}:${canonicalId}`,
      canonicalEntityId: canonicalId,
      type,
      title: term,
      subtitle: `${options.prevalencePercent}% market listing prevalence`,
      marketplace,
      marketplaces: marketplace === "all" ? ["etsy", "amazon", "ebay", "walmart"] : [marketplace],
      category: options.category,
      score,
      confidence,
      explanation,
      signals,
      momentum: isRising ? "RISING" : "STABLE",
      firstObservedAt: now,
      lastObservedAt: now,
      observationCount: options.observationCount || 5,
      freshness: evaluateFreshness(now, "general"),
    };
  }
}
