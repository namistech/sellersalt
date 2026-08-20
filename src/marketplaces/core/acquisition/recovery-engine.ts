/**
 * SellerSalt Autonomous Acquisition Recovery Engine
 * 
 * Coordinates multi-tier strategy execution and graceful fallback when primary extraction
 * encounters missing fields, layout changes, or temporary source degradation.
 * 
 * COMPLIANCE & SAFETY:
 * - If ACCESS_RESTRICTED is encountered, recovery immediately halts to avoid aggressive crawling.
 * - Respects ResearchBudgetTracker quotas and rate limits across all fallback attempts.
 */

import type { MarketplaceId, NormalizedProduct, DataSourceType } from "../types";
import type { ResearchRunType } from "./workbench";
import { AcquisitionStrategyEngine, type StrategyPlan, type AcquisitionStrategyDefinition } from "./strategy-engine";
import { ParserHealthEngine, type ParserHealthEvaluation } from "./parser-health";
import { ResearchBudgetTracker } from "./research-budgets";
import { MarketplaceRegistry } from "../registry";
import { prisma } from "@/lib/db";
import { evaluateCanonicalOpportunity, extractOpportunityInputFromNormalizedProduct } from "@/services/intelligence/canonical-opportunity";
import { AntiCircumventionGuard } from "../governance/anti-circumvention";
import { SourceBoundary } from "../governance/source-boundary";

export interface StrategyAttemptRecord {
  strategy: string;
  sourceType: DataSourceType;
  success: boolean;
  itemCount: number;
  durationMs: number;
  failureReason?: string;
  parserHealth?: ParserHealthEvaluation;
}

export interface AcquisitionRecoveryResult<T = NormalizedProduct> {
  items: T[];
  successfulStrategy: string;
  primaryStrategyUsed: boolean;
  recoveryApplied: boolean;
  attempts: StrategyAttemptRecord[];
  totalDurationMs: number;
  sourcesUsed: DataSourceType[];
  isHistoricalFallback: boolean;
  limitations: string[];
}

export class AcquisitionRecoveryEngine {
  /**
   * Executes a resilient, multi-stage acquisition run following the resolved strategy plan.
   */
  public static async executeWithRecovery(params: {
    marketplace: MarketplaceId;
    researchType: ResearchRunType;
    query: string;
    organizationId?: string;
    limit?: number;
    budgetTracker?: ResearchBudgetTracker;
  }): Promise<AcquisitionRecoveryResult<NormalizedProduct>> {
    const startTime = Date.now();
    const { marketplace, researchType, query, organizationId, limit = 25 } = params;
    const tracker = params.budgetTracker || new ResearchBudgetTracker({ maxListings: limit });

    const plan = await AcquisitionStrategyEngine.resolveStrategyPlan({
      marketplace,
      researchType,
      enableSecondaryApi: true,
      allowHistoricalFallback: true,
    });

    const attempts: StrategyAttemptRecord[] = [];
    const limitations: string[] = [];
    let acquiredProducts: NormalizedProduct[] = [];
    let successfulStrategy = "NONE";
    let isHistoricalFallback = false;

    // Iterate through prioritized strategies
    for (const strategy of plan.strategies) {
      if (!tracker.canContinue()) {
        limitations.push("Research budget or execution timeout reached during recovery.");
        break;
      }

      const attemptStart = Date.now();
      let success = false;
      let strategyItems: NormalizedProduct[] = [];
      let failureReason: string | undefined;

      if (strategy.id === "PUBLIC_SEARCH_HTML" || strategy.id === "STRUCTURED_JSON_LD") {
        const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter(marketplace);
        if (publicAdapter) {
          try {
            const res = await publicAdapter.searchPublicProducts({ query, limit });
            if (res.success && res.items.length > 0) {
              success = true;
              strategyItems = res.items;
            } else {
              failureReason = res.failureReason || "NO_DATA";
              if (res.error) limitations.push(res.error);
              if (res.failureReason === "ACCESS_RESTRICTED") {
                // Halt recovery immediately on access challenge
                attempts.push({
                  strategy: strategy.name,
                  sourceType: strategy.sourceType,
                  success: false,
                  itemCount: 0,
                  durationMs: Date.now() - attemptStart,
                  failureReason: "ACCESS_RESTRICTED",
                });
                break;
              }
            }
          } catch (err: any) {
            failureReason = err.message;
          }
        }
      } else if (strategy.id === "SECONDARY_OFFICIAL_API") {
        const connector = MarketplaceRegistry.tryGetConnector(marketplace);
        if (connector && connector.capabilities.research && connector.searchProducts) {
          try {
            const apiProds = await connector.searchProducts({
              keywords: query ? [query] : [],
              limit,
              organizationId,
            });
            if (apiProds && apiProds.length > 0) {
              success = true;
              strategyItems = apiProds;
            }
          } catch (err: any) {
            failureReason = err.message;
          }
        }
      } else if (strategy.id === "TERTIARY_HISTORICAL_DB") {
        // Query PostgreSQL historical observations
        try {
          const historical = await prisma.productObservation.findMany({
            where: {
              marketplace,
              ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
            },
            take: limit,
            orderBy: { observedAt: "desc" },
            include: { snapshots: { take: 1, orderBy: { observedAt: "desc" } } },
          });

          if (historical.length > 0) {
            success = true;
            isHistoricalFallback = true;
            strategyItems = historical.map((h) => {
              const snap = h.snapshots[0];
              const normalized: NormalizedProduct = {
                marketplace: h.marketplace as MarketplaceId,
                externalId: h.externalId,
                title: h.title,
                url: h.sourceUrl || `https://www.${h.marketplace}.com/listing/${h.externalId}`,
                imageUrl: undefined,
                price: snap?.price ?? h.price ?? null,
                currency: snap?.currency ?? h.currency ?? "USD",
                rating: snap?.rating ?? h.rating ?? null,
                reviewCount: snap?.reviewCount ?? h.reviewCount ?? null,
                shop: h.shopName ? { name: h.shopName } : undefined,
                categoryPath: h.categoryPath,
                source: "ACTUAL_DATA",
                acquisitionMethod: "HISTORICAL_OBSERVATION",
                isHistorical: true,
                capturedAt: h.observedAt,
              };

              const oppInput = extractOpportunityInputFromNormalizedProduct(normalized);
              const oppReport = evaluateCanonicalOpportunity(oppInput);
              if (oppReport.overallScore !== null) {
                normalized.opportunityScore = {
                  score: oppReport.overallScore,
                  confidence: oppReport.confidenceScore,
                  tier: oppReport.tier,
                  verdict: oppReport.verdictLabel,
                  verdictVariant: oppReport.verdictVariant,
                  availableSignals: oppReport.signals.available.map((s) => s.id),
                  unavailableSignals: oppReport.signals.unavailable.map((s) => s.id),
                };
              }
              return normalized;
            });
          }
        } catch {
          // DB error fallback
        }
      }

      const parserHealth = ParserHealthEngine.evaluate({
        marketplace,
        items: strategyItems,
      });

      attempts.push({
        strategy: strategy.name,
        sourceType: strategy.sourceType,
        success,
        itemCount: strategyItems.length,
        durationMs: Date.now() - attemptStart,
        failureReason,
        parserHealth,
      });

      if (success && strategyItems.length > 0) {
        acquiredProducts = strategyItems;
        successfulStrategy = strategy.name;
        break;
      }
    }

    const sourcesUsed = Array.from(new Set(attempts.filter((a) => a.success).map((a) => a.sourceType)));
    if (sourcesUsed.length === 0 && attempts.length > 0) {
      sourcesUsed.push(attempts[0].sourceType);
    }

    const primaryStrategyUsed = attempts.length > 0 && attempts[0].success;
    const recoveryApplied = attempts.length > 1 && acquiredProducts.length > 0;

    // Sanitize observations through SourceBoundary
    const sanitizedItems = SourceBoundary.sanitizeProducts(acquiredProducts);

    return {
      items: sanitizedItems,
      successfulStrategy,
      primaryStrategyUsed,
      recoveryApplied,
      attempts,
      totalDurationMs: Date.now() - startTime,
      sourcesUsed,
      isHistoricalFallback,
      limitations,
    };
  }
}
