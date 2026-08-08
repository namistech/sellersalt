// Shared shape every marketplace connector implements. Anadash currently targets
// Etsy (live) and eBay (planned) as a focused product-hunting tool across the two
// platforms — keeping this interface stable is what makes eBay additive later
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

export interface ShopStats {
  shopExternalId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl?: string;
  totalSales?: number;
  reviewCount: number;
  reviewAverage?: number;
  activeListings: number;
  numFavorers?: number;
}

export interface MarketplaceConnector {
  type: string;
  testConnection(credentials: Record<string, string>): Promise<{ ok: boolean; message?: string }>;
  runSearch(
    credentials: Record<string, string>,
    config: SearchConfigInput
  ): Promise<ProspectResult[]>;
  getShopStats?(credentials: Record<string, string>, shopExternalId: string): Promise<ShopStats | null>;
}
