/**
 * SellerSalt TikTok Shop Public Web Acquisition Adapter (Architecture Ready)
 * 
 * Defines the public acquisition contract for TikTok Shop.
 */

import type {
  PublicWebAcquisitionAdapter,
  PublicSearchQuery,
  PublicAcquisitionResult,
} from "../core/acquisition/contracts";
import type { NormalizedProduct, MarketplaceShopStats } from "../core/types";

export class TikTokShopPublicWebAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "tiktok_shop" as const;
  readonly displayName = "TikTok Shop";
  readonly domain = "tiktok.com";

  async searchPublicProducts(
    _query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    return {
      success: false,
      marketplace: "tiktok_shop",
      items: [],
      sourceType: "PUBLIC_WEB",
      provenance: "UNAVAILABLE",
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
      error: "TikTok Shop seller lookup is not active.",
      fetchedAt: new Date(),
    };
  }
}

export const tiktokShopPublicWebAdapter = new TikTokShopPublicWebAdapter();
