// Shared shape every marketplace connector (Etsy now; Amazon/AliExpress/Shopify
// sourcing later) implements. Keeping this stable is what makes phase 2 additive
// instead of a rewrite.

export interface SearchConfigInput {
  keywords: string[];
  minPrice: number;
  maxPrice: number;
  minShopAgeMonths: number;
  maxShopAgeMonths: number;
  minReviewCount: number;
}

export interface ProspectResult {
  keyword: string;
  shopExternalId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl?: string;
  shopAgeMonths: number;
  reviewCount: number;
  activeListings: number;
  reviewRatio: number;
  reviewVelocity: number;
  totalSales?: number;
  reviewAverage?: number;
  numFavorers?: number;
  avgSellingRatio?: number;
  estDailySales?: number;
  listingExternalId: string;
  listingTitle: string;
  listingUrl: string;
  listingImageUrl?: string;
  price: number;
}

export interface MarketplaceConnector {
  type: string;
  testConnection(credentials: Record<string, string>): Promise<{ ok: boolean; message?: string }>;
  runSearch(
    credentials: Record<string, string>,
    config: SearchConfigInput
  ): Promise<ProspectResult[]>;
}