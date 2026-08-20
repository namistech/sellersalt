/**
 * SellerSalt Public Web Acquisition Contracts
 * 
 * Defines standard interfaces for marketplace-independent public web observation adapters,
 * fine-grained capability flags, rate limiters, structured data parsers, and page fetchers.
 */

export type { DataSourceType } from "../types";
import type {
  MarketplaceId,
  NormalizedProduct,
  MarketplaceShopStats,
  SignalProvenance,
  DataSourceType,
  Category,
} from "../types";

export interface PublicWebCapabilities {
  productSearch: boolean;
  productDetail: boolean;
  shopResearch: boolean;
  keywordDiscovery: boolean;
  categoryDiscovery: boolean;
  reviews: boolean;
  ratings: boolean;
  pricing: boolean;
  images: boolean;
  taxonomy: boolean;
  engagement: boolean;
  salesEstimation: boolean;
}

export interface PublicSearchQuery {
  query: string;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  categoryId?: string;
  categoryPath?: string[];
  organizationId?: string;
}

export type AcquisitionFailureReason =
  | "ACCESS_RESTRICTED"
  | "RATE_LIMITED"
  | "PARSE_FAILURE"
  | "TIMEOUT"
  | "UNSUPPORTED_PAGE"
  | "NO_DATA"
  | "MALFORMED_RESPONSE"
  | "NETWORK_ERROR"
  | "NOT_IMPLEMENTED";

export interface PublicAcquisitionResult<T> {
  success: boolean;
  marketplace: MarketplaceId;
  items: T[];
  sourceUrl?: string;
  sourceType: DataSourceType;
  provenance: SignalProvenance;
  rateLimitRemaining?: number;
  error?: string;
  failureReason?: AcquisitionFailureReason;
  statusCode?: number;
  fetchedAt: Date;
}

export interface PageFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  bypassCache?: boolean;
  maxRetries?: number;
  maxRedirects?: number;
  marketplace?: MarketplaceId;
}

export interface PageFetchResponse {
  url: string;
  statusCode: number;
  html: string;
  headers: Record<string, string>;
  isCached: boolean;
  redirectsFollowed?: number;
  failureReason?: AcquisitionFailureReason;
  errorMessage?: string;
  fetchedAt: Date;
}

export interface ParsedJsonLdProduct {
  name?: string;
  description?: string;
  sku?: string;
  image?: string | string[];
  price?: number;
  currency?: string;
  ratingValue?: number;
  reviewCount?: number;
  brandName?: string;
  sellerName?: string;
  sellerUrl?: string;
  url?: string;
  categoryPath?: string[];
  rawJsonLd?: any;
}

export interface ParsedOpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  priceAmount?: number;
  priceCurrency?: string;
  [key: string]: string | number | undefined;
}

export interface ParsedListingCard {
  externalId: string;
  title: string;
  url: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  shopName?: string;
  shopUrl?: string;
  shop?: {
    name?: string;
    url?: string;
  };
  rating?: number;
  reviewCount?: number;
  favoritesCount?: number;
  tags?: string[];
}

export interface PublicKeywordHarvestResult {
  query: string;
  marketplace: MarketplaceId;
  relatedKeywords: Array<{
    keyword: string;
    occurrenceCount: number;
    listingFrequency: number;
    demandProxy: number;
    demandTier: "HIGH" | "MEDIUM" | "LOW";
  }>;
  topTags: Array<{ tag: string; count: number }>;
  observedListingsCount: number;
  averagePrice: number | null;
  demandProxyScore: number;
  fetchedAt: Date;
}

export interface MergedProductObservation {
  product: NormalizedProduct;
  sources: DataSourceType[];
  isEnriched: boolean;
  fieldProvenance: Record<string, DataSourceType>;
}

/**
 * Common contract for all marketplace-specific public web acquisition adapters.
 */
export interface PublicWebAcquisitionAdapter {
  readonly marketplace: MarketplaceId;
  readonly displayName: string;
  readonly domain: string;
  readonly capabilities: PublicWebCapabilities;

  /**
   * Searches public marketplace listings via public search pages / structured metadata.
   */
  searchPublicProducts(query: PublicSearchQuery): Promise<PublicAcquisitionResult<NormalizedProduct>>;

  /**
   * Fetches a specific public listing / product by external ID or public URL.
   */
  fetchPublicProduct(externalIdOrUrl: string): Promise<PublicAcquisitionResult<NormalizedProduct>>;

  /**
   * Fetches public shop / seller profile statistics where publicly accessible.
   */
  fetchPublicShop?(shopExternalIdOrUrl: string): Promise<PublicAcquisitionResult<MarketplaceShopStats>>;

  /**
   * Harvests keyword signals, co-occurring phrases, and tags from public search results.
   */
  harvestPublicKeywords?(query: PublicSearchQuery): Promise<PublicAcquisitionResult<PublicKeywordHarvestResult>>;

  /**
   * Discovers category nodes from public category pages.
   */
  discoverPublicCategories?(queryOrNodeId?: string): Promise<PublicAcquisitionResult<Category>>;
}
