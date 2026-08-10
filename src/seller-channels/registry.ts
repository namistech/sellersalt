import type { SellerChannelConnector } from "./types";
import { woocommerceConnector } from "./woocommerce";
import { shopifyConnector } from "./shopify";

const REGISTRY: Record<string, SellerChannelConnector> = {
  WOOCOMMERCE: woocommerceConnector,
  SHOPIFY: shopifyConnector,
  // ETSY_SELLER lands here as its own implementation — needs write-scope
  // OAuth distinct from the existing research Connector.
};

export function getSellerChannelConnector(platform: string): SellerChannelConnector {
  const connector = REGISTRY[platform];
  if (!connector) throw new Error(`No seller channel connector registered for "${platform}".`);
  return connector;
}
