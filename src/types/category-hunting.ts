/**
 * SellerSalt Category Hunting & Taxonomy Domain Types
 * 
 * Defines data structures for hierarchical buyer taxonomy trees,
 * category market benchmarks, price distribution percentiles,
 * saturation indices, and category intelligence profiles.
 */

import type { EtsyTaxonomyProperty, FlattenedTaxonomyNode } from "@/connectors/etsy/taxonomy";
import type { ProductHuntingResult } from "@/types/product-hunting";
import type { TagFrequencyItem } from "@/types/shop-research";

export interface CategoryPriceDistribution {
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  price10thPercentile: number;
  price90thPercentile: number;
  priceSpread: number;
}

export interface CategoryMarketBenchmarks {
  observedListingsCount: number; // [ACTUAL ETSY DATA] (Sampled from search supply)
  medianPrice: number; // [ESTIMATED]
  price10thPercentile: number; // [ESTIMATED]
  price90thPercentile: number; // [ESTIMATED]
  priceDistribution: CategoryPriceDistribution;
  avgDailySalesProxy: number; // [ESTIMATED]
  catalogYieldProxy: number; // [ESTIMATED] (sales/listing across observed stores)
  reviewSaturationAverage: number; // [ESTIMATED]
  nicheSaturationIndex: "LOW" | "MODERATE" | "HIGH" | "SATURATED"; // [SELLERSALT SCORE]
  opportunityScore: number; // [SELLERSALT SCORE] (0 - 100)
  verdictBadge: "PRIME OPPORTUNITY" | "BALANCED NICHE" | "COMPETITIVE SEGMENT" | "HIGH SATURATION";
  verdictColor: string;
  verdictSummary: string;
}

export interface CategoryStrategicAdvice {
  whyInteresting: string;
  whatToStudy: string;
  whatToAvoid: string;
  whatToDoNext: string;
}

export interface CategoryTaxonomyChild {
  id: number;
  name: string;
  level: number;
  childCount: number;
  fullPath: string;
}

export interface CategoryIntelligenceProfile {
  taxonomyId: number;
  name: string;
  level: number;
  fullPath: string;
  pathIds: number[];
  parentId: number | null;
  parentName: string | null;
  breadcrumb: Array<{ id: number; name: string }>;
  childCount: number;
  children: CategoryTaxonomyChild[];
  properties: EtsyTaxonomyProperty[];
  benchmarks: CategoryMarketBenchmarks;
  productSamples: ProductHuntingResult[];
  extractedKeywords: TagFrequencyItem[];
  strategicAdvice: CategoryStrategicAdvice;
}

export interface CategorySearchResponse {
  results: FlattenedTaxonomyNode[];
  total: number;
}
