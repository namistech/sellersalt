// Technical capability flags for a MarketplaceConnector. Distinct from (but
// kept structurally close to) MarketplaceCapability in
// src/services/marketplaces/types.ts, which is a product-marketing/display
// matrix consumed by MarketplaceSelector.tsx — that file is left alone so no
// existing UI/tests break. This one gates actual method calls: a connector
// method whose capability flag is false MUST NOT be called, and the registry
// enforces that (see registry.ts's `assertCapability`).
//
// Never set a flag to true unless a real, working implementation exists
// behind it. A stub connector (Amazon/eBay/TikTok Shop today) ships with
// every flag false — that's what makes it honestly "architecture ready"
// rather than a fake integration.

export interface MarketplaceCapabilities {
  /** Public marketplace research: browsing active listings, shop stats,
   * category taxonomy — no seller OAuth required. */
  research: boolean;
  keywordResearch: boolean;
  categoryTaxonomy: boolean;

  /** Everything below requires a connected MarketplaceAccount (OAuth). */
  accountAuth: boolean;
  readShops: boolean;
  readProducts: boolean;
  readListings: boolean;
  readOrders: boolean;
  readInventory: boolean;
  readAnalytics: boolean;

  createListing: boolean;
  updateListing: boolean;
  /** Publishing directly (vs. creating a draft the seller must approve
   * inside the marketplace's own UI) — SellerSalt currently never sets this
   * true anywhere, by design (see docs: "silent publish is prohibited"). */
  publishListing: boolean;
}

export const NO_CAPABILITIES: MarketplaceCapabilities = {
  research: false,
  keywordResearch: false,
  categoryTaxonomy: false,
  accountAuth: false,
  readShops: false,
  readProducts: false,
  readListings: false,
  readOrders: false,
  readInventory: false,
  readAnalytics: false,
  createListing: false,
  updateListing: false,
  publishListing: false,
};

export function withCapabilities(overrides: Partial<MarketplaceCapabilities>): MarketplaceCapabilities {
  return { ...NO_CAPABILITIES, ...overrides };
}
