/**
 * SellerSalt Marketplace Capability Matrix
 * 
 * Canonical single source of truth for marketplace research capabilities,
 * public web ingestion readiness, API requirements, and transparent limitations.
 * 
 * ZERO-FABRICATION RULE:
 * - Capabilities must reflect real code implementations.
 * - Architecture-ready stubs must not be marked as live.
 */

import type { MarketplaceId } from "@/marketplaces/core/types";

export type MarketplaceReadinessStatus =
  | "IMPLEMENTED"
  | "PARTIAL"
  | "ACCESS_RESTRICTED"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "ARCHITECTURE_READY";

export interface MarketplaceCapabilityDetails {
  marketplace: MarketplaceId;
  displayName: string;
  icon: string;
  primaryAcquisitionMethod: "PUBLIC_WEB" | "MARKETPLACE_API" | "CONNECTED_STORE";
  status: MarketplaceReadinessStatus;
  statusLabel: string;
  badgeVariant: "success" | "neutral" | "warning" | "danger" | "info";
  publicWebCapabilities: {
    productSearch: boolean;
    productDetail: boolean;
    shopResearch: boolean;
    keywordDiscovery: boolean;
    categoryDiscovery: boolean;
    reviews: boolean;
    ratings: boolean;
    pricing: boolean;
    taxonomy: boolean;
    salesEstimation: boolean;
  };
  apiCapabilities: {
    research: boolean;
    listingsRead: boolean;
    listingsWrite: boolean;
    ordersRead: boolean;
    analyticsRead: boolean;
  };
  connectedStoreCapabilities: {
    orders: boolean;
    listings: boolean;
    inventory: boolean;
  };
  supportedResearchTypes: Array<"PRODUCT" | "KEYWORD" | "SHOP" | "CATEGORY" | "NICHE" | "RADAR">;
  limitations: string[];
}

export function getMarketplaceCapabilityMatrix(): Record<MarketplaceId, MarketplaceCapabilityDetails> {
  return {
    etsy: {
      marketplace: "etsy",
      displayName: "Etsy",
      icon: "🛍️",
      primaryAcquisitionMethod: "PUBLIC_WEB",
      status: "IMPLEMENTED",
      statusLabel: "Live & Verified",
      badgeVariant: "success",
      publicWebCapabilities: {
        productSearch: true,
        productDetail: true,
        shopResearch: true,
        keywordDiscovery: true,
        categoryDiscovery: true,
        reviews: true,
        ratings: true,
        pricing: true,
        taxonomy: true,
        salesEstimation: true,
      },
      apiCapabilities: {
        research: true,
        listingsRead: true,
        listingsWrite: true,
        ordersRead: true,
        analyticsRead: false,
      },
      connectedStoreCapabilities: {
        orders: true,
        listings: true,
        inventory: false,
      },
      supportedResearchTypes: ["PRODUCT", "KEYWORD", "SHOP", "CATEGORY", "NICHE", "RADAR"],
      limitations: [
        "Public web search and official API v3 supported.",
        "Exact buyer monthly search volume is unavailable without licensed volume provider.",
        "Listing creation requires explicit human draft confirmation.",
      ],
    },
    amazon: {
      marketplace: "amazon",
      displayName: "Amazon",
      icon: "📦",
      primaryAcquisitionMethod: "PUBLIC_WEB",
      status: "PARTIAL",
      statusLabel: "Public Ingestion (Parsers Active)",
      badgeVariant: "neutral",
      publicWebCapabilities: {
        productSearch: true,
        productDetail: true,
        shopResearch: false,
        keywordDiscovery: true,
        categoryDiscovery: false,
        reviews: true,
        ratings: true,
        pricing: true,
        taxonomy: true,
        salesEstimation: false,
      },
      apiCapabilities: {
        research: false,
        listingsRead: false,
        listingsWrite: false,
        ordersRead: false,
        analyticsRead: false,
      },
      connectedStoreCapabilities: {
        orders: false,
        listings: false,
        inventory: false,
      },
      supportedResearchTypes: ["PRODUCT", "KEYWORD", "RADAR"],
      limitations: [
        "Public product search and keyword harvesting active via JSON-LD & semantic HTML.",
        "Official SP-API is architecture-ready awaiting developer credentials.",
        "Subject to occasional public page rate-limits.",
        "Exact sales volume and search queries are unavailable.",
      ],
    },
    ebay: {
      marketplace: "ebay",
      displayName: "eBay",
      icon: "🏷️",
      primaryAcquisitionMethod: "PUBLIC_WEB",
      status: "PARTIAL",
      statusLabel: "Public Ingestion (Parsers Active)",
      badgeVariant: "neutral",
      publicWebCapabilities: {
        productSearch: true,
        productDetail: true,
        shopResearch: false,
        keywordDiscovery: true,
        categoryDiscovery: false,
        reviews: true,
        ratings: true,
        pricing: true,
        taxonomy: true,
        salesEstimation: false,
      },
      apiCapabilities: {
        research: false,
        listingsRead: false,
        listingsWrite: false,
        ordersRead: false,
        analyticsRead: false,
      },
      connectedStoreCapabilities: {
        orders: false,
        listings: false,
        inventory: false,
      },
      supportedResearchTypes: ["PRODUCT", "KEYWORD", "RADAR"],
      limitations: [
        "Public product search and keyword harvesting active via JSON-LD parsers.",
        "Official eBay Buy/Sell APIs are architecture-ready awaiting developer credentials.",
        "Seller store metrics are limited to public listing signals.",
      ],
    },
    walmart: {
      marketplace: "walmart",
      displayName: "Walmart",
      icon: "🏪",
      primaryAcquisitionMethod: "PUBLIC_WEB",
      status: "PARTIAL",
      statusLabel: "Public Ingestion (Parsers Active)",
      badgeVariant: "neutral",
      publicWebCapabilities: {
        productSearch: true,
        productDetail: true,
        shopResearch: false,
        keywordDiscovery: false,
        categoryDiscovery: false,
        reviews: true,
        ratings: true,
        pricing: true,
        taxonomy: false,
        salesEstimation: false,
      },
      apiCapabilities: {
        research: false,
        listingsRead: false,
        listingsWrite: false,
        ordersRead: false,
        analyticsRead: false,
      },
      connectedStoreCapabilities: {
        orders: false,
        listings: false,
        inventory: false,
      },
      supportedResearchTypes: ["PRODUCT", "RADAR"],
      limitations: [
        "Public product search active via JSON-LD microdata.",
        "Official Walmart Marketplace API is architecture-ready awaiting partner access.",
        "Shop research and category hierarchies are not available.",
      ],
    },
    shopify: {
      marketplace: "shopify",
      displayName: "Shopify",
      icon: "🛍️",
      primaryAcquisitionMethod: "CONNECTED_STORE",
      status: "PARTIAL",
      statusLabel: "Connected Store Only",
      badgeVariant: "info",
      publicWebCapabilities: {
        productSearch: false,
        productDetail: false,
        shopResearch: false,
        keywordDiscovery: false,
        categoryDiscovery: false,
        reviews: false,
        ratings: false,
        pricing: false,
        taxonomy: false,
        salesEstimation: false,
      },
      apiCapabilities: {
        research: false,
        listingsRead: true,
        listingsWrite: false,
        ordersRead: true,
        analyticsRead: false,
      },
      connectedStoreCapabilities: {
        orders: true,
        listings: true,
        inventory: false,
      },
      supportedResearchTypes: [],
      limitations: [
        "Shopify is a direct-to-consumer platform without a public centralized marketplace catalog.",
        "Used for syncing merchant's own connected store orders and listings.",
      ],
    },
    woocommerce: {
      marketplace: "woocommerce",
      displayName: "WooCommerce",
      icon: "📦",
      primaryAcquisitionMethod: "CONNECTED_STORE",
      status: "PARTIAL",
      statusLabel: "Connected Store Only",
      badgeVariant: "info",
      publicWebCapabilities: {
        productSearch: false,
        productDetail: false,
        shopResearch: false,
        keywordDiscovery: false,
        categoryDiscovery: false,
        reviews: false,
        ratings: false,
        pricing: false,
        taxonomy: false,
        salesEstimation: false,
      },
      apiCapabilities: {
        research: false,
        listingsRead: true,
        listingsWrite: false,
        ordersRead: true,
        analyticsRead: false,
      },
      connectedStoreCapabilities: {
        orders: true,
        listings: true,
        inventory: false,
      },
      supportedResearchTypes: [],
      limitations: [
        "WooCommerce is a self-hosted platform without a central public marketplace.",
        "Used for syncing merchant's own connected store orders and listings.",
      ],
    },
    tiktok_shop: {
      marketplace: "tiktok_shop",
      displayName: "TikTok Shop",
      icon: "📱",
      primaryAcquisitionMethod: "PUBLIC_WEB",
      status: "ARCHITECTURE_READY",
      statusLabel: "Architecture Ready",
      badgeVariant: "neutral",
      publicWebCapabilities: {
        productSearch: false,
        productDetail: false,
        shopResearch: false,
        keywordDiscovery: false,
        categoryDiscovery: false,
        reviews: false,
        ratings: false,
        pricing: false,
        taxonomy: false,
        salesEstimation: false,
      },
      apiCapabilities: {
        research: false,
        listingsRead: false,
        listingsWrite: false,
        ordersRead: false,
        analyticsRead: false,
      },
      connectedStoreCapabilities: {
        orders: false,
        listings: false,
        inventory: false,
      },
      supportedResearchTypes: ["RADAR"],
      limitations: [
        "Adapter contract and parser stubs implemented.",
        "Public web ingestion is restricted on web interfaces.",
        "Awaiting official TikTok Shop Partner Center credentials.",
      ],
    },
  };
}

export function getMarketplaceCapability(marketplace: MarketplaceId): MarketplaceCapabilityDetails {
  const matrix = getMarketplaceCapabilityMatrix();
  return matrix[marketplace] || {
    marketplace,
    displayName: marketplace.toUpperCase(),
    icon: "🌐",
    primaryAcquisitionMethod: "PUBLIC_WEB",
    status: "UNAVAILABLE",
    statusLabel: "Unavailable",
    badgeVariant: "danger",
    publicWebCapabilities: {
      productSearch: false,
      productDetail: false,
      shopResearch: false,
      keywordDiscovery: false,
      categoryDiscovery: false,
      reviews: false,
      ratings: false,
      pricing: false,
      taxonomy: false,
      salesEstimation: false,
    },
    apiCapabilities: {
      research: false,
      listingsRead: false,
      listingsWrite: false,
      ordersRead: false,
      analyticsRead: false,
    },
    connectedStoreCapabilities: {
      orders: false,
      listings: false,
      inventory: false,
    },
    supportedResearchTypes: [],
    limitations: [`No connector or public web adapter available for ${marketplace}.`],
  };
}
