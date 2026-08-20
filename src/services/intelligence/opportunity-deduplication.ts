/**
 * SellerSalt Opportunity Deduplication & Canonical Grouping Engine
 * 
 * Groups and merges duplicate opportunity candidates discovered across multiple queries,
 * seed categories, or research runs around canonical entity identifiers.
 */

import type { AutonomousOpportunityItem } from "@/marketplaces/core/autonomous-discovery-types";

export class OpportunityDeduplicationEngine {
  /**
   * Deduplicates candidate opportunities by canonical entity ID, aggregating observation evidence.
   */
  public static deduplicate(candidates: AutonomousOpportunityItem[]): AutonomousOpportunityItem[] {
    const map = new Map<string, AutonomousOpportunityItem>();

    for (const candidate of candidates) {
      const key = candidate.canonicalEntityId;
      const existing = map.get(key);

      if (!existing) {
        map.set(key, { ...candidate });
      } else {
        // Merge evidence and increase observation count
        existing.observationCount += candidate.observationCount;
        existing.lastObservedAt = new Date(
          Math.max(
            new Date(existing.lastObservedAt).getTime(),
            new Date(candidate.lastObservedAt).getTime()
          )
        );

        // Merge marketplaces
        const mergedMps = Array.from(
          new Set([...existing.marketplaces, ...candidate.marketplaces])
        );
        existing.marketplaces = mergedMps;
        if (mergedMps.length > 1) {
          existing.marketplace = "all";
        }

        // Merge evidence lists (unique only)
        const uniqueEvidence = Array.from(
          new Set([
            ...existing.explanation.observedEvidence,
            ...candidate.explanation.observedEvidence,
          ])
        );
        existing.explanation.observedEvidence = uniqueEvidence;

        // Keep highest score
        if (candidate.score.compositeScore > existing.score.compositeScore) {
          existing.score = candidate.score;
          existing.type = candidate.type;
        }

        // Improve confidence with larger aggregated sample
        if (candidate.confidence.confidenceScore > existing.confidence.confidenceScore) {
          existing.confidence = candidate.confidence;
        }
      }
    }

    return Array.from(map.values());
  }
}
