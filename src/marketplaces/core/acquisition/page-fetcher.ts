/**
 * SellerSalt Responsible Public Page Fetcher
 * 
 * Fetches public HTML/JSON with domain rate limiting, timeouts, response size limits,
 * transparent caching, safe redirect verification, and exponential backoff retry policies.
 */

import { globalRateLimiter, DomainRateLimiter } from "./rate-limiter";
import { validateAcquisitionCompliance, CENTRAL_COMPLIANCE_POLICY, AcquisitionComplianceError } from "./compliance";
import type { PageFetchOptions, PageFetchResponse, AcquisitionFailureReason } from "./contracts";

const DEFAULT_USER_AGENT = CENTRAL_COMPLIANCE_POLICY.defaultUserAgent;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = CENTRAL_COMPLIANCE_POLICY.maxResponseBytes;
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DEFAULT_MAX_REDIRECTS = 3;

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
   * Clears in-memory page cache (useful in testing / resetting).
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Fetches a public page with rate limiting, caching, safe redirect validation, and retry.
   */
  async fetchPage(url: string, options: PageFetchOptions = {}): Promise<PageFetchResponse> {
    try {
      validateAcquisitionCompliance(url, options.headers, options.marketplace);
    } catch (err: any) {
      return {
        url,
        statusCode: 0,
        html: "",
        headers: {},
        isCached: false,
        failureReason: "ACCESS_RESTRICTED",
        errorMessage: err.message,
        fetchedAt: new Date(),
      };
    }

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
    const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
    let attempt = 0;

    while (attempt <= maxRetries) {
      let currentUrl = url;
      let redirectsFollowed = 0;
      let redirectAborted = false;
      let redirectAbortReason = "";

      try {
        await this.rateLimiter.acquire(currentUrl);

        while (redirectsFollowed <= maxRedirects) {
          const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const headers: Record<string, string> = {
            "User-Agent": DEFAULT_USER_AGENT,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            ...(options.headers || {}),
          };

          let res: Response;
          try {
            res = await fetch(currentUrl, {
              method: "GET",
              headers,
              signal: controller.signal,
              redirect: "manual", // Handle redirects manually for strict target verification
            });
          } finally {
            clearTimeout(timeoutId);
          }

          const statusCode = res.status;

          // 2. Handle HTTP Redirects (301, 302, 303, 307, 308)
          if ([301, 302, 303, 307, 308].includes(statusCode)) {
            const rawLocation = res.headers.get("location");
            if (!rawLocation) {
              break;
            }

            let nextUrl: string;
            try {
              nextUrl = new URL(rawLocation, currentUrl).href;
            } catch {
              redirectAborted = true;
              redirectAbortReason = `Malformed redirect target: ${rawLocation}`;
              break;
            }

            // CRITICAL: Revalidate redirect destination against domain safety policy
            try {
              validateAcquisitionCompliance(nextUrl, options.headers, options.marketplace);
            } catch (complianceErr: any) {
              redirectAborted = true;
              redirectAbortReason = `Redirect target blocked by domain safety guard: ${nextUrl}`;
              break;
            }

            redirectsFollowed++;
            currentUrl = nextUrl;
            continue;
          }

          // 3. Transient error check (429 Rate Limit or 5xx Server Errors)
          if ((statusCode === 429 || statusCode >= 500) && attempt < maxRetries) {
            this.rateLimiter.release(currentUrl);
            const baseBackoff = this.rateLimiter.getBackoffDelayMs(attempt);
            const jitterBackoff = Math.floor(baseBackoff * (0.8 + Math.random() * 0.4));
            await new Promise((r) => setTimeout(r, jitterBackoff));
            attempt++;
            break; // Break inner redirect loop to retry outer request
          }

          const rawHeaders: Record<string, string> = {};
          res.headers.forEach((val, key) => {
            rawHeaders[key.toLowerCase()] = val;
          });

          // Check Content-Type
          const contentType = (rawHeaders["content-type"] || "").toLowerCase();
          const isTextual =
            !contentType ||
            contentType.includes("text/") ||
            contentType.includes("json") ||
            contentType.includes("xml");

          let html = "";
          if (isTextual) {
            try {
              html = await res.text();
            } catch {
              html = "";
            }
          }

          const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
          if (html.length > maxBytes) {
            html = html.substring(0, maxBytes);
          }

          let failureReason: AcquisitionFailureReason | undefined;
          if (statusCode === 429) {
            failureReason = "RATE_LIMITED";
          } else if (statusCode === 403) {
            failureReason = "ACCESS_RESTRICTED";
          } else if (statusCode === 404) {
            failureReason = "NO_DATA";
          } else if (statusCode >= 500) {
            failureReason = "NETWORK_ERROR";
          }

          const pageResponse: PageFetchResponse = {
            url: currentUrl,
            statusCode,
            html,
            headers: rawHeaders,
            isCached: false,
            redirectsFollowed,
            failureReason,
            fetchedAt: new Date(),
          };

          // Cache successful 200 responses
          if (statusCode === 200) {
            this.cache.set(cacheKey, {
              response: pageResponse,
              expiresAt: now + DEFAULT_CACHE_TTL_MS,
            });
          }

          this.rateLimiter.release(currentUrl);
          return pageResponse;
        }

        if (redirectAborted) {
          this.rateLimiter.release(currentUrl);
          return {
            url: currentUrl,
            statusCode: 0,
            html: "",
            headers: {},
            isCached: false,
            redirectsFollowed,
            failureReason: "ACCESS_RESTRICTED",
            errorMessage: redirectAbortReason,
            fetchedAt: new Date(),
          };
        }
      } catch (err: any) {
        this.rateLimiter.release(currentUrl);
        const isTimeout = err.name === "AbortError" || err.message?.toLowerCase().includes("timeout");

        if (attempt < maxRetries) {
          const baseBackoff = this.rateLimiter.getBackoffDelayMs(attempt);
          const jitterBackoff = Math.floor(baseBackoff * (0.8 + Math.random() * 0.4));
          await new Promise((r) => setTimeout(r, jitterBackoff));
          attempt++;
          continue;
        }

        return {
          url: currentUrl,
          statusCode: 0,
          html: "",
          headers: {},
          isCached: false,
          failureReason: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
          errorMessage: err.message,
          fetchedAt: new Date(),
        };
      }
    }

    // Return structured failure response rather than crashing
    return {
      url,
      statusCode: 0,
      html: "",
      headers: {},
      isCached: false,
      failureReason: "NETWORK_ERROR",
      errorMessage: "Max retries exceeded",
      fetchedAt: new Date(),
    };
  }
}

export const globalPageFetcher = new PublicPageFetcher();
