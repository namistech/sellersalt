// Canonical, marketplace-neutral commerce entities. Every connector adapter
// (src/marketplaces/<marketplace>/connector.ts) maps its marketplace's own
// shapes into these before anything in the intelligence layer sees them —
// intelligence code should never import an Etsy/Shopify/WooCommerce-specific
// type directly. See /docs/SELLERSALT-MARKETPLACE-ARCHITECTURE.md.
//
// This does NOT replace the existing Prisma models (SellerChannel, Connector,
// ListingDraft, SellerOrder, Prospect, etc.) — those remain the source of
// truth in the database. These types are the in-memory shape connectors
// normalize INTO at the service-call boundary, analogous to how
// `SellerOrderResult` in src/seller-channels/types.ts already does this for
// one narrow case. This generalizes that pattern across every entity a
// marketplace connector can expose.

/** Canonical marketplace identifier. Must match a key registered in the
 * marketplace registry (src/marketplaces/core/registry.ts). */
export type MarketplaceId =
  | "etsy"
  | "shopify"
  | "woocommerce"
  | "amazon"
  | "ebay"
  | "tiktok_shop";

/** Maps a connected `SellerChannel.platform` (Prisma's `SellerChannelPlatform`
 * enum, e.g. from `getServerSession`-scoped DB reads) to the `MarketplaceId`
 * the rest of this layer speaks. One canonical mapping, reused everywhere a
 * feature needs "which marketplace does this connected store belong to" —
 * never re-derive this per call site. */
export const SELLER_CHANNEL_PLATFORM_TO_MARKETPLACE: Record<string, MarketplaceId> = {
  ETSY_SELLER: "etsy",
  SHOPIFY: "shopify",
  WOOCOMMERCE: "woocommerce",
  AMAZON_SELLER: "amazon",
  EBAY_SELLER: "ebay",
  TIKTOK_SHOP_SELLER: "tiktok_shop",
};

export function marketplaceFromSellerChannelPlatform(platform: string): MarketplaceId | null {
  return SELLER_CHANNEL_PLATFORM_TO_MARKETPLACE[platform] ?? null;
}

/** Every marketplace-scoped identifier travels with these three fields so a
 * normalized entity's identity is never implicitly "whatever Etsy calls it." */
export interface MarketplaceRef {
  marketplace: MarketplaceId;
  /** The ID as the marketplace's own API returns it (string — some
   * marketplaces use numeric IDs, some use GIDs/opaque strings). */
  externalId: string;
  /** The connected account (SellerChannel.id) this record came through, when
   * it's seller-authorized data. Absent for platform-owned public research
   * data (see Connector.id in that case, carried separately by the caller). */
  marketplaceAccountId?: string;
}

export interface MarketplaceAccount extends MarketplaceRef {
  organizationId: string;
  label: string;
  storeUrl?: string;
  connectedAt: Date;
  status: "ACTIVE" | "ERROR" | "DISABLED";
}

export interface MarketplaceShop extends MarketplaceRef {
  name: string;
  url?: string;
  iconUrl?: string;
  bannerUrl?: string;
  ageMonths?: number;
  currency?: string;
  country?: string;
}

export interface MarketplaceShopStats extends MarketplaceShop {
  totalSales?: number;
  reviewCount?: number;
  reviewAverage?: number;
  activeListings?: number;
  numFavorers?: number;
}

export interface ProductVariant {
  externalId?: string;
  sku?: string;
  price?: number;
  currency?: string;
  quantity?: number;
  attributes?: Record<string, string>;
}

export interface Product extends MarketplaceRef {
  title: string;
  description?: string;
  price: number;
  currency: string;
  quantity?: number;
  variants?: ProductVariant[];
  category?: Category;
  imageUrls?: string[];
}

export interface ListingAttribute {
  name: string;
  value: string;
  /** True when the marketplace-defined taxonomy requires this attribute
   * (e.g. Etsy's per-category "properties"). */
  required?: boolean;
}

export interface ListingImage {
  url: string;
  altText?: string;
  position?: number;
}

export type ListingStatus = "draft" | "active" | "inactive" | "sold_out" | "expired" | "unknown";

/** The canonical shape every ListingOptimizer / SEO / AI-generation service
 * consumes and produces. Marketplace-specific constraints (Etsy's 140-char
 * title / 13 tags, Amazon's bullet points, etc.) are never hardcoded against
 * this type — they're expressed as MarketplaceOptimizationRules
 * (see core/optimization-rules.ts) that a caller applies on top of it. */
export interface Listing extends MarketplaceRef {
  shopId?: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  status: ListingStatus;
  category?: Category;
  attributes?: ListingAttribute[];
  tags?: string[];
  images?: ListingImage[];
  quantity?: number;
  url?: string;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface OrderItem {
  externalId?: string;
  listingExternalId?: string;
  title: string;
  quantity: number;
  price: number;
  currency: string;
}

export interface Order extends MarketplaceRef {
  orderNumber?: string;
  totalAmount: number;
  currency: string;
  status: string;
  placedAt: Date;
  items?: OrderItem[];
}

export interface Inventory extends MarketplaceRef {
  listingExternalId: string;
  quantity: number;
  updatedAt?: Date;
}

export interface Category {
  id: string;
  name: string;
  path?: string[];
  marketplace?: MarketplaceId;
}

export interface Keyword {
  term: string;
  marketplace?: MarketplaceId;
  searchIntent?: "commercial" | "informational" | "long_tail" | "unknown";
}

export interface SearchResult extends MarketplaceRef {
  title: string;
  price?: number;
  currency?: string;
  url?: string;
  imageUrl?: string;
  shopName?: string;
}

/** Provenance is mandatory on every signal — never emit a MarketSignal /
 * DemandSignal / PriceSignal without saying where the number came from.
 * Mirrors the existing ProvenanceBadgeType convention in
 * src/services/intelligence/universal-scoring.ts. */
export type SignalProvenance = "ACTUAL_DATA" | "ESTIMATED" | "SELLERSALT_SCORE" | "UNAVAILABLE";

export interface MarketSignal {
  marketplace: MarketplaceId;
  category?: Category;
  keyword?: string;
  metric: string;
  value: number | null;
  provenance: SignalProvenance;
  observedAt: Date;
}

export interface DemandSignal extends MarketSignal {
  estimatedDailyUnits?: number | null;
  trendDirection?: "up" | "down" | "flat" | "unavailable";
}

export interface PriceSignal extends MarketSignal {
  medianPrice: number | null;
  priceRangeLow?: number | null;
  priceRangeHigh?: number | null;
}

export interface CompetitionSignal extends MarketSignal {
  activeListingCount: number | null;
  incumbentStrength: "low" | "moderate" | "high" | "unavailable";
}

export interface SalesSignal extends MarketSignal {
  estimatedUnitsSold: number | null;
  window: "24h" | "7d" | "30d" | "lifetime";
}

export interface TrendSignal extends MarketSignal {
  direction: "rising" | "falling" | "flat" | "unavailable";
  changePercent: number | null;
}

/** A keyword-related metric with a mandatory, explicit source — a search
 * volume/competition/trend number must never be silently blended across
 * providers (e.g. an Etsy-observed metric and a SellerSalt-derived estimate
 * presented as if they were the same kind of number). */
export interface KeywordSignal {
  term: string;
  metric: "search_volume" | "competition" | "trend" | "commercial_intent" | "opportunity";
  value: number | null;
  source: "etsy" | "amazon" | "ebay" | "shopify" | "woocommerce" | "tiktok_shop" | "sellersalt_derived" | "unavailable";
  provenance: SignalProvenance;
}

/**
 * Canonical, marketplace-neutral product research record — the shape a
 * connector's product-search method normalizes into. Deliberately richer
 * than `SearchResult` (used for lightweight listing previews): this is what
 * feeds the Prospects/Opportunity Radar pipeline, so it carries the seller
 * (shop) metrics needed to score an opportunity, not just title/price/url.
 *
 * Every field a marketplace doesn't actually provide is `null`/`undefined`
 * — never computed/guessed to fill the shape out. `source` records
 * provenance the same way the rest of the app already badges data
 * ([ACTUAL ETSY DATA] / [ESTIMATED] / [SELLERSALT SCORE] / [EXTERNAL DATA]).
 */
export interface NormalizedProduct extends MarketplaceRef {
  title: string;
  url?: string;
  imageUrl?: string;
  price: number | null;
  currency: string | null;
  category?: Category;
  categoryPath?: string[];

  shop?: {
    externalId?: string;
    name?: string;
    url?: string;
    iconUrl?: string;
    ageMonths?: number | null;
    activeListings?: number | null;
    /** Reviews-per-listing and reviews-per-month engagement rates — kept as
     * secondary signals alongside `reviewCount`/`salesCount`, matching the
     * existing Prospects data model (src/connectors/types.ts's
     * ProspectResult) this normalizes from. */
    reviewRatio?: number | null;
    reviewVelocity?: number | null;
    avgSellingRatio?: number | null;
  };
  /** The specific seller/account ID when a marketplace legitimately exposes
   * one distinct from the shop itself (most marketplaces don't — leave
   * undefined rather than reusing shop.externalId to fake precision). */
  sellerId?: string;

  /** Multi-source acquisition channel metadata */
  acquisitionMethod?: DataSourceType;
  observedAt?: Date;
  isHistorical?: boolean;

  rating?: number | null;
  reviewCount?: number | null;
  /** Wishlist/favorites count — a fairly common marketplace concept (Etsy's
   * num_favorers, similar signals exist elsewhere), not Etsy-specific. */
  favoritesCount?: number | null;
  /** Real observed lifetime/period sales count where the marketplace
   * exposes it (e.g. Etsy's transaction_sold_count) — never a guess. */
  salesCount?: number | null;
  /** Daily-sales-style demand estimate derived from salesCount + shop age —
   * SellerSalt's own derived number, hence `source` below distinguishes it
   * from a marketplace-native metric even when it rides along on the same
   * record. */
  estimatedDemand?: number | null;

  keywordSignals?: KeywordSignal[];
  competitionSignals?: CompetitionSignal[];
  opportunityScore?: OpportunityScoreRef | null;

  /** Which search keyword produced this record, when applicable. */
  keyword?: string;
  source: SignalProvenance;
  capturedAt: Date;
}

/** Avoids a circular import with opportunity-engine.ts (which itself
 * imports from this file) — opportunity-engine's real `OpportunityScore`
 * satisfies this narrower shape. */
export interface OpportunityScoreRef {
  score: number | null;
  confidence: number;
  tier?: string;
  verdict?: string;
  verdictVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  availableSignals?: string[];
  unavailableSignals?: string[];
}

/** A single cross-marketplace-comparable opportunity — what
 * runOpportunityResearch's multi-marketplace mode assembles per marketplace
 * per keyword/category. Distinct from OpportunityScore (opportunity-
 * engine.ts), which is the per-listing scoring envelope; this is the
 * higher-level "is this worth pursuing here" research-output shape. */
export interface MarketOpportunity {
  marketplace: MarketplaceId;
  keyword?: string;
  category?: Category;
  demand: DemandSignal | null;
  competition: CompetitionSignal | null;
  price: PriceSignal | null;
  trend: TrendSignal | null;
  available: boolean;
  unavailableReason?: string;
}

export interface ListingPerformance extends MarketplaceRef {
  views?: number;
  favorites?: number;
  salesVelocityPerDay?: number | null;
  conversionRate?: number | null;
}

export interface SellerAnalytics {
  marketplaceAccountId: string;
  marketplace: MarketplaceId;
  periodStart: Date;
  periodEnd: Date;
  grossRevenue: number;
  currency: string;
  orderCount: number;
}

/**
 * Canonical evaluation of a product, niche, or search across a single marketplace.
 */
export interface MarketplaceEvaluation {
  marketplace: MarketplaceId;
  displayName: string;
  status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";
  products: NormalizedProduct[];
  totalProductsCount: number;
  scoredProductsCount: number;
  opportunityScore: number | null;
  confidence: number | null;
  tier?: string;
  verdict?: string;
  verdictVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  availableSignals: string[];
  unavailableSignals: string[];
  provenance: SignalProvenance;
  message?: string;
  evaluatedAt: Date;
}

/**
 * Comparative ranking entry for a single marketplace that has valid, live data.
 * NOTE: Unavailable or not implemented marketplaces are strictly excluded from ranking.
 */
export interface CrossMarketplaceRanking {
  rank: number;
  marketplace: MarketplaceId;
  displayName: string;
  opportunityScore: number;
  confidence: number;
  tier?: string;
  verdict?: string;
  verdictVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  evaluatedSignalsCount: number;
  totalSignalsCount: number;
}

/**
 * Cross-marketplace intelligence comparison model.
 * Evaluates how attractive a product/niche is across all requested channels,
 * ranking ONLY marketplaces with real data, maintaining calibrated confidence,
 * and listing honest system limitations.
 */
export interface CrossMarketplaceComparison {
  query?: string;
  evaluations: MarketplaceEvaluation[];
  availableMarketplaces: MarketplaceId[];
  unavailableMarketplaces: MarketplaceId[];
  rankings: CrossMarketplaceRanking[];
  bestAvailableMarketplace?: {
    marketplace: MarketplaceId;
    displayName: string;
    opportunityScore: number;
    confidence: number;
    verdict?: string;
    verdictVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  };
  highestConfidenceMarketplace?: {
    marketplace: MarketplaceId;
    displayName: string;
    confidence: number;
    opportunityScore: number;
  };
  comparisonConfidence: number | null;
  limitations: string[];
  comparedAt: Date;
}

/**
 * Aggregated demand signal for a specific niche / category cluster.
 */
export interface NicheDemandSignal {
  strength: "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
  score: number | null; // 0-100 normalized demand proxy score
  observedDailyVelocity: number | null;
  observedFavoritesTotal: number | null;
  catalogYieldAverage: number | null;
  provenance: SignalProvenance;
  confidence: number;
  explanation: string;
}

/**
 * Aggregated competition barrier signal for a specific niche / category cluster.
 */
export interface NicheCompetitionSignal {
  intensity: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH" | "UNAVAILABLE";
  score: number | null; // 0-100 competition barrier score
  averageReviewThreshold: number | null;
  topShopConcentration: number | null; // % of products from top 3 shops (0-100)
  incumbentDominance: "LOW" | "MODERATE" | "HIGH" | "UNAVAILABLE";
  provenance: SignalProvenance;
  confidence: number;
  explanation: string;
}

/**
 * Observed trajectory & listing freshness signal for a niche.
 * NOTE: Historical growth is ONLY populated when genuine multi-window snapshots exist;
 * otherwise growthRatePercent remains null and direction derives from freshness.
 */
export interface NicheMomentumSignal {
  direction: "RISING" | "STABLE" | "DECLINING" | "UNAVAILABLE";
  growthRatePercent: number | null;
  observationWindowDays: number | null;
  snapshotCount: number;
  isHistorical: boolean;
  freshnessRatio: number | null; // % of listings created within 90 days (0-100)
  provenance: SignalProvenance;
  confidence: number;
  explanation: string;
}

export interface NicheSubcategory {
  name: string;
  productCount: number;
  averageScore: number | null;
}

export interface NicheKeywordCluster {
  clusterName: string;
  keywords: string[];
  frequency: number;
}

/**
 * Canonical Niche Opportunity evaluation.
 * Aggregates product observations into a coherent niche intelligence profile.
 */
export interface NicheOpportunity {
  id: string;
  nicheName: string;
  marketplace: MarketplaceId;
  status: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";
  opportunityScore: number | null;
  confidence: number;
  tier: string;
  verdict: string;
  verdictVariant: "success" | "warning" | "danger" | "info" | "neutral";

  observedProductCount: number;
  averagePrice: number | null;
  priceRange: { min: number; max: number } | null;

  demand: NicheDemandSignal;
  competition: NicheCompetitionSignal;
  momentum: NicheMomentumSignal;

  topSubcategories: NicheSubcategory[];
  topKeywordClusters: NicheKeywordCluster[];
  sampleProducts: NormalizedProduct[];

  availableSignalGroups: string[];
  unavailableSignalGroups: string[];
  provenance: SignalProvenance;
  limitations: string[];
  evaluatedAt: Date;
}

/**
 * Discovery summary envelope for a set of discovered niches.
 */
export interface NicheDiscoverySummary {
  query?: string;
  marketplace: MarketplaceId;
  totalNichesFound: number;
  niches: NicheOpportunity[];
  topNiche?: NicheOpportunity;
  marketLimitations: string[];
  generatedAt: Date;
}

/**
 * Legitimate acquisition channel types through which SellerSalt can obtain commerce data.
 */
export type DataSourceType =
  | "MARKETPLACE_API"          // Official Marketplace Open API v3 / Partner API
  | "PUBLIC_WEB"               // Legitimate public JSON-LD / HTML parser
  | "USER_IMPORT"              // User-provided CSV / manual listing import
  | "CONNECTED_STORE"          // Authenticated seller channel (SellerChannel)
  | "HISTORICAL_OBSERVATION"   // Persisted SellerSalt historical observations (Prospect, Snapshots)
  | "EXTERNAL_PROVIDER"        // Third-party licensed provider (DataForSEO, Rainforest, Keepa, etc.)
  | "DEV_FIXTURE";             // Offline sanitized development / CI test fixture

/**
 * Standard observation origin and provenance envelope.
 */
export interface ObservationMetadata {
  sourceType: DataSourceType;
  sourceIdentifier: string;
  marketplace: MarketplaceId;
  observedAt: Date;
  provenance: SignalProvenance;
  confidenceScore?: number; // 0-100
  isHistorical?: boolean;
}

/**
 * Generic normalized observation envelope carrying entity data alongside explicit acquisition origin.
 */
export interface NormalizedObservation<T> {
  id: string;
  data: T;
  metadata: ObservationMetadata;
}



