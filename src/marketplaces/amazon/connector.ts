// ARCHITECTURE READY, NOT OPERATIONAL. No Amazon Selling Partner API
// credentials exist anywhere in this repository or its configured
// AppSettings, and none are invented here. Every capability flag is false;
// every method throws MarketplaceNotImplementedError rather than returning
// fabricated data. Registering this connector lets the rest of the app
// (registry, UI marketplace picker, capability checks) treat "amazon" as a
// known-but-inactive marketplace instead of an unhandled case — activating
// it later means implementing the methods below against Amazon's real SP-API
// and flipping the relevant capability flags, nothing else in the app needs
// to change.
//
// TODO(amazon): register an Amazon SP-API developer application, obtain
// LWA (Login with Amazon) OAuth credentials, and implement authenticate/
// getShops/getListings/getOrders against the real SP-API before flipping
// any capability flag to true.

import { NO_CAPABILITIES } from "../core/capabilities";
import { MarketplaceNotImplementedError } from "../core/errors";
import type { MarketplaceConnector } from "../core/interfaces";

function notImplemented(): never {
  throw new MarketplaceNotImplementedError("amazon");
}

export const amazonConnector: MarketplaceConnector = {
  marketplace: "amazon",
  displayName: "Amazon",
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
