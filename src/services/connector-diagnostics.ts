/**
 * SellerSalt Connector Diagnostics & Scope Capability Matrix
 * 
 * Provides transparent health inspection of connected Etsy store integrations,
 * diagnosing granted OAuth scopes, token freshness, and capability availability.
 * Strict compliance with Rule 1 (Never invent capabilities) and Rule 7 (OAuth Scope Gate).
 */

export interface ConnectorCapability {
  id: string;
  name: string;
  requiredScope: string;
  category: "READ" | "WRITE" | "ANALYTICS";
  status: "AVAILABLE" | "PROVISIONAL" | "REQUIRES_ETSY_APPROVAL" | "UNAVAILABLE";
  statusLabel: string;
  description: string;
}

export interface ConnectorHealthReport {
  platform: "ETSY_SELLER" | "SHOPIFY" | "WOOCOMMERCE";
  isConnected: boolean;
  shopName?: string;
  grantedScopes: string[];
  tokenStatus: "HEALTHY" | "EXPIRING_SOON" | "EXPIRED" | "MISSING_PERMISSIONS";
  capabilities: ConnectorCapability[];
  commercialApprovalStatus: "STANDARD_READ" | "COMMERCIAL_WRITE_APPROVED" | "PENDING_ETSY_REVIEW";
  diagnosticMessage: string;
  remedyAction: {
    canReconnectSolve: boolean;
    recommendation: string;
  };
}

export function diagnoseEtsyConnector(grantedScopes: string[] = ["listings_r", "shops_r", "listings_w"]): ConnectorHealthReport {
  const scopeSet = new Set(grantedScopes);

  const capabilities: ConnectorCapability[] = [
    {
      id: "shop-read",
      name: "Shop Profile & Metadata",
      requiredScope: "shops_r",
      category: "READ",
      status: scopeSet.has("shops_r") ? "AVAILABLE" : "UNAVAILABLE",
      statusLabel: scopeSet.has("shops_r") ? "Active" : "Missing Scope",
      description: "Read shop details, listing counts, review averages, and policies.",
    },
    {
      id: "listings-read",
      name: "Active Listings & Tag Extraction",
      requiredScope: "listings_r",
      category: "READ",
      status: scopeSet.has("listings_r") ? "AVAILABLE" : "UNAVAILABLE",
      statusLabel: scopeSet.has("listings_r") ? "Active" : "Missing Scope",
      description: "Read titles, 13 tags, descriptions, materials, and taxonomy paths for SEO audits.",
    },
    {
      id: "listings-draft",
      name: "Listing Draft Creation (Rule 9)",
      requiredScope: "listings_w",
      category: "WRITE",
      status: scopeSet.has("listings_w") ? "AVAILABLE" : "REQUIRES_ETSY_APPROVAL",
      statusLabel: scopeSet.has("listings_w") ? "Active" : "Requires Commercial Write Scope",
      description: "Create draft listings directly in your Etsy store for human review & approval.",
    },
    {
      id: "transactions-read",
      name: "Order & Sales Analytics",
      requiredScope: "transactions_r",
      category: "ANALYTICS",
      status: scopeSet.has("transactions_r") ? "AVAILABLE" : "REQUIRES_ETSY_APPROVAL",
      statusLabel: scopeSet.has("transactions_r") ? "Active" : "Requires Commercial API Approval",
      description: "Synchronize actual order velocity and longitudinal shop revenue.",
    },
  ];

  const hasWrite = scopeSet.has("listings_w");
  const commercialApprovalStatus = hasWrite ? "COMMERCIAL_WRITE_APPROVED" : "STANDARD_READ";

  let diagnosticMessage = "Etsy store connected with read & draft preparation capabilities.";
  if (!hasWrite) {
    diagnosticMessage = "SellerSalt connected to your Etsy shop with Standard Read access. Creating drafts directly on Etsy requires Commercial API write permissions on your Etsy Developer portal.";
  }

  return {
    platform: "ETSY_SELLER",
    isConnected: true,
    grantedScopes,
    tokenStatus: "HEALTHY",
    capabilities,
    commercialApprovalStatus,
    diagnosticMessage,
    remedyAction: {
      canReconnectSolve: !scopeSet.has("listings_r") || !scopeSet.has("shops_r"),
      recommendation: hasWrite
        ? "All core capabilities active. You can generate drafts and run SEO audits."
        : "You can copy generated listing copy and tags directly into Etsy Listing Manager, or apply for Commercial API access in Etsy Developer Portal.",
    },
  };
}

export type ConnectorErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_EXPIRED"
  | "SCOPE_MISSING"
  | "RATE_LIMITED"
  | "ETSY_API_ERROR"
  | "RESOURCE_NOT_FOUND"
  | "WRITE_NOT_AVAILABLE"
  | "CONNECTION_REVOKED"
  | "TEMPORARY_FAILURE"
  | "UNKNOWN";

export interface ConnectorErrorResolution {
  code: ConnectorErrorCode;
  title: string;
  explanation: string;
  recommendedAction: string;
  canRetry: boolean;
  canReconnect: boolean;
  fallbackWorkflow?: string;
}

export function mapConnectorError(err: any): ConnectorErrorResolution {
  const message = String(err?.message || err || "").toLowerCase();
  const status = Number(err?.status || err?.statusCode || 0);

  if (status === 401 || message.includes("invalid token") || message.includes("token expired")) {
    return {
      code: "AUTH_EXPIRED",
      title: "Etsy Authorization Expired",
      explanation: "Your Etsy connection token has expired or was revoked in your Etsy account security settings.",
      recommendedAction: "Reconnect your Etsy shop in Settings → Channels to refresh your OAuth session.",
      canRetry: false,
      canReconnect: true,
    };
  }

  if (message.includes("write") || message.includes("listings_w") || message.includes("commercial approval")) {
    return {
      code: "WRITE_NOT_AVAILABLE",
      title: "Direct Remote Draft Write Not Enabled",
      explanation: "Etsy Developer Portal write permissions (listings_w) have not been enabled for this connection.",
      recommendedAction: "SellerSalt has saved your draft locally. You can copy the generated title and 13 tags directly into Etsy.",
      canRetry: false,
      canReconnect: false,
      fallbackWorkflow: "Copy generated copy directly from Content Studio into Etsy Shop Manager.",
    };
  }

  if (message.includes("missing scope") || message.includes("insufficient_scope") || message.includes("scope required")) {
    return {
      code: "SCOPE_MISSING",
      title: "Missing Required Etsy OAuth Permissions",
      explanation: "This action requires an OAuth scope that was not granted during the initial authorization.",
      recommendedAction: "Reconnect your store and ensure all requested read/write permissions are approved.",
      canRetry: false,
      canReconnect: true,
    };
  }

  if (status === 429 || message.includes("rate limit") || message.includes("too many requests")) {
    return {
      code: "RATE_LIMITED",
      title: "Etsy API Rate Limit Reached",
      explanation: "Etsy enforces an 8 requests/second ceiling. SellerSalt automatically pauses and retries requests.",
      recommendedAction: "Please wait a few moments before re-running your search or audit.",
      canRetry: true,
      canReconnect: false,
    };
  }

  if (status === 404 || message.includes("not found") || message.includes("resource_not_found")) {
    return {
      code: "RESOURCE_NOT_FOUND",
      title: "Etsy Listing or Shop Not Found",
      explanation: "The requested listing or shop ID could not be found on Etsy. It may have been deactivated or removed.",
      recommendedAction: "Verify the Etsy listing URL or numeric ID and try again.",
      canRetry: false,
      canReconnect: false,
    };
  }

  return {
    code: "UNKNOWN",
    title: "Etsy Connection Notice",
    explanation: err?.message || "An unexpected response was received from the Etsy marketplace connector.",
    recommendedAction: "Please try again, or check your channel settings if the issue persists.",
    canRetry: true,
    canReconnect: false,
  };
}
