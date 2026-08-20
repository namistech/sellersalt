/**
 * SellerSalt Application-Layer Rate Limiter
 * 
 * Provides sliding-window rate limiting for public endpoints, authentication routes,
 * and high-frequency intelligence APIs with tenant-aware and IP-aware keying.
 */

interface RateBucket {
  tokens: number[];
  lastReset: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

// In-memory bucket store
const BUCKET_STORE = new Map<string, number[]>();

export class RateLimiter {
  public static readonly TIERS = {
    PUBLIC: { limit: 100, windowSeconds: 60 },
    AUTH: { limit: 10, windowSeconds: 60 },
    RESEARCH: { limit: 60, windowSeconds: 60 },
    AI: { limit: 20, windowSeconds: 60 },
    BILLING: { limit: 15, windowSeconds: 60 },
  };

  /**
   * Checks whether a specific key has exceeded its rate limit.
   */
  public static check(
    key: string,
    limit: number,
    windowSeconds: number
  ): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    let timestamps = BUCKET_STORE.get(key) || [];

    // Filter out expired timestamps
    timestamps = timestamps.filter((ts) => ts > windowStart);

    if (timestamps.length >= limit) {
      const oldestInWindow = timestamps[0];
      const resetSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
      BUCKET_STORE.set(key, timestamps);

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds,
      };
    }

    // Add current timestamp
    timestamps.push(now);
    BUCKET_STORE.set(key, timestamps);

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - timestamps.length),
      resetSeconds: windowSeconds,
    };
  }

  /**
   * Clears the rate limit store (for testing).
   */
  public static clear(): void {
    BUCKET_STORE.clear();
  }
}
