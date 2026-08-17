/**
 * SellerSalt Etsy OAuth Redirect URI Resolver & Configuration Validator
 * 
 * Complies with Section 3:
 * - Environment-aware (development, staging, production)
 * - Exact path matching (/api/seller-channels/etsy/callback)
 * - Supports ETSY_REDIRECT_URI environment override
 * - Structured ETSY_OAUTH_CONFIGURATION_ERROR diagnostics
 */

export interface EtsyOAuthConfig {
  clientId: string;
  redirectUri: string;
  baseUrl: string;
  environment: "development" | "staging" | "production";
  isValid: boolean;
  error?: string;
  diagnosticCode?: "ETSY_CLIENT_ID_MISSING" | "ETSY_REDIRECT_URI_INVALID" | "ETSY_OAUTH_CONFIGURATION_ERROR";
}

export function resolveEtsyOAuthRedirectUri(options?: {
  overrideBaseUrl?: string;
  overrideRedirectUri?: string;
  reqHost?: string;
  reqProto?: string;
  // Admin-configured client ID (AppSetting `etsy_seller_client_id`), resolved
  // by the caller before invoking this helper. Takes priority over env vars
  // so `isValid` reflects whichever credential source is actually in use.
  overrideClientId?: string;
}): EtsyOAuthConfig {
  const envOverride = options?.overrideRedirectUri || process.env.ETSY_REDIRECT_URI;
  
  // Prioritize explicit overrideBaseUrl, then incoming reqHost (if provided, matching the current user's host),
  // then APP_URL, then non-localhost NEXTAUTH_URL, then NEXTAUTH_URL fallback.
  let rawBase = options?.overrideBaseUrl;
  if (!rawBase) {
    if (options?.reqHost) {
      const isLocal = options.reqHost.includes("localhost") || options.reqHost.includes("127.0.0.1");
      const proto = options.reqProto || (isLocal ? "http" : "https");
      rawBase = `${proto}://${options.reqHost}`;
    } else if (process.env.APP_URL) {
      rawBase = process.env.APP_URL;
    } else if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
      rawBase = process.env.NEXTAUTH_URL;
    } else {
      rawBase = process.env.NEXTAUTH_URL || "http://localhost:3000";
    }
  }

  const normalizedBase = rawBase.replace(/\/+$/, "");
  const clientId =
    options?.overrideClientId ||
    process.env.ETSY_SELLER_CLIENT_ID ||
    process.env.ETSY_CLIENT_ID ||
    process.env.ETSY_KEYSTRING ||
    process.env.ETSY_API_KEY ||
    "";

  // Determine environment
  let environment: "development" | "staging" | "production" = "development";
  if (normalizedBase.includes("sellersalt.com") || process.env.NODE_ENV === "production") {
    environment = "production";
  } else if (normalizedBase.includes("staging") || normalizedBase.includes("anadash.namis.tech")) {
    environment = "staging";
  }

  // Canonical redirect URI
  const redirectUri = envOverride
    ? envOverride.trim()
    : `${normalizedBase}/api/seller-channels/etsy/callback`;

  // Validation
  if (!clientId) {
    return {
      clientId: "",
      redirectUri,
      baseUrl: normalizedBase,
      environment,
      isValid: false,
      error: "Etsy Client ID (ETSY_CLIENT_ID / ETSY_KEYSTRING / AppSetting etsy_seller_client_id) is not configured.",
      diagnosticCode: "ETSY_CLIENT_ID_MISSING",
    };
  }

  try {
    const parsed = new URL(redirectUri);
    if (!parsed.protocol.startsWith("http")) {
      throw new Error("Redirect URI must use HTTP or HTTPS protocol.");
    }
  } catch (err: any) {
    return {
      clientId,
      redirectUri,
      baseUrl: normalizedBase,
      environment,
      isValid: false,
      error: `Invalid Etsy OAuth Redirect URI: ${err.message}`,
      diagnosticCode: "ETSY_REDIRECT_URI_INVALID",
    };
  }

  return {
    clientId,
    redirectUri,
    baseUrl: normalizedBase,
    environment,
    isValid: true,
  };
}

