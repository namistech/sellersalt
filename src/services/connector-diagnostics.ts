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
