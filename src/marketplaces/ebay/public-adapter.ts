/**
 * SellerSalt eBay Public Web Acquisition Adapter (Architecture Ready)
 * 
 * Defines the public acquisition contract for eBay.
 */

import type {
  PublicWebAcquisitionAdapter,
  PublicSearchQuery,
  PublicAcquisitionResult,
} from "../core/acquisition/contracts";
import type { NormalizedProduct, MarketplaceShopStats } from "../core/types";

export class EbayPublicWebAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "ebay" as const;
  readonly displayName = "eBay";
  readonly domain = "ebay.com";

  async searchPublicProducts(
    _query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    return {
      success: false,
      marketplace: "ebay",
      items: [],
      sourceType: "PUBLIC_WEB",
      provenance: "UNAVAILABLE",
      error: "eBay public web acquisition is architecture-ready but not activated yet.",
      fetchedAt: new Date(),
    };
  }

  async fetchPublicProduct(
    _externalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    return {
      success: false,
      marketplace: "ebay",
      items: [],
      sourceType: "PUBLIC_WEB",
      provenance: "UNAVAILABLE",
      error: "eBay public web product lookup is not activated yet.",
      fetchedAt: new Date(),
    };
  }

  async fetchPublicShop(
    _shopExternalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<MarketplaceShopStats>> {
    return {
      success: false,
      marketplace: "ebay",
      items: [],
      sourceType: "PUBLIC_WEB",
      provenance: "UNAVAILABLE",
      error: "eBay public seller lookup is not activated yet.",
      fetchedAt: new Date(),
    };
  }
}

export const ebayPublicWebAdapter = new EbayPublicWebAdapter();
