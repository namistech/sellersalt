/**
 * SellerSalt Canonical Market Entity Model & Types
 * 
 * Defines the core entities of the Proprietary Market Intelligence Graph:
 * PRODUCT, SELLER, CATEGORY, KEYWORD, NICHE, MARKETPLACE.
 * 
 * Strict Identity & Provenance Rules:
 * - Deterministic identity resolution based on marketplace-native IDs or normalized content fingerprints.
 * - Every entity maintains firstObservedAt, lastObservedAt, observationCount, and source lineage.
 * - Missing metrics remain strictly null / UNAVAILABLE.
 */

import type { MarketplaceId, SignalProvenance } from "../types";
import type { FreshnessEvaluation } from "../acquisition/freshness";

export type MarketEntityType =
  | "PRODUCT"
  | "SELLER"
  | "CATEGORY"
  | "KEYWORD"
  | "NICHE"
  | "MARKETPLACE";

export type EntityMatchConfidence =
  | "EXACT"            // Verified same external ID / ASIN / UPC / URL
  | "HIGH_CONFIDENCE"  // Matching brand, model, normalized title and price band
  | "PROBABLE"         // High token overlap, same category, similar price band
  | "POSSIBLE"         // Moderate token overlap, related category
  | "UNRESOLVED";      // Insufficient evidence to link

export type CrossMarketplaceMatchTier =
  | "SAME_PRODUCT"
  | "POSSIBLE_SAME_PRODUCT"
  | "RELATED_PRODUCT"
  | "UNRELATED"
  | "UNKNOWN";

export interface CanonicalBaseEntity {
  id: string; // Deterministic canonical ID
  entityType: MarketEntityType;
  marketplace?: MarketplaceId | "all";
  name: string;
  normalizedName: string;
  firstObservedAt: Date;
  lastObservedAt: Date;
  observationCount: number;
  freshness: FreshnessEvaluation;
  provenance: SignalProvenance;
  organizationId?: string;
}

export interface CanonicalProductEntity extends CanonicalBaseEntity {
  entityType: "PRODUCT";
  marketplace: MarketplaceId;
  externalId: string;
  fingerprint: string;
  title: string;
  price: number | null;
  currency: string | null;
  rating: number | null;
  reviewCount: number | null;
  favoritesCount: number | null;
  sellerId: string | null;
  sellerName: string | null;
  categoryPath: string[];
  attributes: Record<string, string | number | boolean>;
  url?: string;
  imageUrl?: string;
  latestOpportunityScore?: number | null;
  latestValidationVerdict?: string | null;
  momentum?: "RISING" | "ACCELERATING" | "STABLE" | "COOLING" | "DECLINING" | "INSUFFICIENT_DATA";
}

export interface CanonicalSellerEntity extends CanonicalBaseEntity {
  entityType: "SELLER";
  marketplace: MarketplaceId;
  sellerExternalId?: string;
  sellerName: string;
  observedActiveListings: number | null;
  observedTotalReviews: number | null;
  observedAverageRating: number | null;
  shopAgeMonths: number | null;
  specializedCategories: string[];
  establishedBarrier: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH" | "UNAVAILABLE";
  momentum?: "RISING" | "ACCELERATING" | "STABLE" | "COOLING" | "DECLINING" | "INSUFFICIENT_DATA";
}

export interface CanonicalCategoryEntity extends CanonicalBaseEntity {
  entityType: "CATEGORY";
  marketplace: MarketplaceId | "all";
  categoryPath: string[];
  observedCatalogCount: number;
  observedMinPrice: number | null;
  observedMedianPrice: number | null;
  observedMaxPrice: number | null;
  dominantKeywords: string[];
  sellerConcentrationIndex: number | null; // 0-100
  momentum?: "RISING" | "ACCELERATING" | "STABLE" | "COOLING" | "DECLINING" | "INSUFFICIENT_DATA";
}

export interface CanonicalKeywordEntity extends CanonicalBaseEntity {
  entityType: "KEYWORD";
  marketplace: MarketplaceId | "all";
  keyword: string;
  listingFrequencyPercent: number; // 0-100
  sellerPrevalencePercent?: number | null; // 0-100
  observedAveragePrice: number | null;
  demandProxyScore: number; // 0-100
  competitionProxy: "LOW" | "MODERATE" | "HIGH" | "UNAVAILABLE";
  searchVolume: null; // Strictly null without licensed feeds
  searchVolumeProvenance: "UNAVAILABLE";
  intentCategory: "MATERIAL_STYLE" | "RECIPIENT_OCCASION" | "PRODUCT_MODIFIER" | "GENERAL";
  associatedCategories: string[];
  momentum?: "RISING" | "ACCELERATING" | "STABLE" | "COOLING" | "DECLINING" | "INSUFFICIENT_DATA";
}

export interface CanonicalNicheEntity extends CanonicalBaseEntity {
  entityType: "NICHE";
  marketplace: MarketplaceId | "all";
  nicheName: string;
  coreKeywords: string[];
  productCount: number;
  sellerCount: number;
  medianPrice: number | null;
  priceRange: { min: number | null; max: number | null };
  demandProxyScore: number;
  competitionDensityIndex: number;
  barrierToEntry: "LOW" | "MODERATE" | "HIGH" | "UNAVAILABLE";
  opportunityScore: number | null;
  momentum?: "RISING" | "ACCELERATING" | "STABLE" | "COOLING" | "DECLINING" | "INSUFFICIENT_DATA";
}

export interface CanonicalMarketplaceEntity extends CanonicalBaseEntity {
  entityType: "MARKETPLACE";
  marketplace: MarketplaceId;
  totalProductsObserved: number;
  totalSellersObserved: number;
  activeCategoriesCount: number;
  status: "AVAILABLE" | "PARTIAL" | "NOT_IMPLEMENTED" | "UNAVAILABLE";
  coverageQualityScore: number;
}

export type CanonicalMarketEntity =
  | CanonicalProductEntity
  | CanonicalSellerEntity
  | CanonicalCategoryEntity
  | CanonicalKeywordEntity
  | CanonicalNicheEntity
  | CanonicalMarketplaceEntity;
