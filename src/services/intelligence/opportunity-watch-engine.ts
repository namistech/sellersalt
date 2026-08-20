/**
 * SellerSalt Opportunity Watchlist & Alert Engine
 * 
 * Manages organization-scoped watch items and evaluates continuous market memory
 * to detect actionable changes and generate deterministic alerts.
 */

import { prisma } from "@/lib/db";
import type {
  OpportunityWatchItem,
  OpportunityAlertRecord,
  AutonomousOpportunityItem,
} from "@/marketplaces/core/autonomous-discovery-types";

// In-memory alert store to supplement DB
const alertStore = new Map<string, OpportunityAlertRecord[]>();

export class OpportunityWatchEngine {
  /**
   * Adds an opportunity to the organization's watchlist.
   */
  public static async addToWatchlist(params: {
    organizationId: string;
    opportunity: AutonomousOpportunityItem;
    alertConditions?: {
      notifyOnScoreChange?: boolean;
      notifyOnPriceMove?: boolean;
      notifyOnMomentumShift?: boolean;
      minScoreThreshold?: number;
    };
  }): Promise<OpportunityWatchItem> {
    const { organizationId, opportunity, alertConditions = {} } = params;
    const now = new Date();

    // Map to SavedOpportunity in Prisma
    const saved = await prisma.savedOpportunity.upsert({
      where: {
        organizationId_type_marketplace_targetId: {
          organizationId,
          type: opportunity.type,
          marketplace: opportunity.marketplace,
          targetId: opportunity.canonicalEntityId,
        },
      },
      create: {
        organizationId,
        type: opportunity.type,
        targetId: opportunity.canonicalEntityId,
        title: opportunity.title,
        subtitle: opportunity.subtitle,
        marketplace: opportunity.marketplace,
        score: opportunity.score.compositeScore,
        confidence: opportunity.confidence.confidenceScore,
        verdict: opportunity.explanation.verdict,
        evidenceJson: opportunity.explanation as any,
        tags: [opportunity.type, opportunity.momentum],
        firstObservedAt: opportunity.firstObservedAt,
        lastObservedAt: opportunity.lastObservedAt,
      },
      update: {
        title: opportunity.title,
        score: opportunity.score.compositeScore,
        confidence: opportunity.confidence.confidenceScore,
        verdict: opportunity.explanation.verdict,
        lastObservedAt: opportunity.lastObservedAt,
        tags: [opportunity.type, opportunity.momentum],
      },
    });

    return {
      id: saved.id,
      organizationId,
      type: opportunity.type as any,
      targetId: opportunity.canonicalEntityId,
      title: opportunity.title,
      marketplace: opportunity.marketplace,
      initialScore: opportunity.score.compositeScore,
      currentScore: opportunity.score.compositeScore,
      scoreDelta: 0,
      momentum: opportunity.momentum,
      alertConditions: {
        notifyOnScoreChange: alertConditions.notifyOnScoreChange ?? true,
        notifyOnPriceMove: alertConditions.notifyOnPriceMove ?? true,
        notifyOnMomentumShift: alertConditions.notifyOnMomentumShift ?? true,
        minScoreThreshold: alertConditions.minScoreThreshold ?? 70,
      },
      firstObservedAt: saved.firstObservedAt,
      lastObservedAt: saved.lastObservedAt,
      lastCheckedAt: now,
    };
  }

  /**
   * Retrieves all watchlist items for an organization.
   */
  public static async getWatchlist(organizationId: string): Promise<OpportunityWatchItem[]> {
    const list = await prisma.savedOpportunity.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    return list.map((item) => ({
      id: item.id,
      organizationId: item.organizationId,
      type: item.type as any,
      targetId: item.targetId,
      title: item.title,
      marketplace: item.marketplace as any,
      initialScore: item.score,
      currentScore: item.score,
      scoreDelta: 0,
      momentum: item.tags.includes("ACCELERATING") ? "ACCELERATING" : "STABLE",
      alertConditions: {
        notifyOnScoreChange: true,
        notifyOnPriceMove: true,
        notifyOnMomentumShift: true,
      },
      firstObservedAt: item.firstObservedAt,
      lastObservedAt: item.lastObservedAt,
      lastCheckedAt: item.updatedAt,
    }));
  }

  /**
   * Removes an item from the watchlist.
   */
  public static async removeFromWatchlist(organizationId: string, watchItemId: string): Promise<boolean> {
    try {
      await prisma.savedOpportunity.deleteMany({
        where: { id: watchItemId, organizationId },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Evaluates watchlist items against updated opportunities and generates alerts.
   */
  public static evaluateWatchlistAlerts(
    watchItem: OpportunityWatchItem,
    updatedOpp: AutonomousOpportunityItem
  ): OpportunityAlertRecord | null {
    const currentScore = updatedOpp.score.compositeScore;
    const prevScore = watchItem.currentScore ?? currentScore;

    // Check score shift
    if (watchItem.alertConditions.notifyOnScoreChange && Math.abs(currentScore - prevScore) >= 5) {
      const isImprovement = currentScore > prevScore;
      const alert: OpportunityAlertRecord = {
        id: `alert:${Date.now()}:${Math.random().toString(36).substring(2, 6)}`,
        watchItemId: watchItem.id,
        organizationId: watchItem.organizationId,
        type: "SCORE_CHANGED",
        title: `Opportunity Score ${isImprovement ? "Increased" : "Declined"}`,
        description: `Score shifted from ${prevScore} to ${currentScore} (${isImprovement ? "+" : ""}${currentScore - prevScore} pts).`,
        previousValue: prevScore,
        currentValue: currentScore,
        severity: isImprovement ? "OPPORTUNITY" : "WARNING",
        triggeredAt: new Date(),
        isRead: false,
      };

      this.storeAlert(alert);
      return alert;
    }

    // Check momentum shift
    if (
      watchItem.alertConditions.notifyOnMomentumShift &&
      watchItem.momentum !== updatedOpp.momentum &&
      (updatedOpp.momentum === "ACCELERATING" || updatedOpp.momentum === "RISING")
    ) {
      const alert: OpportunityAlertRecord = {
        id: `alert:${Date.now()}:${Math.random().toString(36).substring(2, 6)}`,
        watchItemId: watchItem.id,
        organizationId: watchItem.organizationId,
        type: "MOMENTUM_SHIFTED",
        title: `Momentum Accelerated to ${updatedOpp.momentum}`,
        description: `Observed review velocity expanded for "${watchItem.title}".`,
        previousValue: watchItem.momentum,
        currentValue: updatedOpp.momentum,
        severity: "OPPORTUNITY",
        triggeredAt: new Date(),
        isRead: false,
      };

      this.storeAlert(alert);
      return alert;
    }

    return null;
  }

  /**
   * Retrieves triggered alerts for an organization.
   */
  public static getAlerts(organizationId: string): OpportunityAlertRecord[] {
    return alertStore.get(organizationId) || [];
  }

  private static storeAlert(alert: OpportunityAlertRecord): void {
    if (!alertStore.has(alert.organizationId)) {
      alertStore.set(alert.organizationId, []);
    }
    const list = alertStore.get(alert.organizationId)!;
    list.unshift(alert);
    if (list.length > 50) list.pop();
  }

  /**
   * Clears alerts (for testing).
   */
  public static clearAlerts(): void {
    alertStore.clear();
  }
}
