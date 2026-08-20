/**
 * SellerSalt Responsible Public Page Fetcher
 * 
 * Fetches public HTML/JSON with rate limiting, timeouts, response size limits,
 * transparent caching, and exponential backoff retry policies.
 */

import { globalRateLimiter, DomainRateLimiter } from "./rate-limiter";
import type { PageFetchOptions, PageFetchResponse } from "./contracts";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (SellerSalt Commerce Research Bot/1.0; +https://sellersalt.com/bot)";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CacheEntry {
  response: PageFetchResponse;
  expiresAt: number;
}

export class PublicPageFetcher {
  private cache = new Map<string, CacheEntry>();
  private rateLimiter: DomainRateLimiter;

  constructor(rateLimiter: DomainRateLimiter = globalRateLimiter) {
    this.rateLimiter = rateLimiter;
  }

  private getCacheKey(url: string): string {
    return url.trim();
  }

  /**
   * Fetches a public page with rate limiting, caching, and retry.
   */
  async fetchPage(url: string, options: PageFetchOptions = {}): Promise<PageFetchResponse> {
    const cacheKey = this.getCacheKey(url);
    const now = Date.now();

    // 1. Check in-memory cache unless bypassed
    if (!options.bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return { ...cached.response, isCached: true };
      }
    }

    const maxRetries = options.maxRetries ?? 2;
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      try {
        await this.rateLimiter.acquire(url);

        const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const headers: Record<string, string> = {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          ...(options.headers || {}),
        };

        const res = await fetch(url, {
          method: "GET",
          headers,
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeoutId);

        const statusCode = res.status;

        // Transient error check (429 Rate Limit or 5xx Server Errors)
        if ((statusCode === 429 || statusCode >= 500) && attempt < maxRetries) {
          this.rateLimiter.release(url);
          const backoff = this.rateLimiter.getBackoffDelayMs(attempt);
          await new Promise((r) => setTimeout(r, backoff));
          attempt++;
          continue;
        }

        const rawHeaders: Record<string, string> = {};
        res.headers.forEach((val, key) => {
          rawHeaders[key.toLowerCase()] = val;
        });

        let html = "";
        try {
          html = await res.text();
        } catch (readErr) {
          html = "";
        }

        const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
        if (html.length > maxBytes) {
          html = html.substring(0, maxBytes);
        }

        const pageResponse: PageFetchResponse = {
          url,
          statusCode,
          html,
          headers: rawHeaders,
          isCached: false,
          fetchedAt: new Date(),
        };

        // Cache successful 200 responses
        if (statusCode === 200) {
          this.cache.set(cacheKey, {
            response: pageResponse,
            expiresAt: now + DEFAULT_CACHE_TTL_MS,
          });
        }

        this.rateLimiter.release(url);
        return pageResponse;
      } catch (err: any) {
        this.rateLimiter.release(url);
        lastError = err;

        if (attempt < maxRetries) {
          const backoff = this.rateLimiter.getBackoffDelayMs(attempt);
          await new Promise((r) => setTimeout(r, backoff));
          attempt++;
          continue;
        }

        break;
      }
    }

    // Return structured failure response rather than crashing
    return {
      url,
      statusCode: 0,
      html: "",
      headers: {},
      isCached: false,
      fetchedAt: new Date(),
    };
  }

  /**
   * Clears the in-memory page fetch cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const globalPageFetcher = new PublicPageFetcher();
