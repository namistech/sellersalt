import { NextResponse } from "next/server";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";

export interface MarketplaceListItem {
  id: string;
  displayName: string;
  status: "LIVE" | "PARTIAL" | "ARCHITECTURE_READY";
  capabilities: Record<string, boolean>;
  /** Batch 35: whether product research is genuinely available right now
   * via EITHER the official API (`capabilities.research`) or a real
   * PUBLIC_WEB adapter (`productSearch`). `capabilities.research` alone
   * used to gate every marketplace picker in the UI, which meant
   * Amazon/Walmart showed as "Coming soon" and were click-disabled even
   * after their public-web adapters were fixed and verified working
   * (see BATCH-35-INDEPENDENT-ACQUISITION-AND-RESEARCH-VALIDATION.md) —
   * `capabilities.research` specifically means "official API", not
   * "research available by any means", and UI code should never have
   * conflated the two. Use this field for "can a merchant actually search
   * this marketplace" instead of `capabilities.research` directly.
   */
  researchAvailable: boolean;
}

// Single source of truth for every marketplace picker in the UI — never
// hardcode the marketplace list client-side. Status is derived from the
// connector's own capability flags, not asserted separately, so this can
// never drift from what the connector actually supports.
export async function GET() {
  registerAllConnectors();
  const marketplaces: MarketplaceListItem[] = MarketplaceRegistry.list().map((connector) => {
    const publicAdapter = MarketplaceRegistry.tryGetPublicWebAdapter(connector.marketplace);
    const researchAvailable = !!connector.capabilities.research || !!publicAdapter?.capabilities.productSearch;

    const capabilityValues = Object.values(connector.capabilities);
    const liveCount = capabilityValues.filter(Boolean).length;
    const status: MarketplaceListItem["status"] =
      researchAvailable || connector.capabilities.createListing
        ? "LIVE"
        : liveCount === 0
        ? "ARCHITECTURE_READY"
        : "PARTIAL";

    return {
      id: connector.marketplace,
      displayName: connector.displayName,
      status,
      capabilities: connector.capabilities as unknown as Record<string, boolean>,
      researchAvailable,
    };
  });

  return NextResponse.json({ marketplaces });
}
