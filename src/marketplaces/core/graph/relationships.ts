/**
 * SellerSalt Market Intelligence Relationship Model
 * 
 * Defines canonical edge relationships connecting Products, Sellers, Categories,
 * Keywords, Niches, and Marketplaces with explicit provenance, confidence, and observation timelines.
 */

import type { MarketplaceId, SignalProvenance } from "../types";
import type { MarketEntityType, EntityMatchConfidence, CrossMarketplaceMatchTier } from "./entities";

export type MarketRelationshipType =
  | "PRODUCT_SOLD_BY_SELLER"
  | "PRODUCT_IN_CATEGORY"
  | "PRODUCT_USES_KEYWORD"
  | "PRODUCT_IN_NICHE"
  | "SELLER_OPERATES_ON_MARKETPLACE"
  | "SELLER_SPECIALIZES_IN_CATEGORY"
  | "KEYWORD_APPEARS_IN_PRODUCT"
  | "KEYWORD_ASSOCIATED_WITH_CATEGORY"
  | "KEYWORD_ASSOCIATED_WITH_NICHE"
  | "PRODUCT_COMPETES_WITH_PRODUCT"
  | "PRODUCT_RELATED_TO_PRODUCT"
  | "PRODUCT_MATCHED_ACROSS_MARKETPLACES"
  | "CATEGORY_BELONGS_TO_CATEGORY"
  | "NICHE_CONTAINS_CATEGORY"
  | "NICHE_CONTAINS_PRODUCT";

export interface MarketRelationshipEdge {
  id: string;
  sourceEntityId: string;
  sourceEntityType: MarketEntityType;
  targetEntityId: string;
  targetEntityType: MarketEntityType;
  relationshipType: MarketRelationshipType;
  marketplace?: MarketplaceId | "all";
  confidence: number; // 0-100
  matchConfidenceTier?: EntityMatchConfidence;
  crossMarketplaceTier?: CrossMarketplaceMatchTier;
  evidence: {
    matchingFields?: string[];
    tokenOverlapScore?: number;
    priceDeltaPercent?: number | null;
    coOccurrenceCount?: number;
    explanation?: string;
  };
  provenance: SignalProvenance;
  sourceObservationId?: string;
  sourceResearchRunId?: string;
  firstObservedAt: Date;
  lastObservedAt: Date;
  observationCount: number;
}

export interface SubgraphExtract {
  rootEntityId: string;
  rootEntityType: MarketEntityType;
  nodes: Array<{
    id: string;
    label: string;
    entityType: MarketEntityType;
    marketplace?: string;
    metrics?: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: MarketRelationshipType;
    confidence: number;
    label: string;
  }>;
  generatedAt: Date;
}
