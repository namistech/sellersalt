/**
 * SellerSalt — Etsy Marketplace Data Governance Policy
 * 
 * Formal data governance, acquisition boundaries, OAuth scope constraints,
 * retention rules, and disclaimer specifications for Etsy intelligence.
 */

import type { MarketplaceDataPolicy } from "./types";

export const ETSY_DATA_GOVERNANCE_POLICY: MarketplaceDataPolicy = {
  marketplace: "etsy",
  displayName: "Etsy",
  documentationUrl: "https://developers.etsy.com/documentation/",
  complianceStatus: "REQUIRES_PLATFORM_CONFIRMATION",
  lastReviewedAt: new Date("2026-08-20"),

  // Source-level permissions
  allowedAcquisitionSources: [
    "PUBLIC_WEB",
    "MARKETPLACE_API",
    "CONNECTED_STORE",
    "HISTORICAL_OBSERVATION",
    "USER_IMPORT",
  ],
  publicWebAllowed: "ALLOWED",
  officialApiAvailable: "CONDITIONALLY_ALLOWED", // Requires active Etsy API v3 credentials
  connectedStoreAllowed: "ALLOWED", // Requires authorized OAuth flow
  licensedProviderAllowed: "ALLOWED",
  userImportAllowed: "ALLOWED",

  // Research domains & URLs
  allowedResearchDomains: ["etsy.com", "www.etsy.com"],
  prohibitedPathPatterns: [
    "etsy.com/your/shops",
    "etsy.com/your/account",
    "etsy.com/your/bill",
    "/signin",
    "/login",
    "/admin",
  ],

  // Retention Rules: Bounded to Package.maxTrackingDays, zero invented fixed-day mandates
  retentionRules: {
    maxSnapshotRetentionDays: 30, // Max lookback sold across packages
    requiresPurgeOnDisconnect: true,
    allowLongitudinalAggregation: true,
    allowHistoricalDisplayAfterExpiry: false,
    policyBasis:
      "Data retention is bounded to actual product tracking features (Package.maxTrackingDays). Disconnected seller channels immediately purge OAuth tokens and store records.",
  },

  // Caching Rules
  cachingRules: {
    searchTtlSeconds: 14400, // 4 hours
    productDetailTtlSeconds: 86400, // 24 hours
    shopStatsTtlSeconds: 21600, // 6 hours
    allowStaleDisplayOnError: true,
    staleMaxAgeSeconds: 604800, // 7 days
  },

  // Display & Disclaimer Rules
  displayRules: {
    requireMarketplaceDisclaimer: true,
    requireSourceAttribution: true,
    allowDirectDeepLinks: true,
    disclaimerText:
      "The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.",
    attributionFormat: "Etsy Public Research & Open API v3",
  },

  // Concurrency & Rate Limit Rules
  rateLimitRules: {
    maxRequestsPerMinute: 60,
    maxConcurrentRequests: 2,
    backoffBaseSeconds: 2,
    maxRetries: 3,
  },

  // Robots & Crawler Standards
  robotsPolicy: "RESPECTED",

  // Authentication & OAuth
  authRequirements: {
    requiresOAuthForSellerData: true,
    supportedScopes: ["listings_w", "listings_r", "shops_r", "transactions_r"],
    requiredScopes: ["listings_r", "shops_r"],
    pkceRequired: true,
  },

  // Private Data & Anti-Bot Hard Constraints
  privateDataRules: {
    allowScrapingPrivateDashboards: false,
    allowAuthenticatedSellerDataOnlyViaOAuth: true,
    allowCredentialHarvesting: false,
    allowCaptchaCircumvention: false,
  },

  // Entity & Field Rules
  entityDataRules: {
    allowedPublicFields: [
      "listingId",
      "title",
      "price",
      "currency",
      "shopName",
      "shopExternalId",
      "reviewCount",
      "rating",
      "categoryPath",
      "tags",
      "materials",
      "imageUrl",
      "url",
    ],
    restrictedPrivateFields: [
      "sellerEmail",
      "sellerBilling",
      "buyerPII",
      "exactSearchVolume",
      "privateShopRevenues",
    ],
    imageUsageRule: "HOTLINK_PERMITTED",
    sellerPIIRestricted: true,
  },

  // Transparent Disclosures
  knownLimitations: [
    "Exact private store monthly revenues and unit sales are unobservable without seller OAuth.",
    "Exact search volume per keyword is unavailable; listing prevalence and search rank serve as observable market proxies.",
    "Etsy Open API commercial re-approval requires explicit confirmation from Etsy Developer Review.",
  ],
  operationalNotes: [
    "Zero CAPTCHA bypassing, stealth fingerprinting, or private Shop Manager scraping permitted.",
    "Listing drafts created with AI require explicit human review before publishing.",
  ],
};
