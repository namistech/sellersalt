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
  constructor(message: string) {
    super(`[SellerSalt Compliance Guard] ${message}`);
    this.name = "AcquisitionComplianceError";
  }
}

/**
 * Validates that an outbound public web acquisition request complies with safety rules.
 */
export function validateAcquisitionCompliance(url: string, headers?: Record<string, string>): void {
  if (!url || typeof url !== "string") {
    throw new AcquisitionComplianceError("Invalid target URL provided.");
  }

  const lowerUrl = url.toLowerCase();

  // Guard against internal network SSRF
  if (
    lowerUrl.includes("localhost") ||
    lowerUrl.includes("127.0.0.1") ||
    lowerUrl.includes("169.254.169.254") ||
    lowerUrl.includes("::1")
  ) {
    throw new AcquisitionComplianceError("Access to internal/private networks is strictly prohibited.");
  }

  // Guard against authenticated private seller dashboard endpoints
  if (
    lowerUrl.includes("etsy.com/your/shops") ||
    lowerUrl.includes("sellercentral.amazon.com") ||
    lowerUrl.includes("my.ebay.com") ||
    lowerUrl.includes("seller.walmart.com") ||
    lowerUrl.includes("seller-us.tiktok.com")
  ) {
    throw new AcquisitionComplianceError(
      "Direct scraping of authenticated seller portals is strictly prohibited. Use OAuth SellerChannels."
    );
  }
}
