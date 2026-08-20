/**
 * SellerSalt — Marketplace Governance Registry
 * 
 * Canonical registry for all marketplace data policies, retention limits,
 * rate limits, and compliance boundaries.
 */

import type { MarketplaceId, DataSourceType } from "../types";
import type { MarketplaceDataPolicy, PolicyPermissionStatus } from "./types";
import { ETSY_DATA_GOVERNANCE_POLICY } from "./etsy-policy";

// ----------------------------------------------------------------------------
// Amazon Data Policy
// ----------------------------------------------------------------------------
export const AMAZON_DATA_GOVERNANCE_POLICY: MarketplaceDataPolicy = {
  marketplace: "amazon",
  displayName: "Amazon",
  documentationUrl: "https://developer-docs.amazon.com/sp-api/",
  complianceStatus: "DESIGNED",
  lastReviewedAt: new Date("2026-08-20"),

  allowedAcquisitionSources: ["PUBLIC_WEB", "HISTORICAL_OBSERVATION", "USER_IMPORT"],
  publicWebAllowed: "ALLOWED",
  officialApiAvailable: "RESTRICTED", // Requires approved Amazon SP-API developer registration
  connectedStoreAllowed: "RESTRICTED",
  licensedProviderAllowed: "ALLOWED",
  userImportAllowed: "ALLOWED",

  allowedResearchDomains: [
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
  prohibitedPathPatterns: ["sellercentral.amazon.", "/ap/signin", "/admin"],

  retentionRules: {
    maxSnapshotRetentionDays: 30,
    requiresPurgeOnDisconnect: true,
    allowLongitudinalAggregation: true,
    allowHistoricalDisplayAfterExpiry: false,
    policyBasis: "Product research tracking lookback bounded by customer tier.",
  },
  cachingRules: {
    searchTtlSeconds: 14400,
    productDetailTtlSeconds: 86400,
    shopStatsTtlSeconds: 86400,
    allowStaleDisplayOnError: true,
    staleMaxAgeSeconds: 604800,
  },
  displayRules: {
    requireMarketplaceDisclaimer: true,
    requireSourceAttribution: true,
    allowDirectDeepLinks: true,
    disclaimerText: "Amazon is a registered trademark of Amazon.com, Inc. or its affiliates.",
    attributionFormat: "Amazon Public Web & Market Intelligence",
  },
  rateLimitRules: {
    maxRequestsPerMinute: 30,
    maxConcurrentRequests: 1,
    backoffBaseSeconds: 3,
    maxRetries: 2,
  },
  robotsPolicy: "RESPECTED",
  authRequirements: {
    requiresOAuthForSellerData: true,
    supportedScopes: ["sp_api:orders_r", "sp_api:catalog_r"],
    requiredScopes: [],
    pkceRequired: false,
  },
  privateDataRules: {
    allowScrapingPrivateDashboards: false,
    allowAuthenticatedSellerDataOnlyViaOAuth: true,
    allowCredentialHarvesting: false,
    allowCaptchaCircumvention: false,
  },
  entityDataRules: {
    allowedPublicFields: [
      "asin",
      "title",
      "price",
      "currency",
      "brand",
      "rating",
      "reviewCount",
      "categoryPath",
      "imageUrl",
      "url",
    ],
    restrictedPrivateFields: ["sellerDirectContact", "exactKeywordSearchVolume", "privateBSRUnitsSold"],
    imageUsageRule: "HOTLINK_PERMITTED",
    sellerPIIRestricted: true,
  },
  knownLimitations: [
    "Amazon SP-API integration requires active developer credentials before API capability can be activated.",
    "Exact search volume and private merchant ad spends are unavailable.",
  ],
  operationalNotes: ["Zero CAPTCHA bypassing or Seller Central crawling permitted."],
};

// ----------------------------------------------------------------------------
// eBay Data Policy
// ----------------------------------------------------------------------------
export const EBAY_DATA_GOVERNANCE_POLICY: MarketplaceDataPolicy = {
  marketplace: "ebay",
  displayName: "eBay",
  documentationUrl: "https://developer.ebay.com/api-docs/static/ebay-rest-landing.html",
  complianceStatus: "DESIGNED",
  lastReviewedAt: new Date("2026-08-20"),

  allowedAcquisitionSources: ["PUBLIC_WEB", "HISTORICAL_OBSERVATION", "USER_IMPORT"],
  publicWebAllowed: "ALLOWED",
  officialApiAvailable: "RESTRICTED", // Requires eBay Developer Account
  connectedStoreAllowed: "RESTRICTED",
  licensedProviderAllowed: "ALLOWED",
  userImportAllowed: "ALLOWED",

  allowedResearchDomains: [
    "ebay.com",
    "ebay.co.uk",
    "ebay.ca",
    "ebay.de",
    "ebay.fr",
    "ebay.es",
    "ebay.it",
    "ebay.com.au",
  ],
  prohibitedPathPatterns: ["my.ebay.", "/signin", "/admin"],

  retentionRules: {
    maxSnapshotRetentionDays: 30,
    requiresPurgeOnDisconnect: true,
    allowLongitudinalAggregation: true,
    allowHistoricalDisplayAfterExpiry: false,
    policyBasis: "Product research tracking lookback bounded by customer tier.",
  },
  cachingRules: {
    searchTtlSeconds: 14400,
    productDetailTtlSeconds: 86400,
    shopStatsTtlSeconds: 86400,
    allowStaleDisplayOnError: true,
    staleMaxAgeSeconds: 604800,
  },
  displayRules: {
    requireMarketplaceDisclaimer: true,
    requireSourceAttribution: true,
    allowDirectDeepLinks: true,
    disclaimerText: "eBay is a registered trademark of eBay Inc.",
    attributionFormat: "eBay Public Web & Market Intelligence",
  },
  rateLimitRules: {
    maxRequestsPerMinute: 40,
    maxConcurrentRequests: 2,
    backoffBaseSeconds: 2,
    maxRetries: 3,
  },
  robotsPolicy: "RESPECTED",
  authRequirements: {
    requiresOAuthForSellerData: true,
    supportedScopes: ["https://api.ebay.com/oauth/api_scope/sell.inventory"],
    requiredScopes: [],
    pkceRequired: false,
  },
  privateDataRules: {
    allowScrapingPrivateDashboards: false,
    allowAuthenticatedSellerDataOnlyViaOAuth: true,
    allowCredentialHarvesting: false,
    allowCaptchaCircumvention: false,
  },
  entityDataRules: {
    allowedPublicFields: [
      "itemId",
      "title",
      "price",
      "currency",
      "sellerUsername",
      "rating",
      "reviewCount",
      "categoryPath",
      "imageUrl",
      "url",
    ],
    restrictedPrivateFields: ["sellerPrivateContact", "exactSearchVolume"],
    imageUsageRule: "HOTLINK_PERMITTED",
    sellerPIIRestricted: true,
  },
  knownLimitations: ["eBay Developer Program credentials required before official API routes can be activated."],
  operationalNotes: ["Zero My eBay crawling permitted."],
};

// ----------------------------------------------------------------------------
// Walmart Data Policy
// ----------------------------------------------------------------------------
export const WALMART_DATA_GOVERNANCE_POLICY: MarketplaceDataPolicy = {
  marketplace: "walmart",
  displayName: "Walmart",
  documentationUrl: "https://developer.walmart.com/",
  complianceStatus: "DESIGNED",
  lastReviewedAt: new Date("2026-08-20"),

  allowedAcquisitionSources: ["PUBLIC_WEB", "HISTORICAL_OBSERVATION", "USER_IMPORT"],
  publicWebAllowed: "ALLOWED",
  officialApiAvailable: "RESTRICTED", // Requires Walmart Developer Credentials
  connectedStoreAllowed: "RESTRICTED",
  licensedProviderAllowed: "ALLOWED",
  userImportAllowed: "ALLOWED",

  allowedResearchDomains: ["walmart.com", "walmart.ca"],
  prohibitedPathPatterns: ["seller.walmart.com", "/account/login"],

  retentionRules: {
    maxSnapshotRetentionDays: 30,
    requiresPurgeOnDisconnect: true,
    allowLongitudinalAggregation: true,
    allowHistoricalDisplayAfterExpiry: false,
    policyBasis: "Product research tracking lookback bounded by customer tier.",
  },
  cachingRules: {
    searchTtlSeconds: 14400,
    productDetailTtlSeconds: 86400,
    shopStatsTtlSeconds: 86400,
    allowStaleDisplayOnError: true,
    staleMaxAgeSeconds: 604800,
  },
  displayRules: {
    requireMarketplaceDisclaimer: true,
    requireSourceAttribution: true,
    allowDirectDeepLinks: true,
    disclaimerText: "Walmart is a registered trademark of Walmart Inc.",
    attributionFormat: "Walmart Public Web & Market Intelligence",
  },
  rateLimitRules: {
    maxRequestsPerMinute: 30,
    maxConcurrentRequests: 1,
    backoffBaseSeconds: 3,
    maxRetries: 2,
  },
  robotsPolicy: "RESPECTED",
  authRequirements: {
    requiresOAuthForSellerData: true,
    supportedScopes: ["orders:read", "inventory:read"],
    requiredScopes: [],
    pkceRequired: false,
  },
  privateDataRules: {
    allowScrapingPrivateDashboards: false,
    allowAuthenticatedSellerDataOnlyViaOAuth: true,
    allowCredentialHarvesting: false,
    allowCaptchaCircumvention: false,
  },
  entityDataRules: {
    allowedPublicFields: [
      "itemId",
      "title",
      "price",
      "currency",
      "brand",
      "rating",
      "reviewCount",
      "categoryPath",
      "imageUrl",
      "url",
    ],
    restrictedPrivateFields: ["sellerPrivateContact", "exactSearchVolume"],
    imageUsageRule: "HOTLINK_PERMITTED",
    sellerPIIRestricted: true,
  },
  knownLimitations: ["Walmart Marketplace Developer partner credentials required for API write/read."],
  operationalNotes: ["Zero Seller Center crawling permitted."],
};

// ----------------------------------------------------------------------------
// Shopify Data Policy
// ----------------------------------------------------------------------------
export const SHOPIFY_DATA_GOVERNANCE_POLICY: MarketplaceDataPolicy = {
  marketplace: "shopify",
  displayName: "Shopify",
  documentationUrl: "https://shopify.dev/docs/api/admin-rest",
  complianceStatus: "IMPLEMENTED",
  lastReviewedAt: new Date("2026-08-20"),

  allowedAcquisitionSources: ["CONNECTED_STORE", "USER_IMPORT"],
  publicWebAllowed: "PROHIBITED", // Shopify is decentralized storefronts, no central catalog
  officialApiAvailable: "ALLOWED", // Connected merchant OAuth
  connectedStoreAllowed: "ALLOWED",
  licensedProviderAllowed: "CONDITIONALLY_ALLOWED",
  userImportAllowed: "ALLOWED",

  allowedResearchDomains: ["myshopify.com"],
  prohibitedPathPatterns: ["/admin"],

  retentionRules: {
    maxSnapshotRetentionDays: 30,
    requiresPurgeOnDisconnect: true,
    allowLongitudinalAggregation: true,
    allowHistoricalDisplayAfterExpiry: false,
    policyBasis: "Connected store orders and products retained during active connection only.",
  },
  cachingRules: {
    searchTtlSeconds: 3600,
    productDetailTtlSeconds: 14400,
    shopStatsTtlSeconds: 14400,
    allowStaleDisplayOnError: false,
    staleMaxAgeSeconds: 86400,
  },
  displayRules: {
    requireMarketplaceDisclaimer: true,
    requireSourceAttribution: true,
    allowDirectDeepLinks: false,
    disclaimerText: "Shopify is a trademark of Shopify Inc.",
    attributionFormat: "Shopify Storefront Integration",
  },
  rateLimitRules: {
    maxRequestsPerMinute: 120,
    maxConcurrentRequests: 4,
    backoffBaseSeconds: 1,
    maxRetries: 3,
  },
  robotsPolicy: "NOT_APPLICABLE",
  authRequirements: {
    requiresOAuthForSellerData: true,
    supportedScopes: ["read_products", "read_orders"],
    requiredScopes: ["read_products"],
    pkceRequired: false,
  },
  privateDataRules: {
    allowScrapingPrivateDashboards: false,
    allowAuthenticatedSellerDataOnlyViaOAuth: true,
    allowCredentialHarvesting: false,
    allowCaptchaCircumvention: false,
  },
  entityDataRules: {
    allowedPublicFields: ["productId", "title", "price", "currency", "handle", "imageUrl"],
    restrictedPrivateFields: ["buyerData", "privateStoreAnalytics"],
    imageUsageRule: "HOTLINK_PERMITTED",
    sellerPIIRestricted: true,
  },
  knownLimitations: ["Shopify is an authenticated seller channel; it does not have a global public search index."],
  operationalNotes: ["Data is isolated strictly by organizationId."],
};

// ----------------------------------------------------------------------------
// WooCommerce Data Policy
// ----------------------------------------------------------------------------
export const WOOCOMMERCE_DATA_GOVERNANCE_POLICY: MarketplaceDataPolicy = {
  marketplace: "woocommerce",
  displayName: "WooCommerce",
  documentationUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
  complianceStatus: "IMPLEMENTED",
  lastReviewedAt: new Date("2026-08-20"),

  allowedAcquisitionSources: ["CONNECTED_STORE", "USER_IMPORT"],
  publicWebAllowed: "PROHIBITED", // Self-hosted, no global index
  officialApiAvailable: "ALLOWED",
  connectedStoreAllowed: "ALLOWED",
  licensedProviderAllowed: "CONDITIONALLY_ALLOWED",
  userImportAllowed: "ALLOWED",

  allowedResearchDomains: [],
  prohibitedPathPatterns: ["/wp-admin"],

  retentionRules: {
    maxSnapshotRetentionDays: 30,
    requiresPurgeOnDisconnect: true,
    allowLongitudinalAggregation: true,
    allowHistoricalDisplayAfterExpiry: false,
    policyBasis: "Connected store orders retained during active authorization.",
  },
  cachingRules: {
    searchTtlSeconds: 3600,
    productDetailTtlSeconds: 14400,
    shopStatsTtlSeconds: 14400,
    allowStaleDisplayOnError: false,
    staleMaxAgeSeconds: 86400,
  },
  displayRules: {
    requireMarketplaceDisclaimer: true,
    requireSourceAttribution: true,
    allowDirectDeepLinks: false,
    disclaimerText: "WooCommerce is a trademark of Automattic Inc.",
    attributionFormat: "WooCommerce REST API",
  },
  rateLimitRules: {
    maxRequestsPerMinute: 60,
    maxConcurrentRequests: 2,
    backoffBaseSeconds: 2,
    maxRetries: 2,
  },
  robotsPolicy: "NOT_APPLICABLE",
  authRequirements: {
    requiresOAuthForSellerData: false, // Uses API Consumer Key / Secret
    supportedScopes: ["read", "write"],
    requiredScopes: ["read"],
    pkceRequired: false,
  },
  privateDataRules: {
    allowScrapingPrivateDashboards: false,
    allowAuthenticatedSellerDataOnlyViaOAuth: true,
    allowCredentialHarvesting: false,
    allowCaptchaCircumvention: false,
  },
  entityDataRules: {
    allowedPublicFields: ["id", "name", "price", "regular_price", "categories", "images"],
    restrictedPrivateFields: ["customerEmail", "customerAddress"],
    imageUsageRule: "HOTLINK_PERMITTED",
    sellerPIIRestricted: true,
  },
  knownLimitations: ["Self-hosted instances depend on merchant server availability."],
  operationalNotes: ["Credentials encrypted at rest with AES-256-GCM."],
};

// ----------------------------------------------------------------------------
// TikTok Shop Data Policy
// ----------------------------------------------------------------------------
export const TIKTOK_SHOP_DATA_GOVERNANCE_POLICY: MarketplaceDataPolicy = {
  marketplace: "tiktok_shop",
  displayName: "TikTok Shop",
  documentationUrl: "https://partner.tiktokshop.com/doc/page/63ff539097cc4f02a3560b43",
  complianceStatus: "DESIGNED",
  lastReviewedAt: new Date("2026-08-20"),

  allowedAcquisitionSources: ["PUBLIC_WEB", "HISTORICAL_OBSERVATION", "USER_IMPORT"],
  publicWebAllowed: "CONDITIONALLY_ALLOWED",
  officialApiAvailable: "RESTRICTED", // Requires TikTok Partner credentials
  connectedStoreAllowed: "RESTRICTED",
  licensedProviderAllowed: "ALLOWED",
  userImportAllowed: "ALLOWED",

  allowedResearchDomains: ["tiktok.com", "shop.tiktok.com"],
  prohibitedPathPatterns: ["seller-us.tiktok.com", "seller.tiktok.com", "/login"],

  retentionRules: {
    maxSnapshotRetentionDays: 30,
    requiresPurgeOnDisconnect: true,
    allowLongitudinalAggregation: true,
    allowHistoricalDisplayAfterExpiry: false,
    policyBasis: "Product research tracking lookback bounded by customer tier.",
  },
  cachingRules: {
    searchTtlSeconds: 7200,
    productDetailTtlSeconds: 43200,
    shopStatsTtlSeconds: 43200,
    allowStaleDisplayOnError: true,
    staleMaxAgeSeconds: 604800,
  },
  displayRules: {
    requireMarketplaceDisclaimer: true,
    requireSourceAttribution: true,
    allowDirectDeepLinks: true,
    disclaimerText: "TikTok Shop is a trademark of ByteDance Ltd.",
    attributionFormat: "TikTok Shop Market Intelligence",
  },
  rateLimitRules: {
    maxRequestsPerMinute: 20,
    maxConcurrentRequests: 1,
    backoffBaseSeconds: 4,
    maxRetries: 2,
  },
  robotsPolicy: "RESPECTED",
  authRequirements: {
    requiresOAuthForSellerData: true,
    supportedScopes: ["seller.product.read", "seller.order.read"],
    requiredScopes: [],
    pkceRequired: false,
  },
  privateDataRules: {
    allowScrapingPrivateDashboards: false,
    allowAuthenticatedSellerDataOnlyViaOAuth: true,
    allowCredentialHarvesting: false,
    allowCaptchaCircumvention: false,
  },
  entityDataRules: {
    allowedPublicFields: [
      "productId",
      "title",
      "price",
      "currency",
      "sellerName",
      "soldCount",
      "rating",
      "imageUrl",
      "url",
    ],
    restrictedPrivateFields: ["creatorPrivateEarnings", "exactAlgorithmWeights"],
    imageUsageRule: "HOTLINK_PERMITTED",
    sellerPIIRestricted: true,
  },
  knownLimitations: ["Official partner registration required for seller store management."],
  operationalNotes: ["Zero Seller Center scraping."],
};

// ----------------------------------------------------------------------------
// Master Registry Map
// ----------------------------------------------------------------------------
const POLICIES: Record<string, MarketplaceDataPolicy> = {
  etsy: ETSY_DATA_GOVERNANCE_POLICY,
  amazon: AMAZON_DATA_GOVERNANCE_POLICY,
  ebay: EBAY_DATA_GOVERNANCE_POLICY,
  walmart: WALMART_DATA_GOVERNANCE_POLICY,
  shopify: SHOPIFY_DATA_GOVERNANCE_POLICY,
  woocommerce: WOOCOMMERCE_DATA_GOVERNANCE_POLICY,
  tiktok_shop: TIKTOK_SHOP_DATA_GOVERNANCE_POLICY,
};

export class MarketplaceGovernanceRegistry {
  /**
   * Retrieves the authoritative data governance policy for a marketplace.
   */
  public static getPolicy(marketplace: MarketplaceId | string): MarketplaceDataPolicy {
    const key = marketplace.toLowerCase();
    if (POLICIES[key]) {
      return POLICIES[key];
    }

    // Default Fallback Policy for unknown platforms (Strict Zero-Assumptions)
    return {
      marketplace: key as MarketplaceId,
      displayName: marketplace,
      documentationUrl: "",
      complianceStatus: "REQUIRES_PLATFORM_CONFIRMATION",
      lastReviewedAt: new Date(),
      allowedAcquisitionSources: ["USER_IMPORT"],
      publicWebAllowed: "UNKNOWN",
      officialApiAvailable: "UNKNOWN",
      connectedStoreAllowed: "UNKNOWN",
      licensedProviderAllowed: "UNKNOWN",
      userImportAllowed: "ALLOWED",
      allowedResearchDomains: [],
      prohibitedPathPatterns: ["/admin", "/login", "/signin"],
      retentionRules: {
        maxSnapshotRetentionDays: 30,
        requiresPurgeOnDisconnect: true,
        allowLongitudinalAggregation: false,
        allowHistoricalDisplayAfterExpiry: false,
        policyBasis: "Default conservative fallback for unregistered marketplace.",
      },
      cachingRules: {
        searchTtlSeconds: 3600,
        productDetailTtlSeconds: 14400,
        shopStatsTtlSeconds: 14400,
        allowStaleDisplayOnError: false,
        staleMaxAgeSeconds: 86400,
      },
      displayRules: {
        requireMarketplaceDisclaimer: true,
        requireSourceAttribution: true,
        allowDirectDeepLinks: false,
      },
      rateLimitRules: {
        maxRequestsPerMinute: 10,
        maxConcurrentRequests: 1,
        backoffBaseSeconds: 5,
        maxRetries: 1,
      },
      robotsPolicy: "REQUIRES_REVIEW",
      authRequirements: {
        requiresOAuthForSellerData: true,
        supportedScopes: [],
        requiredScopes: [],
        pkceRequired: false,
      },
      privateDataRules: {
        allowScrapingPrivateDashboards: false,
        allowAuthenticatedSellerDataOnlyViaOAuth: true,
        allowCredentialHarvesting: false,
        allowCaptchaCircumvention: false,
      },
      entityDataRules: {
        allowedPublicFields: [],
        restrictedPrivateFields: [],
        imageUsageRule: "PROHIBITED",
        sellerPIIRestricted: true,
      },
      knownLimitations: ["Unregistered marketplace. Requires governance policy declaration."],
      operationalNotes: ["Strict conservative zero-assumption policy applied."],
    };
  }

  /**
   * Lists all registered marketplace data policies.
   */
  public static listPolicies(): MarketplaceDataPolicy[] {
    return Object.values(POLICIES);
  }
}
