import { createEtsyClient } from "./client";
import type { MarketplaceConnector, ProspectResult, SearchConfigInput } from "../types";

function computeShopAgeMonths(createdTimestamp: number): number {
  const diffMs = Date.now() - createdTimestamp * 1000;
  return Math.round((diffMs / (30.44 * 24 * 60 * 60 * 1000)) * 10) / 10;
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
      } catch {
        continue;
      }

      for (const listing of listings) {
        const shopId = listing.shop_id;
        if (!shopId) continue;

        let shop = shopCache.get(shopId);
        if (shop === undefined) {
          try {
            shop = await client.getShop(shopId);
          } catch {
            shop = null;
          }
          shopCache.set(shopId, shop);
        }
        if (!shop) continue;

        const shopAgeMonths = computeShopAgeMonths(shop.created_timestamp);
        const reviewCount = shop.review_count ?? 0;
        const activeListings = shop.listing_active_count ?? 0;
        const totalSales = shop.transaction_sold_count ?? 0;

        if (shopAgeMonths < config.minShopAgeMonths || shopAgeMonths > config.maxShopAgeMonths) continue;
        if (reviewCount < config.minReviewCount) continue;

        const price = priceFromListing(listing);
        if (price === null || price < config.minPrice || price > config.maxPrice) continue;

        let listingImageUrl: string | undefined;
        try {
          const imgData = await client.getListingImages(listing.listing_id);
          listingImageUrl = imgData?.results?.[0]?.url_170x135;
        } catch {
          listingImageUrl = undefined;
        }

        results.push({
          keyword,
          shopExternalId: String(shopId),
          shopName: shop.shop_name ?? "",
          shopUrl: shop.url || `https://www.etsy.com/shop/${shop.shop_name}`,
          shopIconUrl: shop.icon_url_fullxfull ?? undefined,
          shopAgeMonths,
          reviewCount,
          activeListings,
          reviewRatio: computeReviewRatio(reviewCount, activeListings),
          reviewVelocity: computeReviewVelocity(reviewCount, shopAgeMonths),
          totalSales,
          reviewAverage: shop.review_average ?? undefined,
          numFavorers: shop.num_favorers ?? undefined,
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

    return results;
  },

  async getShopStats(credentials, shopExternalId) {
    try {
      const client = createEtsyClient(credentials.apiKey, credentials.sharedSecret);
      const shop = await client.getShop(shopExternalId);
      if (!shop) return null;
      return {
        shopExternalId: String(shop.shop_id),
        shopName: shop.shop_name ?? "",
        shopUrl: shop.url || `https://www.etsy.com/shop/${shop.shop_name}`,
        shopIconUrl: shop.icon_url_fullxfull ?? undefined,
        totalSales: shop.transaction_sold_count ?? undefined,
        reviewCount: shop.review_count ?? 0,
        reviewAverage: shop.review_average ?? undefined,
        activeListings: shop.listing_active_count ?? 0,
        numFavorers: shop.num_favorers ?? undefined,
      };
    } catch {
      return null;
    }
  },
};