/**
 * SellerSalt Centralized Acquisition Strategy Engine
 * 
 * Determines, prioritizes, and coordinates multi-source data acquisition strategies
 * based on marketplace, research type, cost, risk, historical health, and capabilities.
 * 
 * ARCHITECTURAL PRINCIPLES:
 * 1. Public web extraction is primary; official APIs secondary; database records tertiary.
 * 2. Strategy selection is centralized rather than hardcoded in individual adapters.
 * 3. Degraded or restricted sources trigger controlled fallback without violating compliance.
 * 4. Zero-Fabrication: missing fields remain null rather than synthetic defaults.
 */

import type { MarketplaceId, DataSourceType } from "../types";
import type { ResearchRunType } from "./workbench";
import { SourceHealthTracker, type SourceHealthStatus } from "./source-health";
import { MarketplaceRegistry } from "../registry";
import { SourcePolicyEnforcer } from "../governance/source-policy-enforcer";

export type AcquisitionStrategyType =
  | "PUBLIC_SEARCH_HTML"
  | "STRUCTURED_JSON_LD"
  | "PRODUCT_DETAIL_CRAWL"
  | "CATEGORY_TAXONOMY_CRAWL"
  | "KEYWORD_HARVEST_PARSE"
  | "SECONDARY_OFFICIAL_API"
  | "TERTIARY_HISTORICAL_DB"
  | "EXTERNAL_LICENSED_PROVIDER";

export interface AcquisitionStrategyDefinition {
  id: AcquisitionStrategyType;
  name: string;
  marketplace: MarketplaceId;
  researchType: ResearchRunType;
  priority: number; // 1 (highest) to 100 (lowest)
  sourceType: DataSourceType;
  cost: "FREE" | "API_QUOTA" | "DATABASE_READ";
  risk: "LOW" | "MODERATE" | "HIGH";
  expectedSignals: string[];
  enabled: boolean;
  requiresAuth: boolean;
  description: string;
}

export interface StrategyExecutionResult<T = any> {
  strategy: AcquisitionStrategyType;
  sourceType: DataSourceType;
  success: boolean;
  items: T[];
  itemCount: number;
  durationMs: number;
  statusCode?: number;
  failureReason?: string;
  error?: string;
  fieldCoverage?: Record<string, number>; // field -> count
}

export interface StrategyPlan {
  marketplace: MarketplaceId;
  researchType: ResearchRunType;
  strategies: AcquisitionStrategyDefinition[];
  primaryStrategy: AcquisitionStrategyDefinition;
  fallbackStrategies: AcquisitionStrategyDefinition[];
  sourceHealth: SourceHealthStatus | null;
}

export class AcquisitionStrategyEngine {
  /**
   * Resolves the prioritized list of acquisition strategies for a given marketplace and research modality.
   */
  public static async resolveStrategyPlan(params: {
    marketplace: MarketplaceId;
    researchType: ResearchRunType;
    preferredSources?: DataSourceType[];
    allowHistoricalFallback?: boolean;
    enableSecondaryApi?: boolean;
  }): Promise<StrategyPlan> {
    const { marketplace, researchType } = params;
    const preferredSources = params.preferredSources || ["PUBLIC_WEB", "MARKETPLACE_API", "HISTORICAL_OBSERVATION"];
    const allowHistorical = params.allowHistoricalFallback ?? true;
    const enableApi = params.enableSecondaryApi ?? true;

    // Check operational source health
    const sourceHealth = await SourceHealthTracker.getHealth(marketplace, "PUBLIC_WEB");
    const isPublicRestricted = sourceHealth?.status === "ACCESS_RESTRICTED";
    const isPublicRateLimited = sourceHealth?.status === "RATE_LIMITED";

    const strategies: AcquisitionStrategyDefinition[] = [];

    // Evaluate Data Governance Policy
    const publicWebPolicy = SourcePolicyEnforcer.evaluateRequest({
      marketplace,
      sourceType: "PUBLIC_WEB",
      purpose: "PRODUCT_SEARCH",
    });

    // 1. Primary Public Strategies
    if (preferredSources.includes("PUBLIC_WEB") && !isPublicRestricted && publicWebPolicy.allowed) {
      if (researchType === "PRODUCT" || researchType === "RADAR") {
        strategies.push({
          id: "PUBLIC_SEARCH_HTML",
          name: "Public HTML Search Extraction",
          marketplace,
          researchType,
          priority: isPublicRateLimited ? 30 : 10,
          sourceType: "PUBLIC_WEB",
          cost: "FREE",
          risk: "LOW",
          expectedSignals: ["title", "price", "currency", "imageUrl", "externalId", "rating", "reviewCount", "shop"],
          enabled: true,
          requiresAuth: false,
          description: "Parses live public search cards and semantic DOM attributes.",
        });

        strategies.push({
          id: "STRUCTURED_JSON_LD",
          name: "Structured JSON-LD Schema Extraction",
          marketplace,
          researchType,
          priority: isPublicRateLimited ? 35 : 15,
          sourceType: "PUBLIC_WEB",
          cost: "FREE",
          risk: "LOW",
          expectedSignals: ["name", "price", "currency", "image", "ratingValue", "reviewCount", "brand", "seller"],
          enabled: true,
          requiresAuth: false,
          description: "Extracts schema.org/Product and schema.org/ItemList structured data blocks.",
        });
      } else if (researchType === "KEYWORD") {
        strategies.push({
          id: "KEYWORD_HARVEST_PARSE",
          name: "Public Listing Token Harvesting",
          marketplace,
          researchType,
          priority: 10,
          sourceType: "PUBLIC_WEB",
          cost: "FREE",
          risk: "LOW",
          expectedSignals: ["keywords", "listingFrequency", "averagePrice", "clusters", "tags"],
          enabled: true,
          requiresAuth: false,
          description: "Harvests empirical tokens, tags, and category associations from public search results.",
        });
      } else if (researchType === "CATEGORY") {
        strategies.push({
          id: "CATEGORY_TAXONOMY_CRAWL",
          name: "Category Taxonomy Yield Aggregation",
          marketplace,
          researchType,
          priority: 10,
          sourceType: "PUBLIC_WEB",
          cost: "FREE",
          risk: "LOW",
          expectedSignals: ["categoryName", "totalListings", "priceDistribution", "opportunityDistribution"],
          enabled: true,
          requiresAuth: false,
          description: "Aggregates public category catalog yield and percentile price distributions.",
        });
      } else if (researchType === "SHOP") {
        strategies.push({
          id: "PUBLIC_SEARCH_HTML",
          name: "Public Shop Profile Extraction",
          marketplace,
          researchType,
          priority: 10,
          sourceType: "PUBLIC_WEB",
          cost: "FREE",
          risk: "LOW",
          expectedSignals: ["shopName", "activeListings", "reviewCount", "sampleProducts", "priceRange"],
          enabled: true,
          requiresAuth: false,
          description: "Extracts public seller catalog and lifetime reviews.",
        });
      } else if (researchType === "NICHE") {
        strategies.push({
          id: "PUBLIC_SEARCH_HTML",
          name: "Multi-Signal Niche Aggregation",
          marketplace,
          researchType,
          priority: 10,
          sourceType: "PUBLIC_WEB",
          cost: "FREE",
          risk: "LOW",
          expectedSignals: ["niches", "subcategories", "demandSignals", "competitionSignals"],
          enabled: true,
          requiresAuth: false,
          description: "Aggregates public product and keyword signals into coherent niche profiles.",
        });
      }
    }

    // 2. Secondary Official API Enrichment
    const connector = MarketplaceRegistry.tryGetConnector(marketplace);
    const hasApiCapability = connector && connector.capabilities.research;

    if (enableApi && preferredSources.includes("MARKETPLACE_API") && hasApiCapability) {
      strategies.push({
        id: "SECONDARY_OFFICIAL_API",
        name: "Official Marketplace API Enrichment",
        marketplace,
        researchType,
        priority: 50,
        sourceType: "MARKETPLACE_API",
        cost: "API_QUOTA",
        risk: "LOW",
        expectedSignals: ["price", "reviewCount", "category", "taxonomy", "officialMetadata"],
        enabled: true,
        requiresAuth: true,
        description: "Enriches public observations with official marketplace API metadata where credentials exist.",
      });
    }

    // 3. Tertiary Historical Database Fallback
    if (allowHistorical && preferredSources.includes("HISTORICAL_OBSERVATION")) {
      strategies.push({
        id: "TERTIARY_HISTORICAL_DB",
        name: "SellerSalt Observation Store Fallback",
        marketplace,
        researchType,
        priority: 90,
        sourceType: "HISTORICAL_OBSERVATION",
        cost: "DATABASE_READ",
        risk: "LOW",
        expectedSignals: ["price", "rating", "reviewCount", "title", "opportunityScore"],
        enabled: true,
        requiresAuth: false,
        description: "Retrieves previously observed and fingerprinted marketplace records from PostgreSQL store.",
      });
    }

    // Sort by priority ascending (lowest number = highest priority)
    strategies.sort((a, b) => a.priority - b.priority);

    const primaryStrategy = strategies[0] || {
      id: "TERTIARY_HISTORICAL_DB",
      name: "Fallback Historical Store",
      marketplace,
      researchType,
      priority: 100,
      sourceType: "HISTORICAL_OBSERVATION",
      cost: "DATABASE_READ",
      risk: "LOW",
      expectedSignals: [],
      enabled: true,
      requiresAuth: false,
      description: "Default fallback when all live strategies are unavailable.",
    };

    const fallbackStrategies = strategies.slice(1);

    return {
      marketplace,
      researchType,
      strategies,
      primaryStrategy,
      fallbackStrategies,
      sourceHealth,
    };
  }
}
