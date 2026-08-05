import { etsyConnector } from "./etsy";
import type { MarketplaceConnector } from "./types";

// Adding a new marketplace = write the connector module, register it here.
// Nothing else in the app (jobs, worker, dashboard) needs to change.
export const connectorRegistry: Record<string, MarketplaceConnector> = {
  ETSY: etsyConnector,
};

export function getConnector(type: string): MarketplaceConnector {
  const connector = connectorRegistry[type];
  if (!connector) throw new Error(`No connector registered for type "${type}"`);
  return connector;
}
