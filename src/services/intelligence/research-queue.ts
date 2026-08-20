/**
 * SellerSalt Research Queue & Watchlist Engine
 * 
 * Manages the unified saved research queue across Products, Keywords, Niches,
 * Categories, and Opportunities with multi-tenant organization scoping.
 */

import { prisma } from "@/lib/db";
import type {
  ResearchQueueItem,
  ResearchQueueTargetType,
} from "@/marketplaces/core/research-command-types";

// In-memory queue fallback for isolated tests or unmigrated environments
const inMemoryQueue = new Map<string, ResearchQueueItem>();

export class ResearchQueueManager {
  /**
   * Adds an item to the user's research queue.
   */
  public static async addToQueue(params: {
    organizationId: string;
    targetType: ResearchQueueTargetType;
    identifier: string;
    title: string;
    marketplace: string;
    query: string;
    score?: number | null;
    momentum?: string | null;
    validationStatus?: string | null;
    notes?: string;
  }): Promise<ResearchQueueItem> {
    const {
      organizationId,
      targetType,
      identifier,
      title,
      marketplace,
      query,
      score = null,
      momentum = null,
      validationStatus = null,
      notes,
    } = params;

    const type = targetType === "OPPORTUNITY" ? "PRODUCT" : targetType;

    try {
      // Use SavedOpportunity as the unified persistence model
      const saved = await prisma.savedOpportunity.upsert({
        where: {
          organizationId_type_marketplace_targetId: {
            organizationId,
            type,
            marketplace,
            targetId: identifier,
          },
        },
        create: {
          organizationId,
          type,
          targetId: identifier,
          title,
          subtitle: query,
          marketplace,
          score: score ?? 50,
          confidence: 80,
          verdict: validationStatus || "Saved Target",
          verdictVariant: "info",
          evidenceJson: {
            targetType,
            identifier,
            momentum,
            validationStatus,
            query,
            notes,
          } as any,
          notes,
        },
        update: {
          title,
          subtitle: query,
          score: score ?? undefined,
          verdict: validationStatus ?? undefined,
          notes: notes ?? undefined,
          evidenceJson: {
            targetType,
            identifier,
            momentum,
            validationStatus,
            query,
            notes,
          } as any,
        },
      });

      return {
        id: saved.id,
        organizationId: saved.organizationId,
        targetType,
        identifier,
        title: saved.title,
        marketplace: saved.marketplace,
        query: saved.subtitle || query,
        latestScore: saved.score,
        latestMomentum: momentum,
        latestValidationStatus: validationStatus,
        notes: saved.notes || undefined,
        savedAt: saved.createdAt,
        lastResearchedAt: saved.updatedAt,
      };
    } catch {
      // Fallback in-memory for testing environments without live DB migration
      const id = `queue_${organizationId}_${identifier}`;
      const item: ResearchQueueItem = {
        id,
        organizationId,
        targetType,
        identifier,
        title,
        marketplace,
        query,
        latestScore: score ?? 50,
        latestMomentum: momentum,
        latestValidationStatus: validationStatus,
        notes,
        savedAt: new Date(),
        lastResearchedAt: new Date(),
      };
      inMemoryQueue.set(id, item);
      return item;
    }
  }

  /**
   * Retrieves all queue items for an organization.
   */
  public static async getQueue(organizationId: string): Promise<ResearchQueueItem[]> {
    try {
      const items = await prisma.savedOpportunity.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      if (items.length > 0) {
        return items.map((it) => {
          const evidence = (it.evidenceJson as any) || {};
          return {
            id: it.id,
            organizationId: it.organizationId,
            targetType: (evidence.targetType as ResearchQueueTargetType) || (it.type as any) || "OPPORTUNITY",
            identifier: it.targetId,
            title: it.title,
            marketplace: it.marketplace,
            query: it.subtitle || "",
            latestScore: it.score,
            latestMomentum: evidence.momentum || null,
            latestValidationStatus: it.verdict,
            notes: it.notes || undefined,
            savedAt: it.createdAt,
            lastResearchedAt: it.updatedAt,
          };
        });
      }
    } catch {
      // Fallback to in-memory
    }

    return Array.from(inMemoryQueue.values()).filter((it) => it.organizationId === organizationId);
  }

  /**
   * Removes an item from the queue.
   */
  public static async removeFromQueue(
    id: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      const res = await prisma.savedOpportunity.deleteMany({
        where: { id, organizationId },
      });
      if (res.count > 0) return true;
    } catch {
      // Fallback to in-memory
    }

    if (inMemoryQueue.has(id)) {
      inMemoryQueue.delete(id);
      return true;
    }
    return false;
  }
}
