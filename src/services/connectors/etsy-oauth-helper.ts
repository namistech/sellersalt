/**
 * SellerSalt Etsy OAuth Redirect URI Resolver & Configuration Validator
 * 
 * Canonical Reference: https://developer.etsy.com/documentation/essentials/authentication/
 * 
 * Features:
 * - Environment-aware (development, staging, production)
 * - Exact path matching (/api/seller-channels/etsy/callback)
 * - Strict HTTPS enforcement for public/staging/production origins
 * - Supports AppSetting and ETSY_REDIRECT_URI environment overrides
 * - Safe diagnostic inspection helper (resolveEtsyOAuthConfiguration)
 * - Zero secret leakage
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

export interface EtsyOAuthDiagnostic {
  environment: "development" | "staging" | "production";
  configured: boolean;
  clientIdPresent: boolean;
  maskedClientId: string;
  redirectUri: string;
  configuredRedirectUriOverride: string | null;
  callbackRoute: string;
  requestedScopes: string[];
  pkceEnabled: boolean;
  stateEnabled: boolean;
  credentialSource: "APP_SETTING" | "CONNECTOR_TABLE" | "ENVIRONMENT" | "NONE";
  applicationOrigin: string;
  isValid: boolean;
  diagnosticCode?: string;
  error?: string;
}

export const CANONICAL_ETSY_CALLBACK_ROUTE = "/api/seller-channels/etsy/callback";
export const DEFAULT_ETSY_SCOPES = "listings_w listings_r shops_w shops_r transactions_r billing_r";

export function resolveEtsyOAuthRedirectUri(options?: {
  overrideBaseUrl?: string;
  overrideRedirectUri?: string;
  reqHost?: string;
  reqProto?: string;
  overrideClientId?: string;
}): EtsyOAuthConfig {
  const envOverride = options?.overrideRedirectUri || process.env.ETSY_REDIRECT_URI;
  
  // Base URL Resolution
  let rawBase = options?.overrideBaseUrl;
  if (!rawBase) {
    if (options?.reqHost) {
      const isLocal = options.reqHost.includes("localhost") || options.reqHost.includes("127.0.0.1");
      const proto = isLocal ? (options.reqProto || "http") : "https";
      rawBase = `${proto}://${options.reqHost}`;
    } else if (process.env.APP_URL) {
      rawBase = process.env.APP_URL;
    } else if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
      rawBase = process.env.NEXTAUTH_URL;
    } else {
      rawBase = process.env.NEXTAUTH_URL || "http://localhost:3000";
    }
  }

  // Remove trailing slashes cleanly
  const normalizedBase = rawBase.replace(/\/+$/, "");

  // Client ID Resolution with explicit precedence
  const clientId =
    options?.overrideClientId ||
    process.env.ETSY_SELLER_CLIENT_ID ||
    process.env.ETSY_CLIENT_ID ||
    process.env.ETSY_KEYSTRING ||
    process.env.ETSY_API_KEY ||
    "";

  // Determine environment
  let environment: "development" | "staging" | "production" = "development";
  if (normalizedBase.includes("sellersalt.com") || (process.env.NODE_ENV === "production" && !normalizedBase.includes("staging") && !normalizedBase.includes("anadash.namis.tech"))) {
    environment = "production";
  } else if (normalizedBase.includes("staging") || normalizedBase.includes("anadash.namis.tech") || normalizedBase.includes("netdrix.com")) {
    environment = "staging";
  }

  // Canonical redirect URI (never append trailing slash, enforce exact route)
  const redirectUri = envOverride
    ? envOverride.trim().replace(/\/+$/, "")
    : `${normalizedBase}${CANONICAL_ETSY_CALLBACK_ROUTE}`;

  // Validation
  if (!clientId) {
    return {
      clientId: "",
      redirectUri,
      baseUrl: normalizedBase,
      environment,
      isValid: false,
      error: "Etsy Client ID (AppSetting: etsy_seller_client_id or env: ETSY_SELLER_CLIENT_ID / ETSY_CLIENT_ID / ETSY_KEYSTRING) is not configured.",
      diagnosticCode: "ETSY_CLIENT_ID_MISSING",
    };
  }

  try {
    const parsed = new URL(redirectUri);
    if (!parsed.protocol.startsWith("http")) {
      throw new Error("Redirect URI must use HTTP or HTTPS protocol.");
    }
    if (environment !== "development" && parsed.protocol !== "https:") {
      throw new Error("Redirect URI must use HTTPS in staging and production environments.");
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

export function resolveEtsyOAuthConfiguration(options?: {
  overrideBaseUrl?: string;
  overrideRedirectUri?: string;
  reqHost?: string;
  reqProto?: string;
  overrideClientId?: string;
  credentialSource?: "APP_SETTING" | "CONNECTOR_TABLE" | "ENVIRONMENT" | "NONE";
  scopes?: string;
}): EtsyOAuthDiagnostic {
  const config = resolveEtsyOAuthRedirectUri(options);
  const rawClientId = config.clientId;
  const maskedClientId = rawClientId
    ? rawClientId.length > 8
      ? `${rawClientId.slice(0, 4)}...${rawClientId.slice(-4)}`
      : `${rawClientId.slice(0, 2)}...`
    : "NOT_CONFIGURED";

  const scopes = options?.scopes || DEFAULT_ETSY_SCOPES;
  const requestedScopes = scopes.split(/\s+/).filter(Boolean);

  let source = options?.credentialSource;
  if (!source) {
    if (options?.overrideClientId) source = "APP_SETTING";
    else if (process.env.ETSY_SELLER_CLIENT_ID || process.env.ETSY_CLIENT_ID || process.env.ETSY_KEYSTRING || process.env.ETSY_API_KEY) {
      source = "ENVIRONMENT";
    } else {
      source = "NONE";
    }
  }

  return {
    environment: config.environment,
    configured: config.isValid,
    clientIdPresent: Boolean(rawClientId),
    maskedClientId,
    redirectUri: config.redirectUri,
    configuredRedirectUriOverride: options?.overrideRedirectUri || process.env.ETSY_REDIRECT_URI || null,
    callbackRoute: CANONICAL_ETSY_CALLBACK_ROUTE,
    requestedScopes,
    pkceEnabled: true,
    stateEnabled: true,
    credentialSource: source,
    applicationOrigin: config.baseUrl,
    isValid: config.isValid,
    diagnosticCode: config.diagnosticCode,
    error: config.error,
  };
}


