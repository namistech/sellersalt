/**
 * SellerSalt Public Web Acquisition Contracts
 * 
 * Defines standard interfaces for marketplace-independent public web observation adapters,
 * rate limiters, structured data parsers, and page fetchers.
 */

import type {
  MarketplaceId,
  NormalizedProduct,
  MarketplaceShopStats,
  SignalProvenance,
  DataSourceType,
} from "../types";

export interface PublicSearchQuery {
  query: string;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  categoryId?: string;
  categoryPath?: string[];
  organizationId?: string;
}

export interface PublicAcquisitionResult<T> {
  success: boolean;
  marketplace: MarketplaceId;
  items: T[];
  sourceUrl?: string;
  sourceType: DataSourceType;
  provenance: SignalProvenance;
  rateLimitRemaining?: number;
  error?: string;
  statusCode?: number;
  fetchedAt: Date;
}

export interface PageFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  bypassCache?: boolean;
  maxRetries?: number;
}

export interface PageFetchResponse {
  url: string;
  statusCode: number;
  html: string;
  headers: Record<string, string>;
  isCached: boolean;
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
  rating?: number;
  reviewCount?: number;
  favoritesCount?: number;
  tags?: string[];
}

/**
 * Common contract for all marketplace-specific public web acquisition adapters.
 */
export interface PublicWebAcquisitionAdapter {
  readonly marketplace: MarketplaceId;
  readonly displayName: string;
  readonly domain: string;

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
}
