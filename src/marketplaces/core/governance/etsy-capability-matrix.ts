/**
 * SellerSalt — Canonical Etsy Capability & Compliance Matrix
 * 
 * Defines authorized data sources, OAuth scope requirements, commercial review paths,
 * and rate-limiting rules across all 10 Etsy research and business capabilities.
 */

import type { DataSourceType } from "../types";
import type { MarketplaceResearchCapability } from "./access-modes";

export type EtsyAuthorizationRequirement =
  | "PUBLIC_UNAUTHENTICATED"
  | "PERSONAL_APP_KEY"
  | "COMMERCIAL_ACCESS_APPROVED"
  | "OAUTH_SELLER_AUTHORIZED";

export interface EtsyCapabilityRule {
  readonly capability: MarketplaceResearchCapability;
  readonly displayName: string;
  readonly allowedSources: DataSourceType[];
  readonly authRequirement: EtsyAuthorizationRequirement;
  readonly requiredOAuthScopes: string[];
  readonly maxRetentionDays: number | null; // null = plan bounded
  readonly rateLimitPerMinute: number;
  readonly requireTrademarkDisclaimer: boolean;
  readonly status: "IMPLEMENTED" | "REQUIRES_PLATFORM_CONFIRMATION" | "DESIGNED";
  readonly description: string;
  readonly antiCircumventionRule: string;
}

export const ETSY_CAPABILITY_MATRIX: Record<MarketplaceResearchCapability, EtsyCapabilityRule> = {
  PRODUCT_RESEARCH: {
    capability: "PRODUCT_RESEARCH",
    displayName: "Public Listing & Product Research",
    allowedSources: ["PUBLIC_WEB", "MARKETPLACE_API", "HISTORICAL_OBSERVATION"],
    authRequirement: "COMMERCIAL_ACCESS_APPROVED",
    requiredOAuthScopes: [],
    maxRetentionDays: 30,
    rateLimitPerMinute: 60,
    requireTrademarkDisclaimer: true,
    status: "REQUIRES_PLATFORM_CONFIRMATION",
    description: "Evaluates public listing signals, prices, reviews, and categories without accessing private seller portals.",
    antiCircumventionRule: "Zero private shop manager crawling; respects robots.txt and standard rate limits.",
  },
  KEYWORD_RESEARCH: {
    capability: "KEYWORD_RESEARCH",
    displayName: "Keyword & Tag Intelligence",
    allowedSources: ["PUBLIC_WEB", "MARKETPLACE_API", "HISTORICAL_OBSERVATION"],
    authRequirement: "COMMERCIAL_ACCESS_APPROVED",
    requiredOAuthScopes: [],
    maxRetentionDays: 30,
    rateLimitPerMinute: 60,
    requireTrademarkDisclaimer: true,
    status: "IMPLEMENTED",
    description: "Harvests public listing tags and empirical token clusters. Search volume remains unavailable without licensed source.",
    antiCircumventionRule: "Listing tag harvest only; does not fabricate search volume or bypass Etsy autocomplete.",
  },
  SHOP_RESEARCH: {
    capability: "SHOP_RESEARCH",
    displayName: "Public Shop & Competitor Benchmarking",
    allowedSources: ["PUBLIC_WEB", "MARKETPLACE_API", "HISTORICAL_OBSERVATION"],
    authRequirement: "COMMERCIAL_ACCESS_APPROVED",
    requiredOAuthScopes: [],
    maxRetentionDays: 30,
    rateLimitPerMinute: 60,
    requireTrademarkDisclaimer: true,
    status: "IMPLEMENTED",
    description: "Analyzes public shop sales counts, review distributions, and active listing counts.",
    antiCircumventionRule: "Private shop revenue and margins are strictly marked UNAVAILABLE.",
  },
  CATEGORY_RESEARCH: {
    capability: "CATEGORY_RESEARCH",
    displayName: "Buyer Taxonomy & Category Yield",
    allowedSources: ["PUBLIC_WEB", "MARKETPLACE_API"],
    authRequirement: "COMMERCIAL_ACCESS_APPROVED",
    requiredOAuthScopes: [],
    maxRetentionDays: 60,
    rateLimitPerMinute: 60,
    requireTrademarkDisclaimer: true,
    status: "IMPLEMENTED",
    description: "Maps Etsy's official buyer taxonomy tree and price quartile distributions.",
    antiCircumventionRule: "Zero fabricated taxonomy nodes; missing levels fail cleanly.",
  },
  SELLER_DATA: {
    capability: "SELLER_DATA",
    displayName: "Connected Shop Profile",
    allowedSources: ["CONNECTED_STORE"],
    authRequirement: "OAUTH_SELLER_AUTHORIZED",
    requiredOAuthScopes: ["shops_r"],
    maxRetentionDays: null, // Scoped to active connection
    rateLimitPerMinute: 60,
    requireTrademarkDisclaimer: true,
    status: "IMPLEMENTED",
    description: "Merchant's own shop details and verified account status.",
    antiCircumventionRule: "Requires explicit OAuth authorization. Disconnect purges credentials.",
  },
  CONNECTED_SHOP_DATA: {
    capability: "CONNECTED_SHOP_DATA",
    displayName: "Connected Store Listings",
    allowedSources: ["CONNECTED_STORE"],
    authRequirement: "OAUTH_SELLER_AUTHORIZED",
    requiredOAuthScopes: ["shops_r", "listings_r"],
    maxRetentionDays: null,
    rateLimitPerMinute: 60,
    requireTrademarkDisclaimer: true,
    status: "IMPLEMENTED",
    description: "Reads authorized merchant's active, draft, and expired listings.",
    antiCircumventionRule: "No cross-tenant data access; queries scoped strictly by organizationId.",
  },
  ORDER_DATA: {
    capability: "ORDER_DATA",
    displayName: "Order Synchronization & Analytics",
    allowedSources: ["CONNECTED_STORE"],
    authRequirement: "OAUTH_SELLER_AUTHORIZED",
    requiredOAuthScopes: ["transactions_r"],
    maxRetentionDays: null,
    rateLimitPerMinute: 60,
    requireTrademarkDisclaimer: true,
    status: "IMPLEMENTED",
    description: "Syncs merchant's own transactions and fulfillment status.",
    antiCircumventionRule: "Private buyer PII stripped; order records cascade on channel deletion.",
  },
  LISTING_MANAGEMENT: {
    capability: "LISTING_MANAGEMENT",
    displayName: "Listing Studio & Draft Publishing",
    allowedSources: ["CONNECTED_STORE"],
    authRequirement: "OAUTH_SELLER_AUTHORIZED",
    requiredOAuthScopes: ["listings_w"],
    maxRetentionDays: null,
    rateLimitPerMinute: 30,
    requireTrademarkDisclaimer: true,
    status: "IMPLEMENTED",
    description: "Pushes human-approved AI listing drafts to Etsy as inactive drafts.",
    antiCircumventionRule: "Human approval gate strictly enforced; drafts never auto-publish without confirmation.",
  },
  INVENTORY: {
    capability: "INVENTORY",
    displayName: "Inventory & Stock Tracking",
    allowedSources: ["CONNECTED_STORE"],
    authRequirement: "OAUTH_SELLER_AUTHORIZED",
    requiredOAuthScopes: ["listings_r", "listings_w"],
    maxRetentionDays: null,
    rateLimitPerMinute: 60,
    requireTrademarkDisclaimer: true,
    status: "IMPLEMENTED",
    description: "Synchronizes stock levels on authorized merchant listings.",
    antiCircumventionRule: "Requires explicit OAuth scope.",
  },
  ANALYTICS: {
    capability: "ANALYTICS",
    displayName: "Own-Store Performance Analytics",
    allowedSources: ["CONNECTED_STORE"],
    authRequirement: "OAUTH_SELLER_AUTHORIZED",
    requiredOAuthScopes: ["transactions_r", "shops_r"],
    maxRetentionDays: null,
    rateLimitPerMinute: 60,
    requireTrademarkDisclaimer: true,
    status: "IMPLEMENTED",
    description: "Aggregates revenue, conversion rate, and order history for authorized stores.",
    antiCircumventionRule: "Store analytics never blended with competitor estimates or shared cross-tenant.",
  },
};

export class EtsyCapabilityMatrixService {
  /**
   * Returns the capability rule for a specific Etsy capability.
   */
  public static getRule(capability: MarketplaceResearchCapability): EtsyCapabilityRule {
    return ETSY_CAPABILITY_MATRIX[capability];
  }

  /**
   * Returns all capability rules.
   */
  public static listRules(): EtsyCapabilityRule[] {
    return Object.values(ETSY_CAPABILITY_MATRIX);
  }
}
