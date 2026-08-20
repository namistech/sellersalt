/**
 * SellerSalt Historical Observation Persistence
 * 
 * Persists normalized public web observations into PostgreSQL (Prospect table & Snapshots)
 * when organization context is available to build longitudinal research time-series.
 */

import { prisma } from "@/lib/db";
import type { NormalizedProduct, MarketplaceId } from "../types";
import type { ConnectorType } from "@prisma/client";

export interface PersistenceResult {
  savedCount: number;
  skippedCount: number;
  error?: string;
}

function mapMarketplaceToConnectorType(marketplace?: MarketplaceId): ConnectorType {
  switch (marketplace) {
    case "amazon":
      return "AMAZON";
    case "ebay":
      return "EBAY";
    case "tiktok_shop":
      return "TIKTOK_SHOP";
    case "shopify":
      return "SHOPIFY";
    case "woocommerce":
      return "WOOCOMMERCE";
    case "etsy":
    case "walmart":
    default:
      return "ETSY";
  }
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
  if (!products || products.length === 0 || !options.organizationId) {
    return { savedCount: 0, skippedCount: products ? products.length : 0 };
  }

  let savedCount = 0;
  let skippedCount = 0;

  try {
    const orgId = options.organizationId;
    const kw = options.searchQuery || "public_search";
    let configId = options.searchConfigId;

    // Resolve or create a default search config if not provided
    if (!configId) {
      const existingConfig = await prisma.searchConfig.findFirst({
        where: { organizationId: orgId, isActive: true },
        select: { id: true },
      });

      if (existingConfig) {
        configId = existingConfig.id;
      } else {
        // Resolve platform connector or create default search config
        let connector = await prisma.connector.findFirst({
          where: { organizationId: orgId, status: "ACTIVE" },
        });

        if (!connector) {
          connector = await prisma.connector.findFirst({
            where: { organizationId: null, status: "ACTIVE" },
          });
        }

        if (connector) {
          const newConfig = await prisma.searchConfig.create({
            data: {
              organizationId: orgId,
              connectorId: connector.id,
              name: "Public Market Research",
              keywords: [kw],
              minPrice: 0,
              maxPrice: 10000,
              isActive: true,
            },
          });
          configId = newConfig.id;
        }
      }
    }

    if (!configId) {
      return { savedCount: 0, skippedCount: products.length };
    }

    const defaultMarketplaceType = mapMarketplaceToConnectorType(options.marketplace);

    for (const p of products) {
      if (!p.externalId || !p.title) {
        skippedCount++;
        continue;
      }

      const marketplaceType = mapMarketplaceToConnectorType(p.marketplace);
      const existing = await prisma.prospect.findFirst({
        where: {
          organizationId: orgId,
          listingExternalId: p.externalId,
        },
      });

      if (existing) {
        // Track price change if listing snapshot watch exists
        const listingWatch = await prisma.listingWatch.findUnique({
          where: {
            organizationId_listingExternalId: {
              organizationId: orgId,
              listingExternalId: p.externalId,
            },
          },
        });

        if (listingWatch && p.price !== null && p.price !== undefined) {
          await prisma.listingSnapshot.create({
            data: {
              listingWatchId: listingWatch.id,
              price: p.price,
              currency: p.currency || "USD",
              numFavorers: p.favoritesCount ?? null,
              capturedAt: new Date(),
            },
          });
        }

        await prisma.prospect.update({
          where: { id: existing.id },
          data: {
            listingTitle: p.title,
            price: p.price !== null && p.price !== undefined ? p.price : existing.price,
            listingImageUrl: p.imageUrl || existing.listingImageUrl,
            numFavorers: p.favoritesCount !== null ? p.favoritesCount : existing.numFavorers,
            reviewCount: p.reviewCount !== null ? p.reviewCount : existing.reviewCount,
            reviewAverage: p.rating !== null ? p.rating : existing.reviewAverage,
            totalSales: p.salesCount !== null ? p.salesCount : existing.totalSales,
          },
        });
      } else {
        await prisma.prospect.create({
          data: {
            organizationId: orgId,
            searchConfigId: configId,
            keyword: kw,
            marketplace: marketplaceType || defaultMarketplaceType,
            shopExternalId: p.shop?.name || p.externalId,
            listingExternalId: p.externalId,
            shopName: p.shop?.name || "Marketplace Merchant",
            shopUrl: p.shop?.url || p.url || "",
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
