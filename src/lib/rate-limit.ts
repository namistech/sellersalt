/**
 * SellerSalt Centralized Edge & Application Rate Limiter
 * 
 * Provides robust sliding-window rate limiting with route-specific quotas
 * across sensitive surfaces (Auth, Signup, Password Reset, Expensive Search,
 * Etsy API proxy, AI generation, Free Tools, Admin).
 */

export type RateLimitTier =
  | "AUTH"
  | "SIGNUP"
  | "PASSWORD_RESET"
  | "VERIFY_EMAIL"
  | "EXPENSIVE_SEARCH"
  | "ETSY_PROXY"
  | "AI_GENERATION"
  | "FREE_TOOLS"
  | "ADMIN"
  | "DEFAULT";

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  AUTH: { maxRequests: 10, windowSeconds: 60 }, // 10 attempts per minute per IP
  SIGNUP: { maxRequests: 5, windowSeconds: 3600 }, // 5 signups per hour per IP
  PASSWORD_RESET: { maxRequests: 4, windowSeconds: 900 }, // 4 resets per 15 minutes
  VERIFY_EMAIL: { maxRequests: 6, windowSeconds: 900 }, // 6 sends per 15 minutes
  EXPENSIVE_SEARCH: { maxRequests: 40, windowSeconds: 60 }, // 40 searches per minute
  ETSY_PROXY: { maxRequests: 30, windowSeconds: 60 }, // 30 requests per minute
  AI_GENERATION: { maxRequests: 15, windowSeconds: 60 }, // 15 calls per minute
  FREE_TOOLS: { maxRequests: 15, windowSeconds: 60 }, // 15 calls per minute
  ADMIN: { maxRequests: 120, windowSeconds: 60 }, // 120 requests per minute
  DEFAULT: { maxRequests: 60, windowSeconds: 60 },
};

// In-memory sliding window cache: Key -> Array of request timestamps (ms)
const memoryStore = new Map<string, number[]>();

// Periodically clean up expired entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of memoryStore.entries()) {
      const valid = timestamps.filter((t) => now - t < 3600 * 1000);
      if (valid.length === 0) {
        memoryStore.delete(key);
      } else {
        memoryStore.set(key, valid);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  headers: Record<string, string>;
}

/**
 * Extracts a client IP safely from request headers (Cloudflare, X-Forwarded-For, X-Real-IP).
 */
export function extractClientIp(req: Request): string {
  const headers = req.headers;
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    if (parts.length > 0 && parts[0].trim()) {
      return parts[0].trim();
    }
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  return "127.0.0.1";
}

/**
 * Checks and increments rate limit counter for a given identifier (IP, orgId, or userId).
 */
export function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = "DEFAULT"
): RateLimitResult {
  const config = RATE_LIMIT_TIERS[tier] || RATE_LIMIT_TIERS.DEFAULT;
  const key = `${tier}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const cutoff = now - windowMs;

  const timestamps = memoryStore.get(key) || [];
  const validTimestamps = timestamps.filter((t) => t > cutoff);

  if (validTimestamps.length >= config.maxRequests) {
    const oldest = validTimestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    const remaining = 0;

    return {
      success: false,
      limit: config.maxRequests,
      remaining,
      resetSeconds,
      headers: {
        "X-RateLimit-Limit": String(config.maxRequests),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetSeconds),
        "Retry-After": String(resetSeconds),
      },
    };
  }

  validTimestamps.push(now);
  memoryStore.set(key, validTimestamps);

  const remaining = Math.max(0, config.maxRequests - validTimestamps.length);
  const resetSeconds = config.windowSeconds;

  return {
    success: true,
    limit: config.maxRequests,
    remaining,
    resetSeconds,
    headers: {
      "X-RateLimit-Limit": String(config.maxRequests),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(resetSeconds),
    },
  };
}

export function resetRateLimitForTesting(identifier: string, tier: RateLimitTier = "DEFAULT") {
  const key = `${tier}:${identifier}`;
  memoryStore.delete(key);
}

