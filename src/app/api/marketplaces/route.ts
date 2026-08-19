import { NextResponse } from "next/server";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";

export interface MarketplaceListItem {
  id: string;
  displayName: string;
  status: "LIVE" | "PARTIAL" | "ARCHITECTURE_READY";
  capabilities: Record<string, boolean>;
}

// Single source of truth for every marketplace picker in the UI — never
// hardcode the marketplace list client-side. Status is derived from the
// connector's own capability flags, not asserted separately, so this can
// never drift from what the connector actually supports.
export async function GET() {
  registerAllConnectors();
  const marketplaces: MarketplaceListItem[] = MarketplaceRegistry.list().map((connector) => {
    const capabilityValues = Object.values(connector.capabilities);
    const liveCount = capabilityValues.filter(Boolean).length;
    const status: MarketplaceListItem["status"] =
      liveCount === 0 ? "ARCHITECTURE_READY" : connector.capabilities.research || connector.capabilities.createListing ? "LIVE" : "PARTIAL";

    return {
      id: connector.marketplace,
      displayName: connector.displayName,
      status,
      capabilities: connector.capabilities as unknown as Record<string, boolean>,
    };
  });

  return NextResponse.json({ marketplaces });
}
