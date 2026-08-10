import type { SellerChannelConnector } from "./types";
import { woocommerceConnector } from "./woocommerce";

const REGISTRY: Record<string, SellerChannelConnector> = {
  WOOCOMMERCE: woocommerceConnector,
  // SHOPIFY and ETSY_SELLER land here as their own implementations —
  // Shopify needs an OAuth flow (registered Partner app), Etsy-seller needs
  // write-scope OAuth distinct from the existing research Connector.
};

export function getSellerChannelConnector(platform: string): SellerChannelConnector {
  const connector = REGISTRY[platform];
  if (!connector) throw new Error(`No seller channel connector registered for "${platform}".`);
  return connector;
}
