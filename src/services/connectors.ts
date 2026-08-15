import { fetchJson } from "./http";

// Adapter for the real Connector backend (/api/connectors) — the
// platform-wide Etsy research connector (see docs/architecture/marketplace.md).
// Deliberately separate from a future "Connected Shop" adapter: a
// Connector is Discover-side research access, never the user's own
// authenticated store (that's SellerChannel — see researchShops.ts's
// header comment for the Research/Connected distinction this project
// enforces at the naming level).

export interface ConnectorSummary {
  id: string;
  type: string;
  label: string;
  status: string;
  scope: "own" | "platform";
}

export async function fetchConnectors(): Promise<ConnectorSummary[]> {
  const data = await fetchJson<{ connectors: ConnectorSummary[] }>("/api/connectors");
  return data.connectors ?? [];
}
