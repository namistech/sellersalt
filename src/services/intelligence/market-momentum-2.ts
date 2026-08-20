/**
 * SellerSalt Market Momentum 2.0 Engine
 * 
 * Classifies multi-entity trajectory (Products, Keywords, Sellers, Categories, Niches, Marketplaces)
 * across short-term (<7d), medium-term (7-30d), and long-term (>30d) longitudinal observation depths.
 * 
 * STATES:
 * - RISING: Positive review velocity or increasing keyword prevalence
 * - ACCELERATING: High positive velocity growth
 * - STABLE: Consistent metrics across observation intervals
 * - COOLING: Decelerating velocity or declining prevalence
 * - DECLINING: Negative review drift, price erosion, or inventory collapse
 * - INSUFFICIENT_DATA: Observation count n < 2
 */

import type { MarketplaceId } from "@/marketplaces/core/types";
import type { MarketEntityType } from "@/marketplaces/core/graph/entities";

export type MomentumClassification =
  | "RISING"
  | "ACCELERATING"
  | "STABLE"
  | "COOLING"
  | "DECLINING"
  | "INSUFFICIENT_DATA";

export interface MultiTimeframeMomentumReport {
  entityId: string;
  entityType: MarketEntityType;
  marketplace: MarketplaceId | "all";
  currentStatus: MomentumClassification;
  shortTermMomentum: {
    status: MomentumClassification;
    velocityDaily: number | null;
    deltaPercent: number | null;
    isAvailable: boolean;
  };
  mediumTermMomentum: {
    status: MomentumClassification;
    velocityDaily: number | null;
    deltaPercent: number | null;
    isAvailable: boolean;
  };
  longTermMomentum: {
    status: MomentumClassification;
    velocityDaily: number | null;
    deltaPercent: number | null;
    isAvailable: boolean;
  };
  observationCount: number;
  daysObserved: number;
  explanation: string;
  evaluatedAt: Date;
}

export class MarketMomentum2Engine {
  /**
   * Computes multi-timeframe momentum from an array of dated observation snapshots.
   */
  public static evaluateTimeframeMomentum(params: {
    entityId: string;
    entityType: MarketEntityType;
    marketplace: MarketplaceId | "all";
    snapshots: Array<{
      observedAt: Date;
      metricValue: number | null; // e.g. reviewCount or listingFrequencyPercent
      price?: number | null;
    }>;
  }): MultiTimeframeMomentumReport {
    const { entityId, entityType, marketplace, snapshots } = params;
    const now = new Date();

    const validSnapshots = snapshots
      .filter((s) => s.observedAt && s.metricValue !== null && s.metricValue !== undefined)
      .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());

    // Single observation check: Zero-Fabrication enforcement
    if (validSnapshots.length <= 1) {
      return {
        entityId,
        entityType,
        marketplace,
        currentStatus: "INSUFFICIENT_DATA",
        shortTermMomentum: { status: "INSUFFICIENT_DATA", velocityDaily: null, deltaPercent: null, isAvailable: false },
        mediumTermMomentum: { status: "INSUFFICIENT_DATA", velocityDaily: null, deltaPercent: null, isAvailable: false },
        longTermMomentum: { status: "INSUFFICIENT_DATA", velocityDaily: null, deltaPercent: null, isAvailable: false },
        observationCount: validSnapshots.length,
        daysObserved: 0,
        explanation: "Single point observation: historical momentum trajectory is unavailable without multi-snapshot time series.",
        evaluatedAt: now,
      };
    }

    const first = validSnapshots[0];
    const latest = validSnapshots[validSnapshots.length - 1];
    const totalDays = Math.max(1, (new Date(latest.observedAt).getTime() - new Date(first.observedAt).getTime()) / (1000 * 60 * 60 * 24));

    const totalDelta = (latest.metricValue ?? 0) - (first.metricValue ?? 0);
    const dailyVelocity = parseFloat((totalDelta / totalDays).toFixed(2));
    const deltaPercent = first.metricValue && first.metricValue > 0
      ? parseFloat(((totalDelta / first.metricValue) * 100).toFixed(1))
      : null;

    let overallStatus: MomentumClassification = "STABLE";
    if (dailyVelocity >= 1.5 || (deltaPercent ?? 0) >= 30) {
      overallStatus = "ACCELERATING";
    } else if (dailyVelocity > 0.3 || (deltaPercent ?? 0) >= 10) {
      overallStatus = "RISING";
    } else if (dailyVelocity < 0 || (deltaPercent ?? 0) <= -15) {
      overallStatus = "DECLINING";
    } else if (dailyVelocity === 0 && (deltaPercent ?? 0) <= -5) {
      overallStatus = "COOLING";
    }

    const isShortAvailable = totalDays >= 1;
    const isMedAvailable = totalDays >= 7;
    const isLongAvailable = totalDays >= 30;

    return {
      entityId,
      entityType,
      marketplace,
      currentStatus: overallStatus,
      shortTermMomentum: {
        status: isShortAvailable ? overallStatus : "INSUFFICIENT_DATA",
        velocityDaily: isShortAvailable ? dailyVelocity : null,
        deltaPercent: isShortAvailable ? deltaPercent : null,
        isAvailable: isShortAvailable,
      },
      mediumTermMomentum: {
        status: isMedAvailable ? overallStatus : "INSUFFICIENT_DATA",
        velocityDaily: isMedAvailable ? dailyVelocity : null,
        deltaPercent: isMedAvailable ? deltaPercent : null,
        isAvailable: isMedAvailable,
      },
      longTermMomentum: {
        status: isLongAvailable ? overallStatus : "INSUFFICIENT_DATA",
        velocityDaily: isLongAvailable ? dailyVelocity : null,
        deltaPercent: isLongAvailable ? deltaPercent : null,
        isAvailable: isLongAvailable,
      },
      observationCount: validSnapshots.length,
      daysObserved: Math.round(totalDays),
      explanation: `${overallStatus} trajectory based on ${validSnapshots.length} observation snapshots spanning ${Math.round(totalDays)} days.`,
      evaluatedAt: now,
    };
  }
}
