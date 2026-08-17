/**
 * SellerSalt Shop SEO Audit Types
 * 
 * Defines structured interfaces for evaluating shop-level SEO health,
 * title consistency, 13-tag utilization, catalog keyword density, branding,
 * and merchandising completeness.
 */

import type { DataProvenanceType } from "./provenance";

export interface ShopSeoAuditInput {
  shopQuery?: string; // Shop URL, shop slug, or numeric shop ID
  shopName?: string;
  sellerChannelId?: string;
  save?: boolean;
}

export interface ShopSeoRecommendation {
  id: string;
  category: "BRANDING" | "TITLES" | "TAGS" | "IMAGES" | "CATEGORIES" | "MERCHANDISING";
  title: string;
  observedSignal: string;
  whyItMatters: string;
  recommendedAction: string;
  impactScore: number; // Points improvement potential
}

export interface ShopSeoDiagnosticItem {
  code: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  area: string;
  message: string;
  observedValue: string | number;
  targetValue: string | number;
  pointsDeducted: number;
}

export interface CompleteShopSeoAudit {
  shopId: string;
  shopName: string;
  shopUrl: string;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  title: string;
  announcement: string;

  // Composite Rubric Scores (0-100) — [SELLERSALT SCORE]
  overallShopSeoScore: number;
  brandingScore: number; // Title, announcement, icon, banner
  titleQualityScore: number; // Avg title length, keyword front-loading across listings
  tagUtilizationScore: number; // % of listings with all 13 tags utilized
  imageCompletenessScore: number; // % of listings with 5+ images
  categoryConsistencyScore: number; // Taxonomy alignment & section coverage
  merchandisingScore: number; // Policies, about section, shop message

  // Observed Actual Metrics — [ACTUAL ETSY DATA]
  actualData: {
    activeListingsCount: number;
    sampleListingsAudited: number;
    totalSalesLifetime: number | null;
    reviewCount: number;
    reviewAverage: number | null;
    hasIcon: boolean;
    hasBanner: boolean;
    hasAnnouncement: boolean;
    hasShopTitle: boolean;
    provenance: DataProvenanceType;
  };

  // Catalog Breakdown Statistics — [SELLERSALT SCORE]
  catalogMetrics: {
    perfect13TagListingPercent: number;
    avgTagsPerListing: number;
    avgTitleLength: number;
    shortTitlesCount: number; // < 70 chars
    optimalTitlesCount: number; // 80 - 140 chars
    listingsWithImageGapsCount: number; // < 5 images
    topRepeatedKeywords: Array<{ keyword: string; listingCount: number; frequencyPercent: number }>;
    missingKeywordOpportunities: string[];
    provenance: DataProvenanceType;
  };

  // Structured Diagnostics & Explainable Fix Recommendations
  diagnostics: ShopSeoDiagnosticItem[];
  recommendations: ShopSeoRecommendation[];

  auditedAt: string;
  provenance: DataProvenanceType;
}
