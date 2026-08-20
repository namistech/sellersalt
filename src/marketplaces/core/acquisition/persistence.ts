/**
 * SellerSalt Historical Observation Persistence
 * 
 * Persists normalized public web observations into PostgreSQL (Prospect table)
 * when organization context is available to build longitudinal research time-series.
 */

import { prisma } from "@/lib/db";
import type { NormalizedProduct, MarketplaceId } from "../types";

export interface PersistenceResult {
  savedCount: number;
  skippedCount: number;
  error?: string;
}

export async function persistPublicProductObservations(
  products: NormalizedProduct[],
  options: {
    organizationId?: string;
    searchConfigId?: string;
    searchQuery?: string;
    marketplace?: MarketplaceId;
  } = {}
): Promise<PersistenceResult> {
  if (!products || products.length === 0 || !options.organizationId || !options.searchConfigId) {
    return { savedCount: 0, skippedCount: products ? products.length : 0 };
  }

  let savedCount = 0;
  let skippedCount = 0;

  try {
    const orgId = options.organizationId;
    const configId = options.searchConfigId;
    const kw = options.searchQuery || "public_search";

    for (const p of products) {
      if (!p.externalId || !p.title) {
        skippedCount++;
        continue;
      }

      const existing = await prisma.prospect.findFirst({
        where: {
          organizationId: orgId,
          listingExternalId: p.externalId,
        },
      });

      if (existing) {
        await prisma.prospect.update({
          where: { id: existing.id },
          data: {
            listingTitle: p.title,
            price: p.price !== null && p.price !== undefined ? p.price : existing.price,
            listingImageUrl: p.imageUrl || existing.listingImageUrl,
            numFavorers: p.favoritesCount !== null ? p.favoritesCount : existing.numFavorers,
            reviewCount: p.reviewCount !== null ? p.reviewCount : existing.reviewCount,
          },
        });
      } else {
        await prisma.prospect.create({
          data: {
            organizationId: orgId,
            searchConfigId: configId,
            keyword: kw,
            marketplace: "ETSY",
            shopExternalId: p.shop?.name || p.externalId,
            listingExternalId: p.externalId,
            shopName: p.shop?.name || "Unknown Shop",
            shopUrl: p.shop?.url || `https://www.etsy.com/shop/${p.shop?.name || "shop"}`,
            shopAgeMonths: p.shop?.ageMonths ?? 12,
            reviewCount: p.reviewCount ?? 0,
            activeListings: p.shop?.activeListings ?? 1,
            reviewRatio: 1.0,
            reviewVelocity: 0.1,
            totalSales: p.salesCount ?? null,
            reviewAverage: p.rating ?? null,
            numFavorers: p.favoritesCount ?? null,
            listingTitle: p.title || "Untitled Product",
            listingUrl: p.url || "",
            listingImageUrl: p.imageUrl ?? null,
            price: p.price !== null && p.price !== undefined ? p.price : 0,
          },
        });
      }

      savedCount++;
    }

    return { savedCount, skippedCount };
  } catch (err: any) {
    return { savedCount, skippedCount, error: err?.message };
  }
}
