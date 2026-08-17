/**
 * SellerSalt Etsy Open API v3 Hardened Client
 * 
 * Features:
 * - Centralized 8 req/sec queue ceiling (configurable via ETSY_REQUESTS_PER_SECOND)
 * - Transparent Redis TTL caching with in-memory fallback
 * - Structured exponential backoff with jitter & Retry-After support for 429 / 5xx
 * - Strict non-retryable handling for 4xx client errors
 * - Sanitized observability & PII/credential leak prevention
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from "axios";
import PQueue from "p-queue";
import { etsyCache, ETSY_CACHE_TTL } from "./cache";
import type {
  EtsyRawTaxonomyNode,
  EtsyTaxonomyProperty,
} from "./taxonomy";

const ETSY_BASE_URL = "https://openapi.etsy.com/v3/application";

// Configurable requests per second ceiling (Etsy safe limit is 8 req/sec)
const DEFAULT_REQUESTS_PER_SECOND = 8;
export function getEtsyRateLimitCeiling(): number {
  const envVal = process.env.ETSY_REQUESTS_PER_SECOND;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 10) return parsed;
  }
  return DEFAULT_REQUESTS_PER_SECOND;
}

export interface RequestOptions {
  bypassCache?: boolean;
  maxRetries?: number;
  organizationId?: string;
  sellerChannelId?: string;
}

export interface EtsyRequestLogMeta {
  path: string;
  method: string;
  status?: number;
  durationMs: number;
  isCached: boolean;
  retries: number;
}

export class EtsyApiError extends Error {
  public statusCode?: number;
  public path: string;
  public isRetryable: boolean;
  public retryCount: number;
  public responseData?: unknown;

  constructor(params: {
    message: string;
    path: string;
    statusCode?: number;
    isRetryable: boolean;
    retryCount: number;
    responseData?: unknown;
  }) {
    super(params.message);
    this.name = "EtsyApiError";
    this.path = params.path;
    this.statusCode = params.statusCode;
    this.isRetryable = params.isRetryable;
    this.retryCount = params.retryCount;
    this.responseData = params.responseData;
  }
}

/**
 * Checks if an HTTP error is transient and eligible for retry.
 */
export function isRetryableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  if (!status) {
    // Network / timeout errors
    const code = error.code;
    return (
      code === "ECONNABORTED" ||
      code === "ETIMEDOUT" ||
      code === "ECONNRESET" ||
      code === "ECONNREFUSED" ||
      code === "ENOTFOUND"
    );
  }
  // HTTP 429 Too Many Requests, or 5xx Server Errors
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

/**
 * Parses the Retry-After header from an HTTP response in milliseconds.
 */
export function parseRetryAfterHeader(header?: string | null): number | null {
  if (!header) return null;
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }
  // Try parsing as HTTP-date (RFC 2822)
  const dateMs = Date.parse(header);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null;
}

/**
 * Executes an asynchronous function with bounded exponential backoff and jitter.
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  path: string,
  maxRetries = 3,
  baseDelayMs = 500
): Promise<{ data: T; retries: number }> {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const data = await operation();
      return { data, retries: attempt };
    } catch (err: unknown) {
      const axiosErr = axios.isAxiosError(err) ? (err as AxiosError) : null;
      const status = axiosErr?.response?.status;
      const isRetryable = isRetryableError(err);

      if (!isRetryable || attempt >= maxRetries) {
        const errorMsg =
          (axiosErr?.response?.data as { error?: string })?.error ??
          axiosErr?.message ??
          String(err);

        throw new EtsyApiError({
          message: `Etsy API request failed on ${path} (${status ?? "Network Error"}): ${errorMsg}`,
          path,
          statusCode: status,
          isRetryable,
          retryCount: attempt,
          responseData: axiosErr?.response?.data,
        });
      }

      // Calculate backoff delay
      let delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 150;

      if (status === 429) {
        const retryAfterHeader = axiosErr?.response?.headers?.["retry-after"];
        const parsedRetryAfter = parseRetryAfterHeader(retryAfterHeader);
        if (parsedRetryAfter !== null) {
          delay = Math.min(parsedRetryAfter, 10000); // Cap wait at 10s
        }
      }

      attempt++;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new EtsyApiError({
    message: `Etsy API request exhausted retries on ${path}`,
    path,
    isRetryable: true,
    retryCount: attempt,
  });
}

export interface EtsyClient {
  ping: () => Promise<{ ok: boolean }>;
  searchListings: (
    params: {
      keywords?: string;
      min_price?: number;
      max_price?: number;
      limit?: number;
      offset?: number;
      sort_on?: string;
      sort_order?: string;
      taxonomy_id?: number;
    },
    options?: RequestOptions
  ) => Promise<{ count: number; results: any[] }>;
  getListing: (
    listingId: number | string,
    options?: RequestOptions
  ) => Promise<any>;
  getShop: (
    shopId: number | string,
    options?: RequestOptions
  ) => Promise<any>;
  getShopReviews: (
    shopId: number | string,
    params?: { limit?: number; offset?: number },
    options?: RequestOptions
  ) => Promise<{ count: number; results: any[] }>;
  getListingImages: (
    listingId: number | string,
    options?: RequestOptions
  ) => Promise<{ count: number; results: any[] }>;
  searchShopsByName: (
    shopName: string,
    options?: RequestOptions
  ) => Promise<{ count: number; results: any[] }>;
  getShopListings: (
    shopId: number | string,
    limit?: number,
    options?: RequestOptions
  ) => Promise<{ count: number; results: any[] }>;
  getBuyerTaxonomyNodes: (
    options?: RequestOptions
  ) => Promise<{ count: number; results: EtsyRawTaxonomyNode[] }>;
  getPropertiesByBuyerTaxonomyId: (
    taxonomyId: number | string,
    options?: RequestOptions
  ) => Promise<{ count: number; results: EtsyTaxonomyProperty[] }>;
  getSellerTaxonomyNodes: (
    options?: RequestOptions
  ) => Promise<{ count: number; results: EtsyRawTaxonomyNode[] }>;
}

/**
 * Creates a hardened Etsy API client with rate queue, caching, and retry logic.
 */
export function createEtsyClient(
  apiKey: string,
  sharedSecret?: string,
  customQueue?: PQueue
): EtsyClient {
  const rateCeiling = getEtsyRateLimitCeiling();
  const queue = customQueue ?? new PQueue({
    intervalCap: rateCeiling,
    interval: 1000,
    carryoverConcurrencyCount: false,
  });

  const http: AxiosInstance = axios.create({
    baseURL: ETSY_BASE_URL,
    headers: {
      "x-api-key": sharedSecret ? `${apiKey}:${sharedSecret}` : apiKey,
      Accept: "application/json",
    },
    timeout: 15000,
  });

  /**
   * Internal pipeline: Cache Lookup -> Queue -> Request with Retry -> Cache Store -> Return
   */
  async function request<T>(
    path: string,
    params: Record<string, unknown> = {},
    ttlSeconds?: number,
    options: RequestOptions = {}
  ): Promise<T> {
    const queryHash = etsyCache.hashParams(params);
    const cacheKey = etsyCache.buildKey({
      resource: path.replace(/^\//, "").replace(/\//g, ":"),
      queryHash,
      organizationId: options.organizationId,
      sellerChannelId: options.sellerChannelId,
    });

    // 1. Check cache if TTL is configured and cache not bypassed
    if (ttlSeconds && !options.bypassCache) {
      const cached = await etsyCache.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // 2. Schedule request through rate-limit queue with retry
    const startTime = Date.now();
    const result = (await queue.add(async () => {
      return executeWithRetry<T>(
        async () => {
          const res = await http.get<T>(path, { params });
          return res.data;
        },
        path,
        options.maxRetries ?? 3
      );
    })) as { data: T; retries: number };

    const { data } = result;
    const durationMs = Date.now() - startTime;

    // 3. Store in cache if TTL is specified
    if (ttlSeconds && data !== null && data !== undefined) {
      await etsyCache.set(cacheKey, data, ttlSeconds);
    }

    return data;
  }

  return {
    ping: async () => {
      await queue.add(() => http.get("/openapi-ping"));
      return { ok: true };
    },

    searchListings: (params, options) => {
      const p = {
        sort_on: "score",
        sort_order: "desc",
        limit: 50,
        includes: "Images",
        ...params,
      };
      return request<{ count: number; results: any[] }>(
        "/listings/active",
        p,
        ETSY_CACHE_TTL.SEARCH_LISTINGS,
        options
      );
    },

    getListing: (listingId, options) =>
      request(
        `/listings/${listingId}`,
        { includes: "Images,Shop" },
        ETSY_CACHE_TTL.LISTING_DETAIL,
        options
      ),

    getShop: (shopId, options) =>
      request(
        `/shops/${shopId}`,
        {},
        ETSY_CACHE_TTL.SHOP_PROFILE,
        options
      ),

    getShopReviews: (shopId, params = {}, options) =>
      request(
        `/shops/${shopId}/reviews`,
        params,
        ETSY_CACHE_TTL.SHOP_REVIEWS,
        options
      ),

    getListingImages: (listingId, options) =>
      request(
        `/listings/${listingId}/images`,
        {},
        ETSY_CACHE_TTL.LISTING_DETAIL,
        options
      ),

    searchShopsByName: (shopName, options) =>
      request(
        "/shops",
        { shop_name: shopName },
        ETSY_CACHE_TTL.SHOP_PROFILE,
        options
      ),

    getShopListings: (shopId, limit = 50, options) =>
      request(
        `/shops/${shopId}/listings/active`,
        { limit, sort_on: "score", sort_order: "desc", includes: "Images" },
        ETSY_CACHE_TTL.LISTING_DETAIL,
        options
      ),

    getBuyerTaxonomyNodes: (options) =>
      request<{ count: number; results: EtsyRawTaxonomyNode[] }>(
        "/buyer-taxonomy/nodes",
        {},
        ETSY_CACHE_TTL.TAXONOMY_NODES,
        options
      ),

    getPropertiesByBuyerTaxonomyId: (taxonomyId, options) =>
      request<{ count: number; results: EtsyTaxonomyProperty[] }>(
        `/buyer-taxonomy/nodes/${taxonomyId}/properties`,
        {},
        ETSY_CACHE_TTL.TAXONOMY_PROPERTIES,
        options
      ),

    getSellerTaxonomyNodes: (options) =>
      request<{ count: number; results: EtsyRawTaxonomyNode[] }>(
        "/seller-taxonomy/nodes",
        {},
        ETSY_CACHE_TTL.SELLER_TAXONOMY,
        options
      ),
  };
}
