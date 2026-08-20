/**
 * SellerSalt Walmart Marketplace Connector (Architecture Ready)
 * 
 * Official API connector contract for Walmart Marketplace.
 * All capabilities remain false until official Walmart Developer Portal API credentials are provided.
 */

import type { MarketplaceConnector } from "../core/interfaces";
import { NO_CAPABILITIES, type MarketplaceCapabilities } from "../core/capabilities";

export const WALMART_CAPABILITIES: MarketplaceCapabilities = NO_CAPABILITIES;

export const walmartConnector: MarketplaceConnector = {
  marketplace: "walmart",
  displayName: "Walmart",
  capabilities: WALMART_CAPABILITIES,
};
