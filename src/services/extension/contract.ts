/**
 * SellerSalt Browser Extension Integration Contract
 * 
 * Shared API specifications for the SellerSalt Seller Assistant browser extension.
 * Supports instant listing audit, shop velocity estimation, and 1-click Save to Planner.
 */

export interface ExtensionAnalyzeListingRequest {
  listingId: string;
  title: string;
  price: number;
  currency: string;
  tags: string[];
  imageUrl: string;
  shopName: string;
  shopId?: string;
  listingUrl: string;
}

export interface ExtensionAnalyzeListingResponse {
  opportunityScore: number;
  classification: "HIGH_OPPORTUNITY" | "MODERATE_OPPORTUNITY" | "SATURATED";
  estDailySales: number;
  estMonthlySales: number;
  estMonthlyRevenue: number;
  estNetProfit: number;
  profitMarginPercent: number;
  seoScore: number;
  isSavedToPlanner: boolean;
  provenanceBadge: "SELLERSALT_SCORE" | "ESTIMATED";
}

export interface ExtensionSaveToPlannerRequest {
  listing: ExtensionAnalyzeListingRequest;
  targetCategory?: string;
  notes?: string;
}

export interface ExtensionSaveToPlannerResponse {
  success: boolean;
  plannerItemId: string;
  message: string;
}
