// Structured "this capability isn't available" response — the shape every
// migrated research service/route returns instead of throwing a generic
// error that would take down an entire page. A route/service can always
// check `"available" in result && result.available === false` before
// treating a response as real data.

import { MarketplaceRegistry, registerAllConnectors } from "./registry";
import type { MarketplaceCapabilities } from "./capabilities";
import type { MarketplaceId } from "./types";

export interface CapabilityUnavailable {
  available: false;
  marketplace: MarketplaceId;
  capability: string;
  reason: "CONNECTOR_NOT_IMPLEMENTED" | "CONNECTOR_NOT_CONFIGURED" | "UNKNOWN_MARKETPLACE";
  message: string;
}

const HUMAN_LABEL: Record<MarketplaceId, string> = {
  etsy: "Etsy",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  amazon: "Amazon",
  ebay: "eBay",
  tiktok_shop: "TikTok Shop",
};

/**
 * Returns a CapabilityUnavailable if `marketplace` can't currently serve
 * `capability` — null if it's genuinely available. Callers do:
 *
 *   const unavailable = checkMarketplaceCapability(marketplace, "research");
 *   if (unavailable) return unavailable;
 *   // ... real work, this marketplace is live for this capability ...
 */
export function checkMarketplaceCapability(
  marketplace: MarketplaceId,
  capability: keyof MarketplaceCapabilities
): CapabilityUnavailable | null {
  registerAllConnectors();
  const connector = MarketplaceRegistry.tryGetConnector(marketplace);
  const label = HUMAN_LABEL[marketplace] ?? marketplace;

  if (!connector) {
    return {
      available: false,
      marketplace,
      capability,
      reason: "UNKNOWN_MARKETPLACE",
      message: `"${marketplace}" is not a recognized marketplace.`,
    };
  }

  if (!connector.capabilities[capability]) {
    return {
      available: false,
      marketplace,
      capability,
      reason: "CONNECTOR_NOT_IMPLEMENTED",
      message: `${label} ${capability} is not currently available. Connector status: ${
        Object.values(connector.capabilities).some(Boolean) ? "partial" : "architecture ready, no live API integration yet"
      }.`,
    };
  }

  return null;
}
