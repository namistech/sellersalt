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
  shopName: string;
  shopUrl: string;
  shopAgeMonths: number;
  reviewCount: number;
  activeListings: number;
  reviewRatio: number;
  reviewVelocity: number;
  listingTitle: string;
  listingUrl: string;
  price: number;
}

export interface MarketplaceConnector {
  type: string;
  /** Validate stored credentials still work (used by the "Test connection" button). */
  testConnection(credentials: Record<string, string>): Promise<{ ok: boolean; message?: string }>;
  /** Run a full prospecting pass for one search config, returning matches only. */
  runSearch(
    credentials: Record<string, string>,
    config: SearchConfigInput
  ): Promise<ProspectResult[]>;
}
