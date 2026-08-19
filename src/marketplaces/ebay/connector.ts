// ARCHITECTURE READY, NOT OPERATIONAL. Note: the Prisma schema's
// SellerChannelPlatform enum already has an EBAY_SELLER value (predates this
// migration) but no connector was ever registered for it in
// src/seller-channels/registry.ts — this file closes that gap at the
// architecture level without inventing an eBay API integration. eBay's own
// Trading/Sell APIs require a registered eBay developer application; no
// credentials exist in this repository.
//
// TODO(ebay): register an eBay Developer Program application, implement
// OAuth + the Sell/Browse API calls below, flip capability flags once real.

import { NO_CAPABILITIES } from "../core/capabilities";
import { MarketplaceNotImplementedError } from "../core/errors";
import type { MarketplaceConnector } from "../core/interfaces";

function notImplemented(): never {
  throw new MarketplaceNotImplementedError("ebay");
}

export const ebayConnector: MarketplaceConnector = {
  marketplace: "ebay",
  displayName: "eBay",
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
