/**
 * SellerSalt Shop Research & Competitor Intelligence Domain Types
 * 
 * Defines normalized models for the 8-section Shop Intelligence profile,
 * catalog yield analytics, long-tail tag frequency metrics, and
 * reverse-engineering strategic verdicts.
 */

import type { WinningShopSignal } from "@/services/intelligence/winning-signals";

export interface ShopIdentityOverview {
  shopExternalId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl: string | null;
  shopBannerUrl?: string | null;
  shopAgeMonths: number;
  createdDate: string;
  location?: string | null;
  isVacation?: boolean;
}

export interface ShopPerformanceKpis {
  totalSales: number; // [ACTUAL ETSY DATA]
  activeListings: number; // [ACTUAL ETSY DATA]
  reviewCount: number; // [ACTUAL ETSY DATA]
  reviewAverage: number | null; // [ACTUAL ETSY DATA]
  estDailySales: number; // [ESTIMATED]
  estMonthlySales: number; // [ESTIMATED]
  avgSellingRatio: number; // [ESTIMATED] (Sales / Active Listing)
  estMonthlyRevenue: number; // [ESTIMATED]
  estGrossProfit: number; // [ESTIMATED]
  avgObservedPrice: number; // [ESTIMATED]
}

export interface CatalogYieldAnalysis {
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  priceSpread: number;
  catalogEfficiency: "HIGH_YIELD" | "BALANCED" | "LOW_YIELD";
  topCategories: Array<{ category: string; count: number; percentage: number }>;
}

export interface TagFrequencyItem {
  tag: string;
  count: number;
  percentage: number;
  isLongTail: boolean;
  wordCount: number;
}

export interface ShopWinningListing {
  listingId: string;
  title: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  listingUrl: string;
  createdTimestamp: number;
  listingAgeDays: number;
  tags: string[];
  materials: string[];
  estDailySales: number;
  numFavorers: number | null;
  views: number | null;
  opportunityScore: number;
}

export interface StrategicShopVerdict {
  opportunityScore: number; // [SELLERSALT SCORE]
  verdictBadge: "EASY TO START" | "MODERATE TO COMPETE" | "HIGH BARRIER";
  verdictLabel: string;
  verdictColor: string;
  summary: string;
  whyInteresting: string;
  whatToStudy: string;
  whatToAvoid: string;
  whatToDoNext: string;
}

export interface ShopSnapshotTrendPoint {
  capturedAt: string;
  totalSales: number | null;
  reviewCount: number;
  reviewAverage: number | null;
  activeListings: number;
}

export interface CompleteShopIntelligenceProfile {
  identity: ShopIdentityOverview;
  kpis: ShopPerformanceKpis;
  verdict: StrategicShopVerdict;
  snapshots: ShopSnapshotTrendPoint[];
  catalog: CatalogYieldAnalysis;
  keywords: TagFrequencyItem[];
  topListings: ShopWinningListing[];
  signals: WinningShopSignal;
  isTracked: boolean;
  isFavorite: boolean;
}
