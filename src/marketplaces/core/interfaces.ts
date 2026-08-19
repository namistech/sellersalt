import type { MarketplaceCapabilities } from "./capabilities";
import type {
  MarketplaceId,
  MarketplaceAccount,
  MarketplaceShop,
  Product,
  Listing,
  Order,
  Inventory,
  Category,
  SearchResult,
  DemandSignal,
  PriceSignal,
  SellerAnalytics,
  NormalizedProduct,
} from "./types";

export interface MarketplaceAuthResult {
  account: MarketplaceAccount;
}

export interface MarketplaceResearchQuery {
  /** Required by every real connector's public-research methods today —
   * platform-owned research credentials (src/connectors/*) are resolved
   * per-organization (an org may bring its own key; falls back to the
   * shared platform connector). Optional on the type only because a future
   * marketplace's research might genuinely need no org context; a connector
   * that does need it (Etsy does) throws a clear error if it's missing
   * rather than silently calling the marketplace API with empty
   * credentials. */
  organizationId?: string;
  keywords?: string[];
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  /** Seller/shop-age and review-count filters — not Etsy-specific concepts
   * (most marketplaces expose some analogue), included here so the
   * canonical query shape can carry what the scheduled research pipeline
   * (src/services/searchConfigs.ts's SearchConfig) actually filters on. */
  minShopAgeMonths?: number;
  maxShopAgeMonths?: number;
  minReviewCount?: number;
}

/**
 * Every marketplace connector implements this shape. Not every marketplace
 * supports every operation — `capabilities` tells callers what's real before
 * they call it, and every optional/gated method throws
 * MarketplaceCapabilityUnavailableError (via the registry's
 * `callWithCapability` helper) rather than silently returning fabricated
 * data when unsupported.
 *
 * This wraps, rather than replaces, the two existing narrower interfaces:
 * - src/connectors/types.ts's `MarketplaceConnector` (platform-owned public
 *   research — search/shop-stats/taxonomy)
 * - src/seller-channels/types.ts's `SellerChannelConnector` (one customer's
 *   own authenticated store — orders today, more later)
 * A connector adapter under src/marketplaces/<id>/connector.ts composes
 * whichever of those two already exist for that marketplace (see
 * src/marketplaces/etsy/connector.ts for the fullest example) and normalizes
 * their output into the canonical types from ./types.
 */
export interface MarketplaceConnector {
  marketplace: MarketplaceId;
  displayName: string;
  capabilities: MarketplaceCapabilities;

  // --- Account lifecycle (requires seller OAuth) ---
  authenticate?(params: { organizationId: string; credentials: Record<string, string>; storeUrl?: string }): Promise<MarketplaceAuthResult>;
  disconnect?(account: MarketplaceAccount): Promise<void>;
  getAccount?(marketplaceAccountId: string): Promise<MarketplaceAccount | null>;
  getShops?(marketplaceAccountId: string): Promise<MarketplaceShop[]>;

  // --- Seller's own data (requires a connected account) ---
  getProducts?(marketplaceAccountId: string): Promise<Product[]>;
  getListings?(marketplaceAccountId: string): Promise<Listing[]>;
  getOrders?(marketplaceAccountId: string, since?: Date): Promise<Order[]>;
  getInventory?(marketplaceAccountId: string): Promise<Inventory[]>;
  getAnalytics?(marketplaceAccountId: string, periodStart: Date, periodEnd: Date): Promise<SellerAnalytics | null>;

  // --- Writes (gated by capabilities.createListing / updateListing) ---
  createListing?(marketplaceAccountId: string, listing: Partial<Listing>): Promise<Listing>;
  updateListing?(marketplaceAccountId: string, externalId: string, patch: Partial<Listing>): Promise<Listing>;

  // --- Public market research (no seller OAuth; capabilities.research) ---
  searchPublicListings?(query: MarketplaceResearchQuery): Promise<SearchResult[]>;
  /** Richer than searchPublicListings — includes shop/seller metrics needed
   * to score an opportunity (reviews, sales, shop age), not just
   * title/price/url. This is what the Prospects/Opportunity Radar pipeline
   * consumes; searchPublicListings stays the lightweight preview shape used
   * by simpler "what listings match this keyword" callers. */
  searchProducts?(query: MarketplaceResearchQuery): Promise<NormalizedProduct[]>;
  getPublicShopStats?(shopExternalId: string): Promise<MarketplaceShop | null>;
  getCategories?(): Promise<Category[]>;
  getDemandSignal?(query: MarketplaceResearchQuery): Promise<DemandSignal>;
  getPriceSignal?(query: MarketplaceResearchQuery): Promise<PriceSignal>;
}
