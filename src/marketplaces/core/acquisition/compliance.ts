/**
 * SellerSalt Centralized Acquisition Compliance & Safety Policy
 * 
 * Enforces mandatory architectural compliance rules for all marketplace data acquisition:
 * 1. ZERO CAPTCHA solving, bypassing, or circumvention.
 * 2. ZERO anti-bot evasion, browser fingerprint spoofing, or stealth automation.
 * 3. ZERO unauthorized private seller dashboard scraping.
 * 4. Honest User-Agent identification.
 * 5. Strict timeout and payload size bounds to protect system resources.
 * 6. Respect for HTTP 429/503 status codes and exponential backoff.
 */

import type { MarketplaceId } from "../types";

export interface AcquisitionCompliancePolicy {
  readonly allowCaptchaBypass: false;
  readonly allowAntiBotEvasion: false;
  readonly allowStealthBrowserSpoofing: false;
  readonly allowPrivateDashboardScraping: false;
  readonly allowCredentialHarvesting: false;
  readonly defaultUserAgent: string;
  readonly maxTimeoutMs: number;
  readonly maxResponseBytes: number;
  readonly defaultRateLimitPerSecond: number;
}

export const CENTRAL_COMPLIANCE_POLICY: AcquisitionCompliancePolicy = {
  allowCaptchaBypass: false,
  allowAntiBotEvasion: false,
  allowStealthBrowserSpoofing: false,
  allowPrivateDashboardScraping: false,
  allowCredentialHarvesting: false,
  defaultUserAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (SellerSalt Commerce Research Bot/1.0; +https://sellersalt.com/bot; research@sellersalt.com)",
  maxTimeoutMs: 15000,
  maxResponseBytes: 5 * 1024 * 1024, // 5 MB
  defaultRateLimitPerSecond: 2,
};

export class AcquisitionComplianceError extends Error {
  readonly code: string;
  constructor(message: string, code = "COMPLIANCE_VIOLATION") {
    super(`[SellerSalt Compliance Guard] ${message}`);
    this.name = "AcquisitionComplianceError";
    this.code = code;
  }
}

/**
 * Explicitly permitted public marketplace domain suffixes.
 */
export const ALLOWED_MARKETPLACE_DOMAINS: Record<string, string[]> = {
  etsy: ["etsy.com"],
  amazon: [
    "amazon.com",
    "amazon.co.uk",
    "amazon.ca",
    "amazon.de",
    "amazon.fr",
    "amazon.es",
    "amazon.it",
    "amazon.co.jp",
    "amazon.in",
  ],
  ebay: [
    "ebay.com",
    "ebay.co.uk",
    "ebay.ca",
    "ebay.de",
    "ebay.fr",
    "ebay.es",
    "ebay.it",
    "ebay.com.au",
  ],
  walmart: ["walmart.com", "walmart.ca"],
  tiktok_shop: ["tiktok.com"],
};

/**
 * Forbidden private / authenticated seller portals and internal endpoints.
 */
const FORBIDDEN_PATH_PATTERNS = [
  /etsy\.com\/your\/shops/i,
  /etsy\.com\/your\/account/i,
  /sellercentral\.amazon\./i,
  /my\.ebay\./i,
  /seller\.walmart\./i,
  /seller-us\.tiktok\.com/i,
  /seller\.tiktok\.com/i,
  /\/signin/i,
  /\/login/i,
  /\/admin/i,
  /\/account\/billing/i,
];

/**
 * Checks whether a hostname belongs to an allowed marketplace domain.
 */
export function isAllowedMarketplaceHost(hostname: string, marketplace?: MarketplaceId): boolean {
  if (!hostname || typeof hostname !== "string") return false;
  const cleanHost = hostname.toLowerCase().trim();

  // Guard against IP literals & localhost
  if (
    cleanHost === "localhost" ||
    cleanHost.endsWith(".localhost") ||
    cleanHost.endsWith(".local") ||
    cleanHost.endsWith(".internal") ||
    cleanHost.endsWith(".arpa") ||
    /^[0-9.]+$/.test(cleanHost) || // IPv4 literal
    cleanHost.startsWith("[") || // IPv6 bracket
    cleanHost.includes(":") // Port or unbracketed IPv6
  ) {
    return false;
  }

  const checkDomains = marketplace && ALLOWED_MARKETPLACE_DOMAINS[marketplace]
    ? ALLOWED_MARKETPLACE_DOMAINS[marketplace]
    : Object.values(ALLOWED_MARKETPLACE_DOMAINS).flat();

  return checkDomains.some(
    (allowed) => cleanHost === allowed || cleanHost.endsWith(`.${allowed}`)
  );
}

/**
 * Determines whether a URL is a legitimate, public marketplace research target.
 */
export function isAllowedMarketplaceUrl(url: string, marketplace?: MarketplaceId): boolean {
  if (!url || typeof url !== "string") return false;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }

  // 1. Strict Protocol Check (only http and https)
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  // 2. Strict Port Check (only standard ports allowed)
  if (parsed.port && parsed.port !== "80" && parsed.port !== "443" && parsed.port !== "") {
    return false;
  }

  // 3. Hostname Validation against Allowed Marketplaces
  if (!isAllowedMarketplaceHost(parsed.hostname, marketplace)) {
    return false;
  }

  // 4. Forbidden Private Portal Check
  const fullUrlString = parsed.href.toLowerCase();
  for (const forbiddenPattern of FORBIDDEN_PATH_PATTERNS) {
    if (forbiddenPattern.test(fullUrlString)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates that an outbound public web acquisition request complies with safety and SSRF rules.
 * Throws AcquisitionComplianceError if any constraint is violated.
 */
export function validateAcquisitionCompliance(
  url: string,
  headers?: Record<string, string>,
  marketplace?: MarketplaceId
): void {
  if (!url || typeof url !== "string") {
    throw new AcquisitionComplianceError("Invalid target URL provided.", "INVALID_URL");
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new AcquisitionComplianceError(`Malformed target URL: ${url}`, "MALFORMED_URL");
  }

  // 1. Protocol Validation
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AcquisitionComplianceError(
      `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted for public acquisition.`,
      "DISALLOWED_PROTOCOL"
    );
  }

  // 2. Port Validation
  if (parsed.port && parsed.port !== "80" && parsed.port !== "443" && parsed.port !== "") {
    throw new AcquisitionComplianceError(
      `Non-standard port "${parsed.port}" is not permitted for public acquisition.`,
      "NON_STANDARD_PORT"
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Private IP & SSRF Guard
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "169.254.169.254" ||
    hostname === "::1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    throw new AcquisitionComplianceError(
      "Access to private networks, loopback, or cloud metadata endpoints is strictly prohibited.",
      "SSRF_PROHIBITED"
    );
  }

  // 4. Allowed Domain Validation
  if (!isAllowedMarketplaceHost(hostname, marketplace)) {
    throw new AcquisitionComplianceError(
      `Domain "${hostname}" is not an authorized public marketplace research endpoint.`,
      "UNAUTHORIZED_DOMAIN"
    );
  }

  // 5. Private Seller Dashboard Guard
  const fullUrl = parsed.href.toLowerCase();
  for (const forbiddenPattern of FORBIDDEN_PATH_PATTERNS) {
    if (forbiddenPattern.test(fullUrl)) {
      throw new AcquisitionComplianceError(
        "Direct scraping of authenticated seller portals or private accounts is strictly prohibited. Use authorized SellerChannels.",
        "PRIVATE_PORTAL_PROHIBITED"
      );
    }
  }
}

/**
 * Validates whether a redirect URL from a public marketplace page is safe and permitted.
 */
export function isSafeRedirect(originalUrl: string, redirectUrl: string, marketplace?: MarketplaceId): boolean {
  if (!redirectUrl || typeof redirectUrl !== "string") return false;
  try {
    const resolvedUrl = new URL(redirectUrl, originalUrl).toString();
    return isAllowedMarketplaceUrl(resolvedUrl, marketplace);
  } catch {
    return false;
  }
}

