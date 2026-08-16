/**
 * SellerSalt Multi-Marketplace Capability Abstraction
 * Canonical model for marketplace connector capabilities and platform expansion.
 */

export type MarketplaceId = "etsy" | "amazon" | "ebay" | "tiktok_shop" | "walmart";

export interface MarketplaceCapability {
  research: boolean;
  productSearch: boolean;
  shopSearch: boolean;
  keywordResearch: boolean;
  listingRead: boolean;
  listingCreate: boolean;
  draftCreate: boolean;
  publish: boolean;
  analytics: boolean;
  orders: boolean;
  inventory: boolean;
}

export interface MarketplaceDefinition {
  id: MarketplaceId;
  name: string;
  shortName: string;
  icon: string;
  status: "active" | "coming_soon" | "beta";
  badgeLabel?: string;
  description: string;
  capabilities: MarketplaceCapability;
  supportedCountries: string[];
}

export const MARKETPLACE_DEFINITIONS: Record<MarketplaceId, MarketplaceDefinition> = {
  etsy: {
    id: "etsy",
    name: "Etsy Marketplace",
    shortName: "Etsy",
    icon: "🛍️",
    status: "active",
    badgeLabel: "Active",
    description: "Primary handcrafted, vintage & custom goods marketplace with full research & intelligence.",
    capabilities: {
      research: true,
      productSearch: true,
      shopSearch: true,
      keywordResearch: true,
      listingRead: true,
      listingCreate: false, // requires listings_w OAuth scope approval
      draftCreate: true, // draft creation through SellerChannel connector
      publish: false, // silent publishing prohibited per Rule 9; requires human review
      analytics: true,
      orders: false,
      inventory: true,
    },
    supportedCountries: ["US", "GB", "CA", "AU", "DE", "FR"],
  },
  amazon: {
    id: "amazon",
    name: "Amazon Marketplace",
    shortName: "Amazon",
    icon: "📦",
    status: "coming_soon",
    badgeLabel: "Coming soon",
    description: "Global e-commerce marketplace (Amazon Handmade, FBA & Merchant fulfilled).",
    capabilities: {
      research: false,
      productSearch: false,
      shopSearch: false,
      keywordResearch: false,
      listingRead: false,
      listingCreate: false,
      draftCreate: false,
      publish: false,
      analytics: false,
      orders: false,
      inventory: false,
    },
    supportedCountries: ["US", "UK", "DE", "FR", "CA"],
  },
  ebay: {
    id: "ebay",
    name: "eBay Marketplace",
    shortName: "eBay",
    icon: "🏷️",
    status: "coming_soon",
    badgeLabel: "Coming soon",
    description: "Global auction and fixed-price retail marketplace.",
    capabilities: {
      research: false,
      productSearch: false,
      shopSearch: false,
      keywordResearch: false,
      listingRead: false,
      listingCreate: false,
      draftCreate: false,
      publish: false,
      analytics: false,
      orders: false,
      inventory: false,
    },
    supportedCountries: ["US", "GB", "DE", "AU"],
  },
  tiktok_shop: {
    id: "tiktok_shop",
    name: "TikTok Shop",
    shortName: "TikTok Shop",
    icon: "📱",
    status: "coming_soon",
    badgeLabel: "Coming soon",
    description: "Social commerce video marketplace with viral trend velocity.",
    capabilities: {
      research: false,
      productSearch: false,
      shopSearch: false,
      keywordResearch: false,
      listingRead: false,
      listingCreate: false,
      draftCreate: false,
      publish: false,
      analytics: false,
      orders: false,
      inventory: false,
    },
    supportedCountries: ["US", "GB", "ID", "TH", "VN"],
  },
  walmart: {
    id: "walmart",
    name: "Walmart Marketplace",
    shortName: "Walmart",
    icon: "🛒",
    status: "coming_soon",
    badgeLabel: "Coming soon",
    description: "Curated multi-category omnichannel US marketplace.",
    capabilities: {
      research: false,
      productSearch: false,
      shopSearch: false,
      keywordResearch: false,
      listingRead: false,
      listingCreate: false,
      draftCreate: false,
      publish: false,
      analytics: false,
      orders: false,
      inventory: false,
    },
    supportedCountries: ["US", "CA"],
  },
};

export function getMarketplaceCapability(
  id: MarketplaceId,
  capability: keyof MarketplaceCapability
): boolean {
  return MARKETPLACE_DEFINITIONS[id]?.capabilities[capability] ?? false;
}
