// Maps Etsy-shaped data (from the existing src/connectors/etsy research
// connector and src/seller-channels/etsy-seller OAuth connector) into the
// canonical types in src/marketplaces/core/types.ts. Nothing here calls
// Etsy's API directly — that stays in the existing, working connector
// modules this file imports types from.

import type { ProspectResult, ShopStats, TopListing } from "@/connectors/types";
import type { SellerOrderResult } from "@/seller-channels/types";
import type {
  SearchResult,
  MarketplaceShop,
  Order,
  Listing,
  NormalizedProduct,
} from "../types";

/** The rich mapping the scheduled Prospects pipeline needs — preserves
 * every field `ProspectResult` carries (shop age, review velocity, avg
 * selling ratio, real lifetime sales) rather than the thinner
 * normalizeEtsyProspectToSearchResult above. `source` is ACTUAL_DATA
 * because these are real Etsy API fields, not SellerSalt estimates —
 * `estimatedDemand` is the one derived exception, called out by name. */
export function normalizeEtsyProspectToNormalizedProduct(p: ProspectResult): NormalizedProduct {
  return {
    marketplace: "etsy",
    externalId: p.listingExternalId,
    title: p.listingTitle,
    url: p.listingUrl,
    imageUrl: p.listingImageUrl,
    price: p.price,
    currency: "USD",
    shop: {
      externalId: p.shopExternalId,
      name: p.shopName,
      url: p.shopUrl,
      iconUrl: p.shopIconUrl,
      ageMonths: p.shopAgeMonths,
      activeListings: p.activeListings,
      reviewRatio: p.reviewRatio,
      reviewVelocity: p.reviewVelocity,
      avgSellingRatio: p.avgSellingRatio ?? null,
    },
    rating: p.reviewAverage ?? null,
    reviewCount: p.reviewCount,
    favoritesCount: p.numFavorers ?? null,
    salesCount: p.totalSales ?? null,
    estimatedDemand: p.estDailySales ?? null,
    keyword: p.keyword,
    source: "ACTUAL_DATA",
    capturedAt: new Date(),
  };
}

export function normalizeEtsyProspectToSearchResult(p: ProspectResult): SearchResult {
  return {
    marketplace: "etsy",
    externalId: p.listingExternalId,
    title: p.listingTitle,
    price: p.price,
    currency: "USD",
    url: p.listingUrl,
    imageUrl: p.listingImageUrl,
    shopName: p.shopName,
  };
}

export function normalizeEtsyShopStats(s: ShopStats): MarketplaceShop {
  return {
    marketplace: "etsy",
    externalId: s.shopExternalId,
    name: s.shopName,
    url: s.shopUrl,
    iconUrl: s.shopIconUrl,
    bannerUrl: s.shopBannerUrl,
    ageMonths: s.shopAgeMonths,
    currency: "USD",
  };
}

export function normalizeEtsyTopListing(shopExternalId: string, l: TopListing): SearchResult {
  return {
    marketplace: "etsy",
    externalId: l.listingExternalId,
    title: l.title,
    price: l.price,
    currency: "USD",
    url: l.url,
    imageUrl: l.imageUrl,
  };
}

export function normalizeEtsySellerOrder(marketplaceAccountId: string, o: SellerOrderResult): Order {
  return {
    marketplace: "etsy",
    externalId: o.externalOrderId,
    marketplaceAccountId,
    orderNumber: o.orderNumber,
    totalAmount: o.totalAmount,
    currency: o.currency,
    status: o.status,
    placedAt: o.placedAt,
  };
}

/** Maps a SellerSalt ListingDraft (the app's own record, already
 * marketplace-agnostic in shape) plus its resolved Etsy listing ID into the
 * canonical Listing type once it's live on Etsy. */
export function normalizeEtsyListingDraft(params: {
  marketplaceAccountId: string;
  externalId: string;
  title: string;
  description?: string | null;
  price: number;
  status: Listing["status"];
  tags?: string[];
  quantity?: number | null;
  url?: string;
}): Listing {
  return {
    marketplace: "etsy",
    externalId: params.externalId,
    marketplaceAccountId: params.marketplaceAccountId,
    title: params.title,
    description: params.description ?? undefined,
    price: params.price,
    currency: "USD",
    status: params.status,
    tags: params.tags,
    quantity: params.quantity ?? undefined,
    url: params.url,
  };
}
