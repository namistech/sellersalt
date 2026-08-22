/**
 * SellerSalt Google Ads & Keyword Planner API Integration Service
 * 
 * Provides official search volume, monthly search distributions, competition index,
 * and CPC bid ranges directly from Google Ads API (Keyword Plan Service).
 * 
 * ZERO-FABRICATION CONTRACT:
 * - When credentials are unconfigured or API call fails, returns available: false and null volumes.
 * - Never fabricates fake monthly volumes from listing counts.
 */

import { getSettings } from "@/lib/app-settings";

export interface GoogleAdsCredentials {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  loginCustomerId?: string; // Manager Account (MCC) ID (10 digits)
  customerId?: string; // Target Operating Account ID (10 digits)
}

export interface KeywordPlannerMetric {
  term: string;
  avgMonthlySearches: number | null;
  competition: "LOW" | "MEDIUM" | "HIGH" | "UNAVAILABLE";
  competitionIndex: number | null; // 0 - 100
  lowTopOfPageBid: number | null; // e.g. 0.45 ($ USD)
  highTopOfPageBid: number | null; // e.g. 1.80 ($ USD)
  monthlySearchVolumes: Array<{
    year: number;
    month: string;
    searches: number;
  }>;
  source: "google_keyword_planner";
}

export interface KeywordPlannerResult {
  available: boolean;
  reason?: "CONFIGURED" | "REQUIRES_CREDENTIALS" | "API_ERROR";
  message?: string;
  metrics: Record<string, KeywordPlannerMetric>;
}

// In-memory token cache for Google OAuth access tokens
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export async function getGoogleAdsCredentials(): Promise<GoogleAdsCredentials | null> {
  const settings = await getSettings([
    "google_ads_developer_token",
    "google_ads_client_id",
    "google_ads_client_secret",
    "google_ads_refresh_token",
    "google_ads_login_customer_id",
    "google_ads_customer_id",
  ]);

  const developerToken = (settings.google_ads_developer_token || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim();
  const clientId = (settings.google_ads_client_id || process.env.GOOGLE_ADS_CLIENT_ID || "").trim();
  const clientSecret = (settings.google_ads_client_secret || process.env.GOOGLE_ADS_CLIENT_SECRET || "").trim();
  const refreshToken = (settings.google_ads_refresh_token || process.env.GOOGLE_ADS_REFRESH_TOKEN || "").trim();
  const loginCustomerId = (settings.google_ads_login_customer_id || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "")
    .replace(/[^0-9]/g, "")
    .trim();
  const customerId = (settings.google_ads_customer_id || process.env.GOOGLE_ADS_CUSTOMER_ID || "")
    .replace(/[^0-9]/g, "")
    .trim();

  const isConfigured = Boolean(
    developerToken &&
    clientId &&
    clientSecret &&
    refreshToken &&
    !developerToken.includes("placeholder") &&
    !clientId.includes("placeholder") &&
    !clientSecret.includes("placeholder") &&
    !refreshToken.includes("placeholder")
  );

  if (!isConfigured) return null;

  return {
    developerToken,
    clientId,
    clientSecret,
    refreshToken,
    loginCustomerId: loginCustomerId || undefined,
    customerId: customerId || undefined,
  };
}

export async function isKeywordPlannerConfigured(): Promise<boolean> {
  const creds = await getGoogleAdsCredentials();
  return creds !== null;
}

/**
 * Exchanges Google OAuth refresh token for a short-lived access token.
 */
export async function getGoogleAccessToken(creds: GoogleAdsCredentials): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60000) {
    return cachedAccessToken.token;
  }

  const tokenParams = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Google OAuth token refresh failed (${response.status}): ${errText || response.statusText}`);
  }

  const data = await response.json();
  const token = data.access_token;
  const expiresIn = (data.expires_in || 3600) * 1000;

  cachedAccessToken = {
    token,
    expiresAt: now + expiresIn,
  };

  return token;
}

/**
 * Tests the connection to the Google Ads API by calling listAccessibleCustomers.
 */
export async function testGoogleAdsConnection(): Promise<{
  ok: boolean;
  message: string;
  accessibleCustomers?: string[];
}> {
  const creds = await getGoogleAdsCredentials();
  if (!creds) {
    return {
      ok: false,
      message: "Google Ads credentials are not fully configured. Please fill in Developer Token, Client ID, Client Secret, and Refresh Token.",
    };
  }

  try {
    const accessToken = await getGoogleAccessToken(creds);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": creds.developerToken,
    };

    if (creds.loginCustomerId) {
      headers["login-customer-id"] = creds.loginCustomerId;
    }

    const response = await fetch("https://googleads.googleapis.com/v17/customers:listAccessibleCustomers", {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let parsedMessage = errText;
      try {
        const json = JSON.parse(errText);
        if (json.error?.message) {
          parsedMessage = json.error.message;
        }
      } catch {
        // use raw text
      }
      return {
        ok: false,
        message: `Google Ads API request failed (${response.status}): ${parsedMessage}`,
      };
    }

    const data = await response.json();
    const resourceNames: string[] = data.resourceNames || [];
    const customerIds = resourceNames.map((r) => r.replace("customers/", ""));

    return {
      ok: true,
      message: `Connection successful! Found ${customerIds.length} accessible customer account(s).`,
      accessibleCustomers: customerIds,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err.message || "Failed to establish connection with Google Ads API.",
    };
  }
}

/**
 * Fetches real keyword metrics (search volume, CPC, competition) from Google Keyword Planner.
 */
export async function fetchGoogleKeywordPlannerMetrics(
  keywords: string[]
): Promise<KeywordPlannerResult> {
  const uniqueTerms = Array.from(
    new Set(keywords.map((k) => k.toLowerCase().trim()).filter(Boolean))
  );

  if (uniqueTerms.length === 0) {
    return { available: true, metrics: {} };
  }

  const creds = await getGoogleAdsCredentials();
  if (!creds) {
    return {
      available: false,
      reason: "REQUIRES_CREDENTIALS",
      message: "Google Ads / Keyword Planner credentials not configured in Admin Integration Hub.",
      metrics: {},
    };
  }

  const targetCustomerId = creds.customerId || creds.loginCustomerId;
  if (!targetCustomerId) {
    return {
      available: false,
      reason: "REQUIRES_CREDENTIALS",
      message: "Google Ads Customer ID or Login Customer ID is required to generate keyword metrics.",
      metrics: {},
    };
  }

  try {
    const accessToken = await getGoogleAccessToken(creds);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": creds.developerToken,
      "Content-Type": "application/json",
    };

    if (creds.loginCustomerId) {
      headers["login-customer-id"] = creds.loginCustomerId;
    }

    // Call generateKeywordIdeas in batches of up to 20 keywords
    const metrics: Record<string, KeywordPlannerMetric> = {};
    const batchSize = 20;

    for (let i = 0; i < uniqueTerms.length; i += batchSize) {
      const batch = uniqueTerms.slice(i, i + batchSize);

      const payload = {
        keywordSeed: {
          keywords: batch,
        },
        keywordPlanNetwork: "GOOGLE_SEARCH",
        includeAdultKeywords: false,
      };

      const response = await fetch(
        `https://googleads.googleapis.com/v17/customers/${targetCustomerId}:generateKeywordIdeas`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        return {
          available: false,
          reason: "API_ERROR",
          message: `Google Keyword Planner API error (${response.status}): ${errText}`,
          metrics: {},
        };
      }

      const data = await response.json();
      const results = data.results || [];

      for (const item of results) {
        const text = (item.text || "").toLowerCase().trim();
        const m = item.keywordIdeaMetrics;

        if (text && m) {
          const avgMonthly = m.avgMonthlySearches ? parseInt(String(m.avgMonthlySearches), 10) : null;
          const compLevel =
            m.competition === "HIGH" ? "HIGH" : m.competition === "MEDIUM" ? "MEDIUM" : m.competition === "LOW" ? "LOW" : "UNAVAILABLE";
          const compIndex = m.competitionIndex !== undefined ? parseInt(String(m.competitionIndex), 10) : null;
          const lowBid = m.lowTopOfPageBidMicros ? parseInt(String(m.lowTopOfPageBidMicros), 10) / 1000000 : null;
          const highBid = m.highTopOfPageBidMicros ? parseInt(String(m.highTopOfPageBidMicros), 10) / 1000000 : null;

          const monthlyVols = (m.monthlySearchVolumes || []).map((v: any) => ({
            year: parseInt(String(v.year), 10),
            month: String(v.month),
            searches: parseInt(String(v.monthlySearches || 0), 10),
          }));

          metrics[text] = {
            term: text,
            avgMonthlySearches: isNaN(avgMonthly as number) ? null : avgMonthly,
            competition: compLevel,
            competitionIndex: isNaN(compIndex as number) ? null : compIndex,
            lowTopOfPageBid: lowBid,
            highTopOfPageBid: highBid,
            monthlySearchVolumes: monthlyVols,
            source: "google_keyword_planner",
          };
        }
      }
    }

    return {
      available: true,
      reason: "CONFIGURED",
      metrics,
    };
  } catch (err: any) {
    return {
      available: false,
      reason: "API_ERROR",
      message: err.message || "Failed to fetch keyword planning data from Google Ads API.",
      metrics: {},
    };
  }
}
