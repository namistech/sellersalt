import { createEtsyClient } from "./client";
import { isThirdPartyShopLookupEnabled } from "@/lib/feature-flags";
import type { MarketplaceConnector, ProspectResult, SearchConfigInput, ShopStats, TopListing } from "../types";

// Data-honesty update: earlier versions of this connector assumed Etsy's public API
// didn't expose lifetime sales and used review_count as a proxy. That was wrong —
// the shop resource includes `transaction_sold_count`, a real lifetime sales figure.
// totalSales below is that real number; avgSellingRatio and estDailySales are
// computed directly from it, not from reviews. reviewRatio/reviewVelocity are kept
// as secondary signals (engagement rate), not the primary metric anymore.

function computeShopAgeMonths(createdTimestamp?: number | null): number {
  if (!createdTimestamp || isNaN(createdTimestamp)) return 12;
  const diffMs = Date.now() - createdTimestamp * 1000;
  return Math.max(0.1, Math.round((diffMs / (30.44 * 24 * 60 * 60 * 1000)) * 10) / 10);
}

function computeReviewRatio(reviewCount: number, activeListings: number): number {
  if (!activeListings) return 0;
  return Math.round((reviewCount / activeListings) * 100) / 100;
}

function computeReviewVelocity(reviewCount: number, shopAgeMonths: number): number {
  if (!shopAgeMonths) return 0;
  return Math.round((reviewCount / shopAgeMonths) * 10) / 10;
}

function computeAvgSellingRatio(totalSales: number, activeListings: number): number {
  if (!activeListings) return 0;
  return Math.round((totalSales / activeListings) * 100) / 100;
}

function computeEstDailySales(totalSales: number, shopAgeMonths: number): number {
  if (!shopAgeMonths) return 0;
  return Math.round((totalSales / (shopAgeMonths * 30.44)) * 100) / 100;
}

function priceFromListing(listing: any): number | null {
  const p = listing.price;
  if (!p || typeof p.amount !== "number" || !p.divisor) return null;
  return Math.round((p.amount / p.divisor) * 100) / 100;
}

/** Maps a raw Etsy shop object (from either /shops/{id} or /shops?shop_name=)
 * to our normalized ShopStats shape — same field set either way. */
function mapShopToStats(shop: any): ShopStats {
  return {
    shopExternalId: String(shop.shop_id),
    shopName: shop.shop_name ?? "",
    shopUrl: shop.url || `https://www.etsy.com/shop/${shop.shop_name}`,
    shopIconUrl: shop.icon_url_fullxfull ?? undefined,
    shopBannerUrl: shop.image_url_760x100 ?? undefined,
    shopAgeMonths: computeShopAgeMonths(shop.create_date ?? shop.created_timestamp),
    totalSales: shop.transaction_sold_count ?? undefined,
    reviewCount: shop.review_count ?? 0,
    reviewAverage: shop.review_average ?? undefined,
    activeListings: shop.listing_active_count ?? 0,
    numFavorers: shop.num_favorers ?? undefined,
  };
}

export const etsyConnector: MarketplaceConnector = {
  type: "ETSY",

  async testConnection(credentials) {
    try {
      const client = createEtsyClient(credentials.apiKey, credentials.sharedSecret);
      await client.ping();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err.response?.data?.error ?? err.message };
    }
  },

  async runSearch(credentials, config: SearchConfigInput): Promise<ProspectResult[]> {
    const client = createEtsyClient(credentials.apiKey, credentials.sharedSecret);
    const results: ProspectResult[] = [];
    const shopCache = new Map<string, any | null>();
    // Every keyword's search failure, if any — kept distinct from "the
    // search succeeded and genuinely returned zero listings" so callers
    // can tell an upstream/credential failure apart from a real empty
    // result instead of seeing an indistinguishable [] either way.
    const keywordErrors: unknown[] = [];

    for (const keyword of config.keywords) {
      let listings: any[] = [];
      try {
        const data = await client.searchListings({
          keywords: keyword,
          min_price: config.minPrice,
          max_price: config.maxPrice,
          limit: 50,
        });
        listings = data?.results ?? [];
      } catch (err) {
        keywordErrors.push(err);
        continue;
      }

      for (const listing of listings) {
        const shopId = listing.shop_id;
        if (!shopId) continue;

        const allowThirdPartyShop = isThirdPartyShopLookupEnabled();
        let shop = allowThirdPartyShop ? shopCache.get(shopId) : null;
        if (allowThirdPartyShop && shop === undefined) {
          try {
            shop = await client.getShop(shopId);
          } catch {
            shop = null;
          }
          shopCache.set(shopId, shop);
        }

        const shopCreatedTimestamp = shop?.create_date ?? shop?.created_timestamp;
        const shopAgeMonths = shop ? computeShopAgeMonths(shopCreatedTimestamp) : 12;
        const reviewCount = shop?.review_count ?? 0;
        const activeListings = shop?.listing_active_count ?? 0;
        const totalSales = shop?.transaction_sold_count ?? 0;

        if (shop && (shopAgeMonths < config.minShopAgeMonths || shopAgeMonths > config.maxShopAgeMonths)) continue;
        if (shop && reviewCount < config.minReviewCount) continue;

        const price = priceFromListing(listing);
        if (price === null || price < config.minPrice || price > config.maxPrice) continue;

        let listingImageUrl: string | undefined;
        if (Array.isArray(listing.images) && listing.images.length > 0) {
          const firstImg = listing.images[0];
          listingImageUrl = firstImg?.url_570xN || firstImg?.url_fullxfull || firstImg?.url_170x135 || firstImg?.url_75x75;
        } else if (Array.isArray(listing.Images) && listing.Images.length > 0) {
          const firstImg = listing.Images[0];
          listingImageUrl = firstImg?.url_570xN || firstImg?.url_fullxfull || firstImg?.url_170x135 || firstImg?.url_75x75;
        } else {
          try {
            const imgData = await client.getListingImages(listing.listing_id);
            const firstImg = imgData?.results?.[0];
            listingImageUrl = firstImg?.url_570xN || firstImg?.url_fullxfull || firstImg?.url_170x135 || firstImg?.url_75x75;
          } catch {
            listingImageUrl = undefined;
          }
        }

        results.push({
          keyword,
          shopExternalId: String(shopId),
          shopName: shop?.shop_name ?? "",
          shopUrl: shop?.url || (shop?.shop_name ? `https://www.etsy.com/shop/${shop.shop_name}` : `https://www.etsy.com/listing/${listing.listing_id}`),
          shopIconUrl: shop?.icon_url_fullxfull ?? undefined,
          shopAgeMonths,
          reviewCount,
          activeListings,
          reviewRatio: computeReviewRatio(reviewCount, activeListings),
          reviewVelocity: computeReviewVelocity(reviewCount, shopAgeMonths),
          totalSales,
          reviewAverage: shop?.review_average ?? undefined,
          numFavorers: shop?.num_favorers ?? undefined,
          avgSellingRatio: computeAvgSellingRatio(totalSales, activeListings),
          estDailySales: computeEstDailySales(totalSales, shopAgeMonths),
          listingExternalId: String(listing.listing_id),
          listingTitle: listing.title ?? "",
          listingUrl: listing.url || `https://www.etsy.com/listing/${listing.listing_id}`,
          listingImageUrl,
          price,
        });
      }
    }

    // If every single keyword attempt errored (not just "Etsy returned zero
    // matching listings"), that's an acquisition failure, not a real empty
    // result — rethrow the first one so callers (the orchestrator) can
    // report an honest REQUIRES_CREDENTIALS/UPSTREAM_ERROR/RATE_LIMITED
    // status instead of a silent, indistinguishable [].
    if (results.length === 0 && keywordErrors.length > 0 && keywordErrors.length === config.keywords.length) {
      throw keywordErrors[0];
    }

    return results;
  },

  async getShopStats(credentials, shopExternalId) {
    if (!isThirdPartyShopLookupEnabled()) return null;
    try {
      const client = createEtsyClient(credentials.apiKey, credentials.sharedSecret);
      const shop = await client.getShop(shopExternalId);
      if (!shop) return null;
      return mapShopToStats(shop);
    } catch {
      return null;
    }
  },

  async getShopByName(credentials, shopName) {
    if (!isThirdPartyShopLookupEnabled()) return null;
    try {
      const client = createEtsyClient(credentials.apiKey, credentials.sharedSecret);
      const data = await client.searchShopsByName(shopName);
      const shop = data?.results?.[0];
      if (!shop) return null;
      return mapShopToStats(shop);
    } catch {
      return null;
    }
  },

  async getShopTopListings(credentials, shopExternalId, limit): Promise<TopListing[]> {
    if (!isThirdPartyShopLookupEnabled()) return [];
    try {
      const client = createEtsyClient(credentials.apiKey, credentials.sharedSecret);
      const data = await client.getShopListings(shopExternalId, limit);
      const listings = data?.results ?? [];

      const results: TopListing[] = [];
      for (const listing of listings) {
        const price = priceFromListing(listing);
        if (price === null) continue;

        let imageUrl: string | undefined;
        try {
          const imgData = await client.getListingImages(listing.listing_id);
          imageUrl = imgData?.results?.[0]?.url_170x135;
        } catch {
          imageUrl = undefined;
        }

        results.push({
          listingExternalId: String(listing.listing_id),
          title: listing.title ?? "",
          price,
          url: listing.url || `https://www.etsy.com/listing/${listing.listing_id}`,
          imageUrl,
        });
      }
      return results;
    } catch {
      return [];
    }
  },

  async getBuyerTaxonomyTree(credentials) {
    try {
      const client = createEtsyClient(credentials.apiKey, credentials.sharedSecret);
      const data = await client.getBuyerTaxonomyNodes();
      return data?.results ?? [];
    } catch {
      return [];
    }
  },

  async getTaxonomyProperties(credentials, taxonomyId) {
    try {
      const client = createEtsyClient(credentials.apiKey, credentials.sharedSecret);
      const data = await client.getPropertiesByBuyerTaxonomyId(taxonomyId);
      return data?.results ?? [];
    } catch {
      return [];
    }
  },
};

export { createEtsyClient } from "./client";
export { etsyCache, ETSY_CACHE_TTL } from "./cache";
export * from "./taxonomy";
