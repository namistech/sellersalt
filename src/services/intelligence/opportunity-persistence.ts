/**
 * SellerSalt Opportunity Persistence & Longitudinal Intelligence Engine
 * 
 * Tracks how commercial opportunities evolve over time and distinguishes transient spikes
 * from persistent, validated market opportunities based on longitudinal evidence.
 * 
 * TIERS:
 * - NEW_OPPORTUNITY: First observation window
 * - EMERGING_OPPORTUNITY: 2-3 snapshots showing upward score/demand velocity
 * - PERSISTENT_OPPORTUNITY: Maintained high opportunity score (>= 70) over >= 7 days
 * - IMPROVING_OPPORTUNITY: Upward trajectory across consecutive observation intervals
 * - DETERIORATING_OPPORTUNITY: Falling score or expanding competitor dominance
 * - SATURATED_OPPORTUNITY: Intense seller concentration and price erosion
 * - INSUFFICIENT_HISTORY: Single observation point
 */

export type OpportunityPersistenceTier =
  | "NEW_OPPORTUNITY"
  | "EMERGING_OPPORTUNITY"
  | "PERSISTENT_OPPORTUNITY"
  | "IMPROVING_OPPORTUNITY"
  | "DETERIORATING_OPPORTUNITY"
  | "SATURATED_OPPORTUNITY"
  | "INSUFFICIENT_HISTORY";

export interface OpportunityHistoryRecord {
  opportunityId: string;
  targetTitle: string;
  marketplace: string;
  persistenceTier: OpportunityPersistenceTier;
  currentScore: number | null;
  initialScore: number | null;
  scoreDelta: number | null;
  observationCount: number;
  daysTracked: number;
  firstObservedAt: Date;
  lastObservedAt: Date;
  stabilityScore: number; // 0-100
  historyPoints: Array<{
    observedAt: Date;
    score: number | null;
    confidence: number;
    verdict?: string;
  }>;
  explanation: string;
}

export class OpportunityPersistenceEngine {
  /**
   * Evaluates longitudinal opportunity persistence from a series of historical observation snapshots.
   */
  public static evaluatePersistence(params: {
    opportunityId: string;
    targetTitle: string;
    marketplace: string;
    observations: Array<{
      observedAt: Date;
      score: number | null;
      confidence: number;
      verdict?: string;
    }>;
  }): OpportunityHistoryRecord {
    const { opportunityId, targetTitle, marketplace, observations } = params;
    const now = new Date();

    const sorted = observations
      .filter((o) => o.observedAt && o.score !== null)
      .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());

    if (sorted.length <= 1) {
      const single = sorted[0];
      return {
        opportunityId,
        targetTitle,
        marketplace,
        persistenceTier: "INSUFFICIENT_HISTORY",
        currentScore: single?.score ?? null,
        initialScore: single?.score ?? null,
        scoreDelta: null,
        observationCount: sorted.length,
        daysTracked: 0,
        firstObservedAt: single ? new Date(single.observedAt) : now,
        lastObservedAt: single ? new Date(single.observedAt) : now,
        stabilityScore: 50,
        historyPoints: sorted,
        explanation: "Single point observation: opportunity persistence requires longitudinal tracking.",
      };
    }

    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const daysTracked = Math.max(1, Math.round((new Date(latest.observedAt).getTime() - new Date(first.observedAt).getTime()) / (1000 * 60 * 60 * 24)));

    const scoreDelta = (latest.score ?? 0) - (first.score ?? 0);
    const avgScore = sorted.reduce((acc, s) => acc + (s.score ?? 0), 0) / sorted.length;

    let tier: OpportunityPersistenceTier = "EMERGING_OPPORTUNITY";
    let explanation = `Emerging opportunity observed across ${sorted.length} snapshots.`;

    if (daysTracked >= 7 && avgScore >= 70) {
      tier = "PERSISTENT_OPPORTUNITY";
      explanation = `Persistent high-performing opportunity verified over ${daysTracked} days across ${sorted.length} observations.`;
    } else if (scoreDelta >= 10) {
      tier = "IMPROVING_OPPORTUNITY";
      explanation = `Opportunity score improved by +${scoreDelta} points across observation intervals.`;
    } else if (scoreDelta <= -15) {
      tier = "DETERIORATING_OPPORTUNITY";
      explanation = `Opportunity score declined by ${scoreDelta} points as competition expanded.`;
    } else if (sorted.length >= 3 && avgScore < 40) {
      tier = "SATURATED_OPPORTUNITY";
      explanation = `High competition density and low opportunity scores suggest a saturated niche.`;
    }

    // Stability Score calculation based on variance
    const variance = sorted.reduce((acc, s) => acc + Math.pow((s.score ?? 0) - avgScore, 2), 0) / sorted.length;
    const stabilityScore = Math.max(10, Math.min(100, Math.round(100 - Math.sqrt(variance))));

    return {
      opportunityId,
      targetTitle,
      marketplace,
      persistenceTier: tier,
      currentScore: latest.score,
      initialScore: first.score,
      scoreDelta,
      observationCount: sorted.length,
      daysTracked,
      firstObservedAt: new Date(first.observedAt),
      lastObservedAt: new Date(latest.observedAt),
      stabilityScore,
      historyPoints: sorted,
      explanation,
    };
  }
}
