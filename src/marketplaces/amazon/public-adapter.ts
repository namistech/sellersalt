/**
 * SellerSalt Amazon Public Web Acquisition Adapter (Architecture Ready)
 * 
 * Defines the public acquisition contract for Amazon. Live public web ingestion is currently
 * unavailable until dedicated parsers and proxies are approved and activated.
 */

import type {
  PublicWebAcquisitionAdapter,
  PublicSearchQuery,
  PublicAcquisitionResult,
} from "../core/acquisition/contracts";
import type { NormalizedProduct, MarketplaceShopStats } from "../core/types";

export class AmazonPublicWebAdapter implements PublicWebAcquisitionAdapter {
  readonly marketplace = "amazon" as const;
  readonly displayName = "Amazon";
  readonly domain = "amazon.com";

  async searchPublicProducts(
    _query: PublicSearchQuery
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    return {
      success: false,
      marketplace: "amazon",
      items: [],
      sourceType: "PUBLIC_WEB",
      provenance: "UNAVAILABLE",
      error: "Amazon public web acquisition is architecture-ready but not activated yet.",
      fetchedAt: new Date(),
    };
  }

  async fetchPublicProduct(
    _externalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<NormalizedProduct>> {
    return {
      success: false,
      marketplace: "amazon",
      items: [],
      sourceType: "PUBLIC_WEB",
      provenance: "UNAVAILABLE",
      error: "Amazon public web product lookup is not activated yet.",
      fetchedAt: new Date(),
    };
  }

  async fetchPublicShop(
    _shopExternalIdOrUrl: string
  ): Promise<PublicAcquisitionResult<MarketplaceShopStats>> {
    return {
      success: false,
      marketplace: "amazon",
      items: [],
      sourceType: "PUBLIC_WEB",
      provenance: "UNAVAILABLE",
      error: "Amazon public seller lookup is not activated yet.",
      fetchedAt: new Date(),
    };
  }
}

export const amazonPublicWebAdapter = new AmazonPublicWebAdapter();
