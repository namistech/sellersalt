import type { MarketplaceId } from "../types";
import type { MarketplaceConnector } from "../interfaces";
import { MarketplaceCapabilityUnavailableError } from "../errors";
import type { MarketplaceCapabilities } from "../capabilities";
import { etsyConnector } from "../../etsy/connector";
import { shopifyMarketplaceConnector } from "../../shopify/connector";
import { woocommerceMarketplaceConnector } from "../../woocommerce/connector";
import { amazonConnector } from "../../amazon/connector";
import { ebayConnector } from "../../ebay/connector";
import { tiktokShopConnector } from "../../tiktok-shop/connector";

// Adding a marketplace = write src/marketplaces/<id>/connector.ts, register
// it in registerAllConnectors() below. Nothing else in the app needs to
// change — this mirrors the existing, proven pattern in
// src/connectors/registry.ts and src/seller-channels/registry.ts, just
// unified across both the research side and the seller-account side.
class MarketplaceRegistryImpl {
  private connectors = new Map<MarketplaceId, MarketplaceConnector>();

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

  /** Only marketplaces with at least one real (non-stub) capability. */
  listActive(): MarketplaceConnector[] {
    return this.list().filter((c) => Object.values(c.capabilities).some(Boolean));
  }
}

export const MarketplaceRegistry = new MarketplaceRegistryImpl();

/** Asserts a capability is real before a caller invokes the gated method,
 * so "the marketplace doesn't support this" is always a typed, catchable
 * error rather than a crash inside a stub throwing something else, or worse,
 * a stub silently returning an empty/fabricated result. */
export function assertCapability(
  connector: MarketplaceConnector,
  capability: keyof MarketplaceCapabilities
): void {
  if (!connector.capabilities[capability]) {
    throw new MarketplaceCapabilityUnavailableError(connector.marketplace, capability);
  }
}

let registered = false;

/** Idempotent — safe to call from multiple entry points (API routes,
 * workers, tests) without double-registering. Connector modules must only
 * import from ../types, ../interfaces, ../capabilities, ../errors — never
 * from this registry module — so this file can safely import all of them
 * statically without a require-cycle. */
export function registerAllConnectors(): void {
  if (registered) return;
  registered = true;

  MarketplaceRegistry.register(etsyConnector);
  MarketplaceRegistry.register(shopifyMarketplaceConnector);
  MarketplaceRegistry.register(woocommerceMarketplaceConnector);
  MarketplaceRegistry.register(amazonConnector);
  MarketplaceRegistry.register(ebayConnector);
  MarketplaceRegistry.register(tiktokShopConnector);
}
