/**
 * SellerSalt Etsy API Caching Layer
 * 
 * Centralized Redis-backed caching with transparent in-memory fallback.
 * Enforces strict TTL policies and tenant isolation boundaries.
 */

import crypto from "node:crypto";
import IORedis from "ioredis";

// Standardized architectural TTL policies (in seconds)
export const ETSY_CACHE_TTL = {
  SEARCH_LISTINGS: 6 * 60 * 60, // 6 hours (21,600s)
  LISTING_DETAIL: 6 * 60 * 60, // 6 hours (21,600s)
  SHOP_PROFILE: 24 * 60 * 60, // 24 hours (86,400s)
  SHOP_REVIEWS: 24 * 60 * 60, // 24 hours (86,400s)
  TAXONOMY_NODES: 7 * 24 * 60 * 60, // 7 days (604,800s)
  TAXONOMY_PROPERTIES: 7 * 24 * 60 * 60, // 7 days (604,800s)
  SELLER_TAXONOMY: 7 * 24 * 60 * 60, // 7 days (604,800s)
} as const;

export interface CacheEntry<T> {
  data: T;
  cachedAt: number; // Unix timestamp ms
  expiresAt: number; // Unix timestamp ms
}

export interface EtsyCacheStats {
  hits: number;
  misses: number;
  writes: number;
  errors: number;
  inMemoryEntries: number;
}

export class EtsyApiCache {
  private redis: IORedis | null = null;
  private inMemoryFallback = new Map<string, CacheEntry<any>>();
  private stats: EtsyCacheStats = {
    hits: 0,
    misses: 0,
    writes: 0,
    errors: 0,
    inMemoryEntries: 0,
  };
  private isRedisHealthy = false;

  constructor(redisClient?: IORedis | null) {
    if (redisClient) {
      this.redis = redisClient;
      this.isRedisHealthy = true;
    } else if (process.env.REDIS_URL) {
      try {
        this.redis = new IORedis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          lazyConnect: true,
        });

        this.redis.on("connect", () => {
          this.isRedisHealthy = true;
        });

        this.redis.on("error", () => {
          this.isRedisHealthy = false;
          this.stats.errors++;
        });
      } catch {
        this.isRedisHealthy = false;
      }
    }
  }

  /**
   * Generates a deterministic hash for query parameters.
   */
  public hashParams(params: Record<string, unknown>): string {
    const keys = Object.keys(params).sort();
    const sortedObj: Record<string, unknown> = {};
    for (const key of keys) {
      const val = params[key];
      if (val !== undefined && val !== null && val !== "") {
        sortedObj[key] = val;
      }
    }
    return crypto.createHash("sha256").update(JSON.stringify(sortedObj)).digest("hex").slice(0, 16);
  }

  /**
   * Builds deterministic cache keys following standard namespace convention:
   * Public: `etsy:v1:public:{resource}:{identifier}:{paramHash}`
   * Tenant-isolated: `etsy:v1:tenant:{orgId}:channel:{channelId}:{resource}:{paramHash}`
   */
  public buildKey(params: {
    resource: string;
    identifier?: string | number;
    queryHash?: string;
    organizationId?: string;
    sellerChannelId?: string;
  }): string {
    const parts = ["etsy", "v1"];

    if (params.organizationId) {
      parts.push("tenant", params.organizationId);
      if (params.sellerChannelId) {
        parts.push("channel", params.sellerChannelId);
      }
    } else {
      parts.push("public");
    }

    parts.push(params.resource);

    if (params.identifier !== undefined && params.identifier !== null && params.identifier !== "") {
      parts.push(String(params.identifier));
    }

    if (params.queryHash) {
      parts.push(params.queryHash);
    }

    return parts.join(":");
  }

  /**
   * Retrieves an item from Redis or in-memory fallback.
   */
  public async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // 1. Try Redis if healthy
    if (this.redis && this.isRedisHealthy) {
      try {
        const raw = await this.redis.get(key);
        if (raw) {
          this.stats.hits++;
          const entry = JSON.parse(raw) as CacheEntry<T>;
          return entry.data;
        }
      } catch {
        this.stats.errors++;
        // Fall through to in-memory
      }
    }

    // 2. Try In-Memory Fallback
    const memEntry = this.inMemoryFallback.get(key);
    if (memEntry) {
      if (memEntry.expiresAt > now) {
        this.stats.hits++;
        return memEntry.data as T;
      }
      // Expired in-memory entry
      this.inMemoryFallback.delete(key);
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Sets an item in Redis and in-memory cache with specified TTL in seconds.
   */
  public async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      cachedAt: now,
      expiresAt: now + ttlSeconds * 1000,
    };

    this.stats.writes++;

    // 1. Always set in-memory for instant resilience
    this.inMemoryFallback.set(key, entry);
    this.stats.inMemoryEntries = this.inMemoryFallback.size;

    // 2. Set in Redis if healthy
    if (this.redis && this.isRedisHealthy) {
      try {
        await this.redis.set(key, JSON.stringify(entry), "EX", ttlSeconds);
      } catch {
        this.stats.errors++;
      }
    }
  }

  /**
   * Deletes a cache entry by exact key.
   */
  public async delete(key: string): Promise<void> {
    this.inMemoryFallback.delete(key);
    this.stats.inMemoryEntries = this.inMemoryFallback.size;

    if (this.redis && this.isRedisHealthy) {
      try {
        await this.redis.del(key);
      } catch {
        this.stats.errors++;
      }
    }
  }

  /**
   * Invalidates entries matching a specific prefix.
   */
  public async deleteByPrefix(prefix: string): Promise<void> {
    // In-memory purge
    for (const key of this.inMemoryFallback.keys()) {
      if (key.startsWith(prefix)) {
        this.inMemoryFallback.delete(key);
      }
    }
    this.stats.inMemoryEntries = this.inMemoryFallback.size;

    // Redis purge
    if (this.redis && this.isRedisHealthy) {
      try {
        const keys = await this.redis.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch {
        this.stats.errors++;
      }
    }
  }

  /**
   * Transparent get-or-fetch helper.
   */
  public async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number,
    bypassCache = false
  ): Promise<{ data: T; isCached: boolean }> {
    if (!bypassCache) {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return { data: cached, isCached: true };
      }
    }

    const fresh = await fetchFn();
    if (fresh !== undefined && fresh !== null) {
      await this.set(key, fresh, ttlSeconds);
    }
    return { data: fresh, isCached: false };
  }

  /**
   * Returns runtime metrics.
   */
  public getStats(): EtsyCacheStats {
    return {
      ...this.stats,
      inMemoryEntries: this.inMemoryFallback.size,
    };
  }

  /**
   * Clears in-memory cache (primarily for tests).
   */
  public clearInMemory(): void {
    this.inMemoryFallback.clear();
    this.stats.inMemoryEntries = 0;
  }
}

// Global default instance
export const etsyCache = new EtsyApiCache();
