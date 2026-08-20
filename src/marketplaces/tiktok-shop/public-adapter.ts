/**
 * SellerSalt TikTok Shop Public Web Acquisition Adapter (Architecture Ready)
 * 
 * Defines the public acquisition contract for TikTok Shop.
 * Capabilities remain false until public surface extraction or official developer credentials become active.
 */

import type {
  PublicWebAcquisitionAdapter,
  PublicWebCapabilities,
  PublicSearchQuery,
  PublicAcquisitionResult,
} from "../core/acquisition/contracts";
import type { NormalizedProduct, MarketplaceShopStats } from "../core/types";

export const TIKTOK_SHOP_PUBLIC_WEB_CAPABILITIES: PublicWebCapabilities = {
  productSearch: false,
  productDetail: false,
  shopResearch: false,
  keywordDiscovery: false,
  categoryDiscovery: false,
  reviews: false,
  ratings: false,
  pricing: false,
  images: false,
  taxonomy: false,
  engagement: false,
  salesEstimation: false,
};

export class TikTokShopPublicWebAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "tiktok_shop" as const;
  readonly displayName = "TikTok Shop";
  readonly domain = "tiktok.com";
  readonly capabilities = TIKTOK_SHOP_PUBLIC_WEB_CAPABILITIES;

  async searchPublicProducts(
    _query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    return {
      success: false,
      marketplace: "tiktok_shop",
      items: [],
      sourceType: "PUBLIC_WEB",
      provenance: "UNAVAILABLE",
      failureReason: "NOT_IMPLEMENTED",
      error: "TikTok Shop public web search is architecture-ready but not active.",
      fetchedAt: new Date(),
    };
  }

  async fetchPublicProduct(
    _externalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    return {
      success: false,
      marketplace: "tiktok_shop",
      items: [],
      sourceType: "PUBLIC_WEB",
      provenance: "UNAVAILABLE",
      failureReason: "NOT_IMPLEMENTED",
      error: "TikTok Shop public product lookup is not active.",
      fetchedAt: new Date(),
    };
  }

  async fetchPublicShop(
    _shopExternalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<MarketplaceShopStats>> {
    return {
      success: false,
      marketplace: "tiktok_shop",
      items: [],
      sourceType: "PUBLIC_WEB",
      provenance: "UNAVAILABLE",
      failureReason: "NOT_IMPLEMENTED",
      error: "TikTok Shop seller lookup is not active.",
      fetchedAt: new Date(),
    };
  }
}

export const tiktokShopPublicWebAdapter = new TikTokShopPublicWebAdapter();
