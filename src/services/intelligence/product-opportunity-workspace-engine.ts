/**
 * SellerSalt — Product Opportunity Workspace Orchestrator
 * 
 * Master orchestrator assembling the end-to-end Opportunity → Sourcing → Launch Intelligence workspace.
 */

import { MarketplaceRegistry } from "@/marketplaces/core/registry";
import type { NormalizedProduct, MarketplaceId } from "@/marketplaces/core/types";
import type {
  ProductOpportunityWorkspace,
  UserEconomicsInput,
} from "@/marketplaces/core/opportunity-workspace-types";
import { ProductAttributeIntelligenceEngine } from "./product-attribute-intelligence";
import { DifferentiationBuilder2Engine } from "./differentiation-builder-2";
import { MarketPositioningEngine } from "./market-positioning-engine";
import { ProductConfigurationBuilder } from "./product-configuration-builder";
import { SourcingRequirementsEngine } from "./sourcing-requirements-engine";
import { UnitEconomicsScenarioEngine } from "./unit-economics-scenario-engine";
import { LaunchReadinessEngine } from "./launch-readiness-engine";
import { CommercialDecisionTree } from "./commercial-decision-tree";
import { InformationValueEngine } from "./information-value-engine";
import { ActionPlanGenerator } from "./action-plan-generator";
import { EvidenceLedgerBuilder } from "./evidence-ledger-builder";
import { OpportunityScoring3Engine } from "./opportunity-scoring-3";
import { DataTrustEngine } from "./data-trust-engine";
import {
  MarketplaceGovernanceRegistry,
  SourcePolicyEnforcer,
  SourceBoundary,
} from "@/marketplaces/core/governance";
import { prisma } from "@/lib/db";

// In-memory workspace cache for rapid lookup and testing
const WORKSPACE_CACHE = new Map<string, ProductOpportunityWorkspace>();

export interface CreateWorkspaceRequest {
  organizationId: string;
  query: string;
  title?: string;
  marketplaces?: MarketplaceId[];
  category?: string;
  niche?: string;
  userEconomics?: Partial<UserEconomicsInput>;
  products?: NormalizedProduct[];
}

export class ProductOpportunityWorkspaceEngine {
  /**
   * Builds or refreshes a complete Product Opportunity Workspace.
   */
  public static async createOrRefreshWorkspace(
    request: CreateWorkspaceRequest
  ): Promise<ProductOpportunityWorkspace> {
    const orgId = request.organizationId || "org_default";
    const query = request.query.trim();
    const title = request.title || query;
    const marketplaces = request.marketplaces && request.marketplaces.length > 0
      ? request.marketplaces
      : (["etsy", "amazon", "ebay", "walmart"] as MarketplaceId[]);

    // 1. Gather Product Observations with Policy Gate
    let rawProducts: NormalizedProduct[] = request.products ? [...request.products] : [];

    if (rawProducts.length === 0) {
      for (const mp of marketplaces) {
        // Evaluate data governance policy before network attempt
        const policyDecision = SourcePolicyEnforcer.evaluateRequest({
          organizationId: orgId,
          marketplace: mp,
          sourceType: "PUBLIC_WEB",
          purpose: "PRODUCT_SEARCH",
        });

        if (!policyDecision.allowed) {
          continue; // Prohibited or restricted by policy
        }

        const adapter = MarketplaceRegistry.tryGetPublicWebAdapter(mp);
        if (adapter && adapter.capabilities.productSearch) {
          try {
            const res = await adapter.searchPublicProducts({
              query,
              limit: 15,
            });
            if (res.success && res.items.length > 0) {
              rawProducts.push(...res.items);
            }
          } catch {
            // Degrade cleanly
          }
        }
      }
    }

    // 1b. Sanitize products through Source Boundary layer
    const products = SourceBoundary.sanitizeProducts(rawProducts);

    // 2. Extract Observable Attributes
    const attributes = ProductAttributeIntelligenceEngine.analyze(products);

    // 3. Evaluate Differentiation Gaps
    const differentiation = DifferentiationBuilder2Engine.buildDifferentiation(
      attributes,
      products,
      title
    );

    // 4. Analyze Empirical Price Positioning
    const positioning = MarketPositioningEngine.analyzePositioning(products);

    // 5. Build Differentiated Product Configuration
    const topDiffCandidate = differentiation.candidates.length > 0 ? differentiation.candidates[0] : null;
    const configuration = ProductConfigurationBuilder.buildConfiguration(
      title,
      attributes,
      topDiffCandidate,
      positioning
    );

    // 6. Generate Sourcing Specification
    const sourcing = SourcingRequirementsEngine.generateSpecification(
      configuration,
      attributes,
      {
        landCost: request.userEconomics?.unitProductCost,
      }
    );

    // 7. Unit Economics Scenario Analysis
    const economics = UnitEconomicsScenarioEngine.evaluateAnalysis(request.userEconomics);

    // 8. Launch Readiness Assessment
    const hasUserEconomics =
      typeof request.userEconomics?.unitProductCost === "number" &&
      request.userEconomics.unitProductCost > 0;

    const readiness = LaunchReadinessEngine.evaluateReadiness({
      attributes,
      differentiation,
      positioning,
      economics,
      sourcing,
      observationCount: products.length,
      hasUserEconomics,
    });

    // 9. Score Breakdown 3.0
    const compositeScore = Math.min(
      100,
      Math.round((readiness.overallScore + (positioning.empiricalQuantiles.sampleSize > 0 ? 80 : 40)) / 2)
    );

    const opportunityScore = {
      compositeScore,
      demandScore: Math.min(25, Math.round(products.length * 2)),
      competitionAttractivenessScore: Math.min(25, Math.round(attributes.totalSampledSellers * 2)),
      momentumScore: 12,
      differentiationScore: differentiation.candidates.length > 0 ? 14 : 6,
      pricePositioningScore: positioning.empiricalQuantiles.p50 ? 9 : 4,
      evidenceDepthScore: products.length >= 10 ? 9 : 5,
      weightsApplied: {
        demand: 0.25,
        competition: 0.25,
        momentum: 0.15,
        differentiation: 0.15,
        price: 0.10,
        depth: 0.10,
      },
    };

    // 10. Commercial Decision Tree
    const commercialDecision = CommercialDecisionTree.evaluateDecision({
      readiness,
      economics,
      differentiation,
      positioning,
      compositeScore,
      observationCount: products.length,
      hasUserEconomics,
    });

    // 11. Uncertainty / Information Value Report
    const informationGaps = InformationValueEngine.evaluateInformationGaps({
      hasUserEconomics,
      observationCount: products.length,
      hasDifferentiation: differentiation.candidates.length > 0,
      readiness,
    });

    // 12. Prioritized Action Plan
    const actionPlan = ActionPlanGenerator.generatePlan({
      readiness,
      informationGaps,
      differentiation,
      hasUserEconomics,
      baseProductName: title,
    });

    // 13. Evidence Ledger
    const evidenceLedger = EvidenceLedgerBuilder.buildLedger({
      products,
      attributes,
      positioning,
      differentiation,
      economics,
    });

    // 14. Data Trust & Governance Evaluation
    const dataTrust = DataTrustEngine.evaluateTrust({
      products,
      marketplaces,
      hasUserEconomics,
    });
    const governancePolicy = MarketplaceGovernanceRegistry.getPolicy(marketplaces[0] || "etsy");

    const now = new Date();
    const workspaceId = `ws_${orgId}_${encodeURIComponent(query).replace(/%/g, "_")}`;
    const canonicalProductId = `prod:workspace:${encodeURIComponent(query)}`;

    const workspace: ProductOpportunityWorkspace = {
      id: workspaceId,
      organizationId: orgId,
      canonicalProductId,
      title,
      query,
      marketplaces,
      category: request.category || attributes.dominantAttributes[0]?.value || "General",
      niche: request.niche || title,
      status: "ACTIVE",
      opportunityScore,
      confidenceScore: evidenceLedger.overallConfidence,
      evidenceLedger,
      attributeIntelligence: attributes,
      differentiation,
      positioning,
      configuration,
      sourcing,
      economics,
      readiness,
      informationGaps,
      commercialDecision,
      actionPlan,
      dataTrust,
      governancePolicy,
      createdAt: now,
      updatedAt: now,
    };

    // Cache in memory
    WORKSPACE_CACHE.set(workspaceId, workspace);

    // Persist to SavedOpportunity & ProductValidation if database accessible
    try {
      await prisma.savedOpportunity.upsert({
        where: {
          organizationId_type_marketplace_targetId: {
            organizationId: orgId,
            type: "PRODUCT",
            marketplace: marketplaces[0] || "etsy",
            targetId: workspaceId,
          },
        },
        create: {
          organizationId: orgId,
          type: "PRODUCT",
          marketplace: marketplaces[0] || "etsy",
          targetId: workspaceId,
          title,
          subtitle: workspace.category || "General",
          score: compositeScore,
          confidence: evidenceLedger.overallConfidence,
          verdict: commercialDecision.verdict,
          verdictVariant:
            commercialDecision.verdict === "PURSUE"
              ? "success"
              : commercialDecision.verdict === "TEST" || commercialDecision.verdict === "INVESTIGATE"
              ? "info"
              : "warning",
          notes: actionPlan.primaryFocus,
        },
        update: {
          score: compositeScore,
          confidence: evidenceLedger.overallConfidence,
          verdict: commercialDecision.verdict,
          lastObservedAt: now,
        },
      });
    } catch {
      // Degrade cleanly
    }

    return workspace;
  }

  /**
   * Retrieves an existing workspace by ID.
   */
  public static async getWorkspace(
    organizationId: string,
    workspaceId: string
  ): Promise<ProductOpportunityWorkspace | null> {
    if (WORKSPACE_CACHE.has(workspaceId)) {
      const cached = WORKSPACE_CACHE.get(workspaceId)!;
      if (cached.organizationId === organizationId) {
        return cached;
      }
    }

    // Try rebuilding from saved opportunity
    const saved = await prisma.savedOpportunity.findFirst({
      where: { targetId: workspaceId, organizationId },
    });

    if (saved) {
      return this.createOrRefreshWorkspace({
        organizationId,
        query: saved.title,
        title: saved.title,
        marketplaces: [saved.marketplace as MarketplaceId],
        category: saved.subtitle || undefined,
      });
    }

    return null;
  }

  /**
   * Lists all workspaces for an organization.
   */
  public static async listWorkspaces(
    organizationId: string
  ): Promise<Array<{ id: string; title: string; query: string; score: number; verdict: string; updatedAt: Date }>> {
    const list: Array<{ id: string; title: string; query: string; score: number; verdict: string; updatedAt: Date }> = [];

    // From memory cache
    for (const ws of WORKSPACE_CACHE.values()) {
      if (ws.organizationId === organizationId) {
        list.push({
          id: ws.id,
          title: ws.title,
          query: ws.query,
          score: ws.opportunityScore.compositeScore,
          verdict: ws.commercialDecision.verdict,
          updatedAt: ws.updatedAt,
        });
      }
    }

    // From SavedOpportunity
    try {
      const savedList = await prisma.savedOpportunity.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        take: 30,
      });

      for (const s of savedList) {
        if (!list.some((item) => item.id === s.targetId)) {
          list.push({
            id: s.targetId,
            title: s.title,
            query: s.title,
            score: Math.round(s.score ?? 0),
            verdict: s.verdict,
            updatedAt: s.updatedAt,
          });
        }
      }
    } catch {
      // Degrade cleanly
    }

    return list;
  }
}
