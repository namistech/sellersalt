/**
 * SellerSalt Responsible Public Web Rate Limiter
 * 
 * Enforces per-domain token bucket throttling, concurrency limits, and exponential backoff
 * to prevent aggressive crawling or service degradation against external domains.
 */

export interface DomainRateLimitConfig {
  maxRequestsPerSecond: number;
  burstCapacity: number;
  maxConcurrent: number;
  minDelayMs: number;
}

interface DomainBucket {
  tokens: number;
  lastRefillMs: number;
  activeRequests: number;
}

const DEFAULT_CONFIG: DomainRateLimitConfig = {
  maxRequestsPerSecond: 2, // Conservative 2 req/sec
  burstCapacity: 4,
  maxConcurrent: 2,
  minDelayMs: 300,
};

const DOMAIN_CONFIGS: Record<string, DomainRateLimitConfig> = {
  "etsy.com": {
    maxRequestsPerSecond: 2,
    burstCapacity: 4,
    maxConcurrent: 2,
    minDelayMs: 400,
  },
  "amazon.com": {
    maxRequestsPerSecond: 1,
    burstCapacity: 2,
    maxConcurrent: 1,
    minDelayMs: 1000,
  },
  "ebay.com": {
    maxRequestsPerSecond: 2,
    burstCapacity: 4,
    maxConcurrent: 2,
    minDelayMs: 500,
  },
};

export class DomainRateLimiter {
  private buckets = new Map<string, DomainBucket>();
  private domainConfigs: Record<string, DomainRateLimitConfig>;

  constructor(customConfigs: Record<string, DomainRateLimitConfig> = {}) {
    this.domainConfigs = { ...DOMAIN_CONFIGS, ...customConfigs };
  }

  private getDomainKey(urlOrDomain: string): string {
    try {
      if (urlOrDomain.startsWith("http://") || urlOrDomain.startsWith("https://")) {
        const hostname = new URL(urlOrDomain).hostname.toLowerCase();
        // Normalize www.etsy.com -> etsy.com
        return hostname.replace(/^www\./, "");
      }
      return urlOrDomain.toLowerCase().replace(/^www\./, "");
    } catch {
      return "default";
    }
  }

  private getConfig(domainKey: string): DomainRateLimitConfig {
    return this.domainConfigs[domainKey] || DEFAULT_CONFIG;
  }

  private getBucket(domainKey: string, config: DomainRateLimitConfig): DomainBucket {
    let bucket = this.buckets.get(domainKey);
    const now = Date.now();

    if (!bucket) {
      bucket = {
        tokens: config.burstCapacity,
        lastRefillMs: now,
        activeRequests: 0,
      };
      this.buckets.set(domainKey, bucket);
      return bucket;
    }

    // Refill tokens based on elapsed time
    const elapsedMs = now - bucket.lastRefillMs;
    const tokensToAdd = (elapsedMs / 1000) * config.maxRequestsPerSecond;

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(config.burstCapacity, bucket.tokens + tokensToAdd);
      bucket.lastRefillMs = now;
    }

    return bucket;
  }

  /**
   * Acquires permission to execute a request against the target domain.
   * Returns immediately if a token is available, or delays until a token is ready.
   */
  async acquire(urlOrDomain: string): Promise<void> {
    const domainKey = this.getDomainKey(urlOrDomain);
    const config = this.getConfig(domainKey);

    while (true) {
      const bucket = this.getBucket(domainKey, config);

      if (bucket.activeRequests >= config.maxConcurrent) {
        // Wait for a concurrent slot
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        bucket.activeRequests += 1;
        // Enforce minimum gap between consecutive requests
        await new Promise((resolve) => setTimeout(resolve, config.minDelayMs));
        return;
      }

      // Calculate time to wait for 1 token
      const missingTokens = 1 - bucket.tokens;
      const waitMs = Math.ceil((missingTokens / config.maxRequestsPerSecond) * 1000);
      await new Promise((resolve) => setTimeout(resolve, Math.max(50, waitMs)));
    }
  }

  /**
   * Releases an active concurrent request slot.
   */
  release(urlOrDomain: string): void {
    const domainKey = this.getDomainKey(urlOrDomain);
    const bucket = this.buckets.get(domainKey);
    if (bucket && bucket.activeRequests > 0) {
      bucket.activeRequests -= 1;
    }
  }

  /**
   * Computes exponential backoff delay with jitter for retry on HTTP 429/503.
   */
  getBackoffDelayMs(attempt: number, baseDelayMs = 1000, maxDelayMs = 10000): number {
    const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
    const jitter = Math.floor(Math.random() * (exponential * 0.2));
    return exponential + jitter;
  }
}

export const globalRateLimiter = new DomainRateLimiter();
