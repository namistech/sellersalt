/**
 * SellerSalt Deterministic Opportunity Ranking Engine
 * 
 * Orders candidate opportunities deterministically based on merchant strategy modes.
 */

import type {
  AutonomousOpportunityItem,
  OpportunityRankingMode,
} from "@/marketplaces/core/autonomous-discovery-types";

export class OpportunityRankingEngine {
  /**
   * Sorts an array of opportunities deterministically using the selected ranking mode.
   */
  public static rank(
    opportunities: AutonomousOpportunityItem[],
    mode: OpportunityRankingMode = "BEST_OPPORTUNITIES"
  ): AutonomousOpportunityItem[] {
    const list = [...opportunities];

    list.sort((a, b) => {
      let diff = 0;

      switch (mode) {
        case "FASTEST_RISING": {
          const momWeight = (m: string) =>
            m === "ACCELERATING" ? 3 : m === "RISING" ? 2 : m === "STABLE" ? 1 : 0;
          diff = momWeight(b.momentum) - momWeight(a.momentum);
          if (diff === 0) diff = b.score.compositeScore - a.score.compositeScore;
          break;
        }

        case "LOWEST_COMPETITION": {
          diff =
            b.score.competitionAttractivenessScore -
            a.score.competitionAttractivenessScore;
          if (diff === 0) diff = b.score.compositeScore - a.score.compositeScore;
          break;
        }

        case "BEST_DIFFERENTIATION": {
          diff = b.score.differentiationScore - a.score.differentiationScore;
          if (diff === 0) diff = b.score.compositeScore - a.score.compositeScore;
          break;
        }

        case "BEST_PRICE_GAP": {
          diff = b.score.pricePositioningScore - a.score.pricePositioningScore;
          if (diff === 0) diff = b.score.compositeScore - a.score.compositeScore;
          break;
        }

        case "MOST_PERSISTENT": {
          diff = b.observationCount - a.observationCount;
          if (diff === 0) diff = b.score.compositeScore - a.score.compositeScore;
          break;
        }

        case "NEWEST_EMERGING": {
          diff =
            new Date(b.firstObservedAt).getTime() -
            new Date(a.firstObservedAt).getTime();
          if (diff === 0) diff = b.score.compositeScore - a.score.compositeScore;
          break;
        }

        case "CROSS_MARKETPLACE": {
          diff = b.marketplaces.length - a.marketplaces.length;
          if (diff === 0) diff = b.score.compositeScore - a.score.compositeScore;
          break;
        }

        case "BEST_OPPORTUNITIES":
        default: {
          diff = b.score.compositeScore - a.score.compositeScore;
          if (diff === 0) {
            diff = b.confidence.confidenceScore - a.confidence.confidenceScore;
          }
          if (diff === 0) {
            diff = b.observationCount - a.observationCount;
          }
          break;
        }
      }

      // Deterministic tie-breaker
      if (diff === 0) {
        return a.canonicalEntityId.localeCompare(b.canonicalEntityId);
      }

      return diff;
    });

    return list;
  }
}
