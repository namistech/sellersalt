import type { SellerChannelConnector } from "./types";
import { woocommerceConnector } from "./woocommerce";
import { shopifyConnector } from "./shopify";
import { etsySellerConnector } from "./etsy-seller";

const REGISTRY: Record<string, SellerChannelConnector> = {
  WOOCOMMERCE: woocommerceConnector,
  SHOPIFY: shopifyConnector,
  ETSY_SELLER: etsySellerConnector,
};

export function getSellerChannelConnector(platform: string): SellerChannelConnector {
  const connector = REGISTRY[platform];
  if (!connector) throw new Error(`No seller channel connector registered for "${platform}".`);
  return connector;
}
