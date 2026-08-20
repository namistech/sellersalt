/**
 * SellerSalt — Canonical Marketplace Data Access Modes
 * 
 * Formalizes explicit access capabilities, authorization requirements,
 * and access mode resolutions across all supported ecommerce platforms.
 */

import type { MarketplaceId, DataSourceType } from "../types";
import type { MarketplaceDataPolicy, PolicyPermissionStatus } from "./types";
import { MarketplaceGovernanceRegistry } from "./registry";

/**
 * Standard data access mode classification.
 */
export type MarketplaceDataAccessMode =
  | "PUBLIC_WEB_ALLOWED"
  | "PUBLIC_WEB_RESTRICTED"
  | "API_ALLOWED"
  | "API_REQUIRES_OAUTH"
  | "API_REQUIRES_COMMERCIAL_ACCESS"
  | "CONNECTED_STORE_ONLY"
  | "HISTORICAL_ONLY"
  | "NOT_AVAILABLE"
  | "REQUIRES_PLATFORM_REVIEW";

/**
 * Research or business capability being requested.
 */
export type MarketplaceResearchCapability =
  | "PRODUCT_RESEARCH"
  | "KEYWORD_RESEARCH"
  | "SHOP_RESEARCH"
  | "CATEGORY_RESEARCH"
  | "SELLER_DATA"
  | "CONNECTED_SHOP_DATA"
  | "ORDER_DATA"
  | "LISTING_MANAGEMENT"
  | "INVENTORY"
  | "ANALYTICS";

/**
 * Result of resolving access capability for a marketplace and capability.
 */
export interface AccessModeResolution {
  readonly marketplace: MarketplaceId;
  readonly capability: MarketplaceResearchCapability;
  readonly accessMode: MarketplaceDataAccessMode;
  readonly primaryAllowedSource: DataSourceType;
  readonly fallbackAllowedSources: DataSourceType[];
  readonly requiresOAuth: boolean;
  readonly requiresCommercialApproval: boolean;
  readonly policyStatus: PolicyPermissionStatus;
  readonly explanation: string;
  readonly allowedStrategies: string[];
  readonly prohibitedStrategies: string[];
  readonly evaluatedAt: Date;
}

export class MarketplaceAccessResolver {
  /**
   * Resolves the authoritative data access mode for a marketplace and research capability.
   */
  public static resolveAccessMode(
    marketplace: MarketplaceId | string,
    capability: MarketplaceResearchCapability,
    hasApiCredentials = false,
    hasOAuthToken = false
  ): AccessModeResolution {
    const policy = MarketplaceGovernanceRegistry.getPolicy(marketplace);
    const now = new Date();
    const mpId = policy.marketplace;

    // 1. Connected Store Exclusive Capabilities (Orders, Listing Management, Private Store Data)
    if (
      capability === "ORDER_DATA" ||
      capability === "LISTING_MANAGEMENT" ||
      capability === "INVENTORY" ||
      capability === "CONNECTED_SHOP_DATA"
    ) {
      if (hasOAuthToken) {
        return {
          marketplace: mpId,
          capability,
          accessMode: "API_ALLOWED",
          primaryAllowedSource: "CONNECTED_STORE",
          fallbackAllowedSources: [],
          requiresOAuth: true,
          requiresCommercialApproval: false,
          policyStatus: "ALLOWED",
          explanation: `Authenticated seller channel active for ${policy.displayName}.`,
          allowedStrategies: ["CONNECTED_STORE_OAUTH_SYNC"],
          prohibitedStrategies: ["PUBLIC_SEARCH_HTML", "SCRAPING"],
          evaluatedAt: now,
        };
      } else {
        return {
          marketplace: mpId,
          capability,
          accessMode: "API_REQUIRES_OAUTH",
          primaryAllowedSource: "CONNECTED_STORE",
          fallbackAllowedSources: [],
          requiresOAuth: true,
          requiresCommercialApproval: false,
          policyStatus: "RESTRICTED",
          explanation: `${capability} requires authorized seller OAuth connection on ${policy.displayName}.`,
          allowedStrategies: [],
          prohibitedStrategies: ["PUBLIC_SEARCH_HTML", "SCRAPING", "UNAUTHORIZED_API"],
          evaluatedAt: now,
        };
      }
    }

    // 2. Decentralized Storefronts (Shopify, WooCommerce) have no public search
    if (mpId === "shopify" || mpId === "woocommerce") {
      if (hasOAuthToken || hasApiCredentials) {
        return {
          marketplace: mpId,
          capability,
          accessMode: "CONNECTED_STORE_ONLY",
          primaryAllowedSource: "CONNECTED_STORE",
          fallbackAllowedSources: ["USER_IMPORT"],
          requiresOAuth: mpId === "shopify",
          requiresCommercialApproval: false,
          policyStatus: "ALLOWED",
          explanation: `${policy.displayName} is an authenticated seller store; no global public search index exists.`,
          allowedStrategies: ["CONNECTED_STORE_OAUTH_SYNC", "USER_IMPORT"],
          prohibitedStrategies: ["PUBLIC_SEARCH_HTML", "SCRAPING"],
          evaluatedAt: now,
        };
      } else {
        return {
          marketplace: mpId,
          capability,
          accessMode: "CONNECTED_STORE_ONLY",
          primaryAllowedSource: "CONNECTED_STORE",
          fallbackAllowedSources: ["USER_IMPORT"],
          requiresOAuth: mpId === "shopify",
          requiresCommercialApproval: false,
          policyStatus: "RESTRICTED",
          explanation: `Connect your ${policy.displayName} store to access ${capability}.`,
          allowedStrategies: ["USER_IMPORT"],
          prohibitedStrategies: ["PUBLIC_SEARCH_HTML", "SCRAPING"],
          evaluatedAt: now,
        };
      }
    }

    // 3. Official API with Commercial Review requirements (e.g. Etsy Open API v3 Commercial Access)
    if (policy.officialApiAvailable === "CONDITIONALLY_ALLOWED" || policy.officialApiAvailable === "RESTRICTED") {
      if (!hasApiCredentials && policy.complianceStatus === "REQUIRES_PLATFORM_CONFIRMATION") {
        // If public web is permitted, public web is primary; otherwise requires review
        if (policy.publicWebAllowed === "ALLOWED") {
          return {
            marketplace: mpId,
            capability,
            accessMode: "PUBLIC_WEB_ALLOWED",
            primaryAllowedSource: "PUBLIC_WEB",
            fallbackAllowedSources: ["HISTORICAL_OBSERVATION", "USER_IMPORT"],
            requiresOAuth: false,
            requiresCommercialApproval: true,
            policyStatus: "ALLOWED",
            explanation: `Public catalog observation permitted for ${policy.displayName}. Official Commercial API access requires platform confirmation.`,
            allowedStrategies: ["PUBLIC_SEARCH_HTML", "STRUCTURED_JSON_LD", "TERTIARY_HISTORICAL_DB"],
            prohibitedStrategies: ["PRIVATE_PORTAL_SCRAPING", "CAPTCHA_CIRCUMVENTION"],
            evaluatedAt: now,
          };
        }
      }
    }

    // 4. Public Web Catalog Platforms (Amazon, eBay, Walmart, TikTok Shop)
    if (policy.publicWebAllowed === "ALLOWED" || policy.publicWebAllowed === "CONDITIONALLY_ALLOWED") {
      return {
        marketplace: mpId,
        capability,
        accessMode: "PUBLIC_WEB_ALLOWED",
        primaryAllowedSource: "PUBLIC_WEB",
        fallbackAllowedSources: ["HISTORICAL_OBSERVATION", "USER_IMPORT"],
        requiresOAuth: false,
        requiresCommercialApproval: policy.officialApiAvailable === "RESTRICTED",
        policyStatus: "ALLOWED",
        explanation: `Public catalog research permitted for ${policy.displayName}.`,
        allowedStrategies: ["PUBLIC_SEARCH_HTML", "STRUCTURED_JSON_LD", "TERTIARY_HISTORICAL_DB"],
        prohibitedStrategies: ["PRIVATE_PORTAL_SCRAPING", "CAPTCHA_CIRCUMVENTION", "STEALTH_BOT"],
        evaluatedAt: now,
      };
    }

    // 5. Default Fallback
    return {
      marketplace: mpId,
      capability,
      accessMode: "REQUIRES_PLATFORM_REVIEW",
      primaryAllowedSource: "USER_IMPORT",
      fallbackAllowedSources: ["HISTORICAL_OBSERVATION"],
      requiresOAuth: false,
      requiresCommercialApproval: true,
      policyStatus: "REQUIRES_REVIEW",
      explanation: `Acquisition permissions for ${policy.displayName} under review.`,
      allowedStrategies: ["TERTIARY_HISTORICAL_DB", "USER_IMPORT"],
      prohibitedStrategies: ["PUBLIC_SEARCH_HTML", "SCRAPING", "UNAUTHORIZED_API"],
      evaluatedAt: now,
    };
  }
}
