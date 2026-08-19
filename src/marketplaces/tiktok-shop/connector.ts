// ARCHITECTURE READY, NOT OPERATIONAL. TikTok Shop Partner Center API
// credentials are not present anywhere in this repository; none are
// invented here.
//
// TODO(tiktok-shop): register a TikTok Shop Partner Center app, implement
// OAuth + Product/Order API calls, flip capability flags once real.

import { NO_CAPABILITIES } from "../core/capabilities";
import { MarketplaceNotImplementedError } from "../core/errors";
import type { MarketplaceConnector } from "../core/interfaces";

function notImplemented(): never {
  throw new MarketplaceNotImplementedError("tiktok_shop");
}

export const tiktokShopConnector: MarketplaceConnector = {
  marketplace: "tiktok_shop",
  displayName: "TikTok Shop",
  capabilities: { ...NO_CAPABILITIES },

  async authenticate() {
    notImplemented();
  },
  async getAccount() {
    notImplemented();
  },
  async getShops() {
    notImplemented();
  },
  async getOrders() {
    notImplemented();
  },
  async searchPublicListings() {
    notImplemented();
  },
};
