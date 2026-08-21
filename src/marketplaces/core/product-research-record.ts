/**
 * SellerSalt Canonical Product Research Record (Batch 38)
 *
 * The single, canonical shape a Product Research surface (API response, UI
 * table, saved/persisted row) should read from — assembled from the
 * marketplace-neutral `NormalizedProduct` (live acquisition) or the
 * persisted `ProductObservation` (historical/database) rows, never a third
 * independent shape. See docs/PRODUCT-RESEARCH-DATA-CONTRACT.md for the
 * full field-by-field rationale and per-marketplace availability matrix.
 *
 * Every field is explicitly nullable/optional where the legitimate source
 * doesn't expose it — this file adds no new acquisition capability, it only
 * gives the fields Batch 37 already proved real a single canonical shape to
 * travel through the app in.
 */

import type { NormalizedProduct, MarketplaceId, SignalProvenance, DataSourceType } from "./types";
import type { ProductObservation } from "@prisma/client";

export type ObservationStatus = "LIVE" | "HISTORICAL";

/** How much a consumer should trust this record's numeric fields — derived
 * directly from the existing `SignalProvenance`/confidence pair already
 * carried on every observation, not a new invented taxonomy. */
export interface DataTrust {
  provenance: SignalProvenance;
  /** 0-100, null when no confidence score was computed for this record. */
  confidence: number | null;
}

export interface ProductResearchRecord {
  // IDENTITY
  id: string;
  marketplace: MarketplaceId;
  productId: string;
  title: string;
  productUrl: string | null;
  imageUrl: string | null;

  // SELLER — null when the marketplace/page doesn't expose one (e.g.
  // Amazon search cards never show a seller; only its product-detail page
  // does — see the data contract doc's per-marketplace matrix).
  sellerName: string | null;
  sellerUrl: string | null;
  sellerId: string | null;

  // COMMERCIAL
  price: number | null;
  currency: string | null;
  availability: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNAVAILABLE" | null;
  /** Real fulfillment/shipping classification text, verbatim from the
   * marketplace (e.g. "Fulfilled by Walmart") — never invented. */
  fulfillmentType: string | null;

  // ENGAGEMENT
  rating: number | null;
  reviewCount: number | null;

  // MARKETPLACE SIGNALS
  category: string[]; // most-general first; [] when unavailable
  brand: string | null;
  /** Real, on-page merchandising/disclosure labels only. */
  badges: string[];
  /** A marketplace's own published sales-rank signal (e.g. Amazon's "Best
   * Sellers Rank") — never a SellerSalt-derived estimate. [] when the
   * marketplace doesn't expose one (confirmed true for Walmart today). */
  bestsellerRank: Array<{ rank: number; category: string }>;
  /** Reserved for future marketplace-specific structured properties (size,
   * color, material, etc.) once a real, verified source exists. No current
   * adapter populates this — deliberately left [] rather than invented. */
  attributes: Record<string, string>;

  // TEMPORAL
  observedAt: Date;
  /** Null for a fresh, not-yet-persisted live observation — only a
   * database-backed record has a real "first seen" timestamp. */
  firstObservedAt: Date | null;
  lastObservedAt: Date | null;

  // PROVENANCE
  source: SignalProvenance;
  acquisitionMethod: DataSourceType | null;
  sourceUrl: string | null;
  observationStatus: ObservationStatus;
  dataTrust: DataTrust;
  /** Which single search keyword produced this record — required to
   * preserve provenance under multi-keyword (OR-fanout) search. Null when
   * not tracked (e.g. a direct product-detail lookup). */
  keyword: string | null;

  // EXPLICIT UNAVAILABLE DISCLOSURE — sales/demand are never computed here.
  // Real, legitimate demand-proxy evidence (rating/reviewCount/
  // bestsellerRank/price) lives in the fields above; a genuine sales count
  // is UNAVAILABLE from every marketplace this app acquires from today
  // (see docs/PRODUCT-RESEARCH-DATA-CONTRACT.md §Sales/Revenue/Demand).
  salesCount: null;
}

/** Builds a ProductResearchRecord from a fresh, live NormalizedProduct
 * (not yet persisted) — used for the search-response path. */
export function toProductResearchRecordFromNormalizedProduct(
  p: NormalizedProduct
): ProductResearchRecord {
  return {
    id: `${p.marketplace}:${p.externalId}`,
    marketplace: p.marketplace,
    productId: p.externalId,
    title: p.title,
    productUrl: p.url ?? null,
    imageUrl: p.imageUrl ?? null,

    sellerName: p.shop?.name ?? null,
    sellerUrl: p.shop?.url ?? null,
    sellerId: p.shop?.externalId ?? null,

    price: p.price ?? null,
    currency: p.currency ?? null,
    availability: p.availability ?? null,
    fulfillmentType: p.shippingInfo ?? null,

    rating: p.rating ?? null,
    reviewCount: p.reviewCount ?? null,

    category: p.categoryPath && p.categoryPath.length > 0 ? p.categoryPath : p.category ? [p.category.name] : [],
    brand: p.brand ?? null,
    badges: p.badges ?? [],
    bestsellerRank: p.bestSellerRank ?? [],
    attributes: {},

    observedAt: p.capturedAt ?? new Date(),
    firstObservedAt: null,
    lastObservedAt: null,

    source: p.source,
    acquisitionMethod: p.acquisitionMethod ?? null,
    sourceUrl: p.url ?? null,
    observationStatus: p.isHistorical ? "HISTORICAL" : "LIVE",
    dataTrust: {
      provenance: p.source,
      confidence: p.opportunityScore?.confidence ?? null,
    },
    keyword: p.keyword ?? null,

    salesCount: null,
  };
}

/** Builds a ProductResearchRecord from a persisted `ProductObservation` row
 * — used for historical/database-backed reads (e.g. "what changed for this
 * product over time"). */
export function toProductResearchRecordFromObservation(
  obs: ProductObservation
): ProductResearchRecord {
  let bestsellerRank: Array<{ rank: number; category: string }> = [];
  if (obs.bestSellerRankJson) {
    try {
      const parsed = JSON.parse(obs.bestSellerRankJson);
      if (Array.isArray(parsed)) bestsellerRank = parsed;
    } catch {
      bestsellerRank = [];
    }
  }

  return {
    id: obs.id,
    marketplace: obs.marketplace as MarketplaceId,
    productId: obs.externalId,
    title: obs.title,
    productUrl: obs.sourceUrl ?? null,
    imageUrl: obs.imageUrl ?? null,

    sellerName: obs.shopName ?? null,
    sellerUrl: obs.shopUrl ?? null,
    sellerId: obs.shopExternalId ?? null,

    price: obs.price ?? null,
    currency: obs.currency ?? null,
    availability: (obs.availability as ProductResearchRecord["availability"]) ?? null,
    fulfillmentType: obs.shippingInfo ?? null,

    rating: obs.rating ?? null,
    reviewCount: obs.reviewCount ?? null,

    category: obs.categoryPath ?? [],
    brand: obs.brand ?? null,
    badges: obs.badges ?? [],
    bestsellerRank,
    attributes: {},

    observedAt: obs.observedAt,
    firstObservedAt: obs.createdAt,
    lastObservedAt: obs.observedAt,

    source: (obs.provenance as SignalProvenance) ?? "ACTUAL_DATA",
    acquisitionMethod: (obs.sourceType as DataSourceType) ?? null,
    sourceUrl: obs.sourceUrl ?? null,
    observationStatus: "HISTORICAL",
    dataTrust: {
      provenance: (obs.provenance as SignalProvenance) ?? "ACTUAL_DATA",
      confidence: obs.confidence ?? null,
    },
    keyword: obs.keyword ?? null,

    salesCount: null,
  };
}
