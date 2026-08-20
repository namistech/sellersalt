/**
 * SellerSalt Multi-Dimensional Research Cache
 * 
 * In-memory and structured caching layer keyed by marketplace, query, research type,
 * source preference, and pagination parameters with domain-specific TTL policies.
 */

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  marketplace: string;
  query: string;
  type: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  size: number;
}

export const RESEARCH_CACHE_TTLS: Record<string, number> = {
  PRODUCT: 6 * 3600 * 1000,      // 6 hours
  RADAR: 6 * 3600 * 1000,        // 6 hours
  KEYWORD: 12 * 3600 * 1000,     // 12 hours
  SHOP: 24 * 3600 * 1000,        // 24 hours
  CATEGORY: 7 * 24 * 3600 * 1000, // 7 days
  NICHE: 6 * 3600 * 1000,        // 6 hours
};

export class ResearchCache {
  private static store = new Map<string, CacheEntry<any>>();
  private static stats: CacheStats = { hits: 0, misses: 0, sets: 0, size: 0 };

  public static buildKey(params: {
    marketplace: string;
    type: string;
    query?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): string {
    const normMarketplace = params.marketplace.toLowerCase();
    const normType = params.type.toUpperCase();
    const normQuery = (params.query || "").trim().toLowerCase();
    const page = params.page || 1;
    const limit = params.limit || 25;
    const sort = params.sort || "default";

    return `${normMarketplace}:${normType}:${normQuery}:p${page}:l${limit}:s${sort}`;
  }

  public static get<T>(params: {
    marketplace: string;
    type: string;
    query?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): T | null {
    const key = this.buildKey(params);
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.size = this.store.size;
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  public static set<T>(
    params: {
      marketplace: string;
      type: string;
      query?: string;
      page?: number;
      limit?: number;
      sort?: string;
    },
    data: T,
    customTtlMs?: number
  ): void {
    const key = this.buildKey(params);
    const ttl = customTtlMs ?? RESEARCH_CACHE_TTLS[params.type.toUpperCase()] ?? (6 * 3600 * 1000);
    const now = Date.now();

    this.store.set(key, {
      data,
      cachedAt: now,
      expiresAt: now + ttl,
      marketplace: params.marketplace,
      query: params.query || "",
      type: params.type,
    });

    this.stats.sets++;
    this.stats.size = this.store.size;
  }

  public static invalidate(params: { marketplace?: string; query?: string; type?: string }): number {
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      let matches = true;
      if (params.marketplace && entry.marketplace !== params.marketplace.toLowerCase()) matches = false;
      if (params.query && entry.query !== params.query.trim().toLowerCase()) matches = false;
      if (params.type && entry.type !== params.type.toUpperCase()) matches = false;

      if (matches) {
        this.store.delete(key);
        count++;
      }
    }
    this.stats.size = this.store.size;
    return count;
  }

  public static clear(): void {
    this.store.clear();
    this.stats.size = 0;
  }

  public static getStats(): CacheStats {
    return { ...this.stats, size: this.store.size };
  }
}
