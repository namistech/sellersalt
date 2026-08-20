/**
 * SellerSalt Standardized Freshness Model
 * 
 * Tracks the temporal validity and degradation of commerce observations across
 * distinct metric domains (prices, reviews, taxonomies, seller profiles).
 * 
 * Rules:
 * 1. LIVE: Observed < 1 hour ago (0 confidence penalty)
 * 2. FRESH: Observed < natural metric lifetime (0-5% confidence penalty)
 * 3. STALE: Beyond fresh window but within retention boundary (10-25% penalty)
 * 4. HISTORICAL: Historical snapshot record (30-50% penalty)
 * 5. UNKNOWN: Missing observation timestamp (treated as historical)
 */

export type FreshnessStatus = "LIVE" | "FRESH" | "STALE" | "HISTORICAL" | "UNKNOWN";

export type MetricDomain = "price" | "reviews" | "taxonomy" | "shop" | "general";

export interface MetricFreshnessRule {
  liveWindowSeconds: number;
  freshWindowSeconds: number;
  staleWindowSeconds: number;
}

export const METRIC_FRESHNESS_RULES: Record<MetricDomain, MetricFreshnessRule> = {
  price: {
    liveWindowSeconds: 3600, // 1 hour
    freshWindowSeconds: 21600, // 6 hours
    staleWindowSeconds: 86400 * 3, // 3 days
  },
  reviews: {
    liveWindowSeconds: 7200, // 2 hours
    freshWindowSeconds: 86400 * 2, // 48 hours
    staleWindowSeconds: 86400 * 14, // 14 days
  },
  taxonomy: {
    liveWindowSeconds: 86400, // 24 hours
    freshWindowSeconds: 86400 * 7, // 7 days
    staleWindowSeconds: 86400 * 30, // 30 days
  },
  shop: {
    liveWindowSeconds: 3600 * 4, // 4 hours
    freshWindowSeconds: 86400, // 24 hours
    staleWindowSeconds: 86400 * 7, // 7 days
  },
  general: {
    liveWindowSeconds: 3600, // 1 hour
    freshWindowSeconds: 86400, // 24 hours
    staleWindowSeconds: 86400 * 7, // 7 days
  },
};

export interface FreshnessEvaluation {
  status: FreshnessStatus;
  ageSeconds: number;
  ageFormatted: string;
  observedAt: Date;
  isStale: boolean;
  confidencePenalty: number;
  explanation: string;
}

export function formatAge(seconds: number): string {
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  return `${days}d ago`;
}

export function evaluateFreshness(
  observedAt?: Date | string | null,
  domain: MetricDomain = "general",
  isHistoricalRecord = false
): FreshnessEvaluation {
  if (!observedAt) {
    return {
      status: "UNKNOWN",
      ageSeconds: Infinity,
      ageFormatted: "Unknown age",
      observedAt: new Date(0),
      isStale: true,
      confidencePenalty: 35,
      explanation: "Observation timestamp is missing; treated as unverified historical data.",
    };
  }

  const dateObj = typeof observedAt === "string" ? new Date(observedAt) : observedAt;
  const nowMs = Date.now();
  const observedMs = dateObj.getTime();
  const ageSeconds = Math.max(0, Math.floor((nowMs - observedMs) / 1000));
  const ageFormatted = formatAge(ageSeconds);
  const rule = METRIC_FRESHNESS_RULES[domain] || METRIC_FRESHNESS_RULES.general;

  if (isHistoricalRecord || ageSeconds > rule.staleWindowSeconds) {
    return {
      status: "HISTORICAL",
      ageSeconds,
      ageFormatted,
      observedAt: dateObj,
      isStale: true,
      confidencePenalty: 30,
      explanation: `Historical observation recorded ${ageFormatted}.`,
    };
  }

  if (ageSeconds <= rule.liveWindowSeconds) {
    return {
      status: "LIVE",
      ageSeconds,
      ageFormatted,
      observedAt: dateObj,
      isStale: false,
      confidencePenalty: 0,
      explanation: `Live market observation captured ${ageFormatted}.`,
    };
  }

  if (ageSeconds <= rule.freshWindowSeconds) {
    return {
      status: "FRESH",
      ageSeconds,
      ageFormatted,
      observedAt: dateObj,
      isStale: false,
      confidencePenalty: 5,
      explanation: `Fresh market observation captured ${ageFormatted}.`,
    };
  }

  return {
    status: "STALE",
    ageSeconds,
    ageFormatted,
    observedAt: dateObj,
    isStale: true,
    confidencePenalty: 15,
    explanation: `Stale observation captured ${ageFormatted}; conditions may have changed.`,
  };
}
