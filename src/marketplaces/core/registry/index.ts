import type { MarketplaceId } from "../types";
import type { MarketplaceConnector } from "../interfaces";
import { MarketplaceCapabilityUnavailableError } from "../errors";
import type { MarketplaceCapabilities } from "../capabilities";
import type { PublicWebAcquisitionAdapter, PublicWebCapabilities } from "../acquisition/contracts";

import { etsyConnector } from "../../etsy/connector";
import { shopifyMarketplaceConnector } from "../../shopify/connector";
import { woocommerceMarketplaceConnector } from "../../woocommerce/connector";
import { amazonConnector } from "../../amazon/connector";
import { ebayConnector } from "../../ebay/connector";
import { tiktokShopConnector } from "../../tiktok-shop/connector";
import { walmartConnector } from "../../walmart/connector";

import { etsyPublicWebAdapter } from "../../etsy/public-adapter";
import { amazonPublicWebAdapter } from "../../amazon/public-adapter";
import { ebayPublicWebAdapter } from "../../ebay/public-adapter";
import { walmartPublicWebAdapter } from "../../walmart/public-adapter";
import { tiktokShopPublicWebAdapter } from "../../tiktok-shop/public-adapter";

class MarketplaceRegistryImpl {
  private connectors = new Map<MarketplaceId, MarketplaceConnector>();
  private publicAdapters = new Map<MarketplaceId, PublicWebAcquisitionAdapter>();

  // Connector Registration
  register(connector: MarketplaceConnector): void {
    this.connectors.set(connector.marketplace, connector);
  }

  getConnector(id: MarketplaceId): MarketplaceConnector {
    const connector = this.connectors.get(id);
    if (!connector) {
      throw new Error(`No marketplace connector registered for "${id}".`);
    }
    return connector;
  }

  tryGetConnector(id: MarketplaceId): MarketplaceConnector | null {
    return this.connectors.get(id) ?? null;
  }

  list(): MarketplaceConnector[] {
    return Array.from(this.connectors.values());
  }

  /** Only marketplaces with at least one real (non-stub) official API capability. */
  listActive(): MarketplaceConnector[] {
    return this.list().filter((c) => Object.values(c.capabilities).some(Boolean));
  }

  // Public Web Adapter Registration
  registerPublicWebAdapter(adapter: PublicWebAcquisitionAdapter): void {
    this.publicAdapters.set(adapter.marketplace, adapter);
  }

  getPublicWebAdapter(id: MarketplaceId): PublicWebAcquisitionAdapter {
    const adapter = this.publicAdapters.get(id);
    if (!adapter) {
      throw new Error(`No public web adapter registered for "${id}".`);
    }
    return adapter;
  }

  tryGetPublicWebAdapter(id: MarketplaceId): PublicWebAcquisitionAdapter | null {
    return this.publicAdapters.get(id) ?? null;
  }

  listPublicWebAdapters(): PublicWebAcquisitionAdapter[] {
    return Array.from(this.publicAdapters.values());
  }

  /** Only public adapters with at least one active capability. */
  listActivePublicWebAdapters(): PublicWebAcquisitionAdapter[] {
    return this.listPublicWebAdapters().filter((a) =>
      Object.values(a.capabilities).some(Boolean)
    );
  }
}

export const MarketplaceRegistry = new MarketplaceRegistryImpl();

/** Asserts an official connector capability is real before a caller invokes the gated method. */
export function assertCapability(
  connector: MarketplaceConnector,
  capability: keyof MarketplaceCapabilities
): void {
  if (!connector.capabilities[capability]) {
    throw new MarketplaceCapabilityUnavailableError(connector.marketplace, capability);
  }
}

/** Asserts a public web capability is real before invoking. */
export function assertPublicWebCapability(
  adapter: PublicWebAcquisitionAdapter,
  capability: keyof PublicWebCapabilities
): void {
  if (!adapter.capabilities[capability]) {
    throw new MarketplaceCapabilityUnavailableError(adapter.marketplace, capability as any);
  }
}

let registered = false;

/** Idempotent — safe to call from multiple entry points (API routes,
 * workers, tests) without double-registering. */
export function registerAllConnectors(): void {
  if (registered) return;
  registered = true;

  // 1. Official Connectors
  MarketplaceRegistry.register(etsyConnector);
  MarketplaceRegistry.register(shopifyMarketplaceConnector);
  MarketplaceRegistry.register(woocommerceMarketplaceConnector);
  MarketplaceRegistry.register(amazonConnector);
  MarketplaceRegistry.register(ebayConnector);
  MarketplaceRegistry.register(tiktokShopConnector);
  MarketplaceRegistry.register(walmartConnector);

  // 2. Public Web Acquisition Adapters
  MarketplaceRegistry.registerPublicWebAdapter(etsyPublicWebAdapter);
  MarketplaceRegistry.registerPublicWebAdapter(amazonPublicWebAdapter);
  MarketplaceRegistry.registerPublicWebAdapter(ebayPublicWebAdapter);
  MarketplaceRegistry.registerPublicWebAdapter(walmartPublicWebAdapter);
  MarketplaceRegistry.registerPublicWebAdapter(tiktokShopPublicWebAdapter);
}
