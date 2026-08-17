/**
 * SellerSalt Browser Extension Integration Contracts & Data Architecture
 * 
 * Shared API specifications for the SellerSalt Seller Assistant browser extension.
 * Supports:
 * - On Etsy listing page: Opportunity Score, demand velocity, competition, SEO audit, Save to Planner/Inbox, Next Best Action
 * - On Etsy shop page: Shop score, sales velocity, catalog yield, winning listings, Spy Shop
 * - On Etsy search results: Opportunity scanning, product comparison, breakout detection
 * 
 * Complies with Rule 1 (Never invent Etsy APIs), Rule 2 (Provenance), Rule 3 (Tenant isolation),
 * and Rule 5 (Explainable inputs).
 */

import type { DataProvenanceType } from "@/types/provenance";
import type { NextBestAction } from "@/services/intelligence/next-best-action";
import type { PlanTierKey } from "@/services/plans/plan-capabilities";

// --------------------------------------------------------------------------
// 1. Listing Page Contracts
// --------------------------------------------------------------------------

export interface ExtensionAnalyzeListingRequest {
  listingId: string;
  title: string;
  price: number;
  currency?: string;
  tags?: string[];
  description?: string;
  imageUrl?: string;
  shopName?: string;
  shopId?: string;
  shopAgeMonths?: number;
  shopReviewCount?: number;
  shopTotalSales?: number;
  listingUrl?: string;
  numFavorers?: number;
}

export interface ExtensionAnalyzeListingResponse {
  opportunityScore: number; // 0-100 [SELLERSALT SCORE]
  confidenceScore: number;
  classification: "EMERGING_WINNER" | "HIDDEN_GEM" | "HIGH_DEMAND_CROWDED" | "CONSISTENT_GROWTH";
  classificationLabel: string;
  
  demand: {
    estDailySales: number;
    estMonthlySales: number;
    estMonthlyRevenue: number;
    salesVelocityTrend: string;
  };
  
  competition: {
    reviewCount: number;
    activeListings: number;
    barrierLevel: "LOW" | "MODERATE" | "HIGH";
  };
  
  economics: {
    price: number;
    estCogs: number;
    estNetProfit: number;
    marginPercent: number;
  };
  
  seoScore: number;
  tagCount: number;
  tagSlotsRemaining: number;
  isSavedToPlanner: boolean;
  opportunityId?: string;
  
  provenance: DataProvenanceType;
  planAccess: {
    currentTier: PlanTierKey;
    isFullAccess: boolean;
    upgradeRequiredMessage?: string;
  };
  nextBestAction: NextBestAction;
}

// --------------------------------------------------------------------------
// 2. Shop Page Contracts
// --------------------------------------------------------------------------

export interface ExtensionAnalyzeShopRequest {
  shopId?: string;
  shopName: string;
  shopUrl?: string;
  activeListingsCount: number;
  reviewCount: number;
  reviewAverage?: number;
  totalSales?: number;
  shopAgeMonths?: number;
  sampleListingTitles?: string[];
}

export interface ExtensionAnalyzeShopResponse {
  shopScore: number; // 0-100 [SELLERSALT SCORE]
  estDailySales: number;
  estMonthlyRevenue: number;
  catalogYield: number; // sales per listing
  salesVelocityTrend: string;
  reviewMoatDays: number;
  isTrackedInSpy: boolean;
  
  winningListingHighlights: Array<{
    title: string;
    estDailySales: number;
    price: number;
  }>;
  
  provenance: DataProvenanceType;
  planAccess: {
    currentTier: PlanTierKey;
    canTrackMoreShops: boolean;
    upgradeRequiredMessage?: string;
  };
  nextBestAction: NextBestAction;
}

// --------------------------------------------------------------------------
// 3. Search Results Scanner Contracts
// --------------------------------------------------------------------------

export interface ExtensionSearchItemPayload {
  listingId: string;
  title: string;
  price: number;
  shopName: string;
  reviewCount?: number;
  imageUrl?: string;
  listingUrl?: string;
}

export interface ExtensionScanSearchRequest {
  searchQuery: string;
  items: ExtensionSearchItemPayload[];
  totalResultsCount?: number;
}

export interface ExtensionScanSearchResponse {
  searchQuery: string;
  totalScanned: number;
  averagePrice: number;
  topOpportunitiesCount: number;
  breakoutItems: Array<{
    listingId: string;
    title: string;
    price: number;
    opportunityScore: number;
    estDailySales: number;
    reason: string;
  }>;
  suggestedLongTailKeywords: string[];
  provenance: DataProvenanceType;
  planAccess: {
    currentTier: PlanTierKey;
    resultsUnlocked: number;
    totalResultsAvailable: number;
    upgradeBanner?: string;
  };
}

// --------------------------------------------------------------------------
// 4. Save Opportunity / Planner Contract
// --------------------------------------------------------------------------

export interface ExtensionSaveOpportunityRequest {
  listing: ExtensionAnalyzeListingRequest;
  notes?: string;
  targetCategory?: string;
  addToPlanner?: boolean;
}

export interface ExtensionSaveOpportunityResponse {
  success: boolean;
  opportunityId: string;
  plannerItemId?: string;
  isExistingUpdated: boolean;
  message: string;
  nextBestAction: NextBestAction;
}
