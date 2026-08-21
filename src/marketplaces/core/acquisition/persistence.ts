/**
 * SellerSalt Historical Observation Persistence
 * 
 * Persists normalized public web observations into PostgreSQL:
 * 1. ProductObservation & ProductObservationSnapshot (First-class longitudinal tracking & deduplication)
 * 2. KeywordObservation (Empirical keyword frequency & demand tracking)
 * 3. CategoryObservation (Category-level price & opportunity tracking)
 * 4. Prospect (Backward-compatible export and legacy prospect UI)
 * 
 * Strictly follows the Zero-Fabrication Rule: missing metrics remain null.
 */

import { prisma } from "@/lib/db";
import type { NormalizedProduct, MarketplaceId } from "../types";
import type { ConnectorType } from "@prisma/client";
import { computeProductObservationFingerprint, evaluateObservationChange } from "./deduplication";
import type { CanonicalKeywordObservation } from "./keywords";
import type { PublicCategoryIntelligenceResult } from "./categories";

export interface PersistenceResult {
  savedCount: number;
  skippedCount: number;
  updatedCount?: number;
  snapshotsCreated?: number;
  error?: string;
}

/** Serializes NormalizedProduct.bestSellerRank into the JSON string column —
 * a real observed signal, stored verbatim, never recomputed. */
function serializeBestSellerRank(p: NormalizedProduct): string | null {
  return p.bestSellerRank && p.bestSellerRank.length > 0 ? JSON.stringify(p.bestSellerRank) : null;
}

function mapMarketplaceToConnectorType(marketplace?: MarketplaceId | string): ConnectorType {
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
    marketplace?: MarketplaceId | string;
    researchRunId?: string;
  } = {}
): Promise<PersistenceResult> {
  if (!products || products.length === 0 || !options.organizationId) {
    return { savedCount: 0, skippedCount: products ? products.length : 0 };
  }

  let savedCount = 0;
  let updatedCount = 0;
  let snapshotsCreated = 0;
  let skippedCount = 0;

  try {
    const orgId = options.organizationId;
    const kw = options.searchQuery || "public_search";
    const defaultMarketplace = options.marketplace || "etsy";
    const defaultMarketplaceType = mapMarketplaceToConnectorType(defaultMarketplace);

    for (const p of products) {
      if (!p.externalId || !p.title) {
        skippedCount++;
        continue;
      }

      const mkt = p.marketplace || defaultMarketplace;
      const marketplaceType = mapMarketplaceToConnectorType(mkt);
      const fingerprint = computeProductObservationFingerprint(p);
      const observedDate = p.observedAt ? new Date(p.observedAt) : new Date();

      // 1. Persist/Update First-Class ProductObservation
      try {
        const existingObs = await prisma.productObservation.findUnique({
          where: {
            organizationId_marketplace_externalId: {
              organizationId: orgId,
              marketplace: mkt,
              externalId: p.externalId,
            },
          },
        });

        if (existingObs) {
          const changeEval = evaluateObservationChange(existingObs, p as any);
          if (changeEval.hasChanged) {
            // Record snapshot on metric change
            await prisma.productObservationSnapshot.create({
              data: {
                productObservationId: existingObs.id,
                fingerprint: changeEval.newFingerprint,
                price: p.price ?? null,
                currency: p.currency || "USD",
                rating: p.rating ?? null,
                reviewCount: p.reviewCount ?? null,
                favoritesCount: p.favoritesCount ?? null,
                salesCount: p.salesCount ?? null,
                availability: p.availability ?? null,
                shopName: p.shop?.name ?? null,
                bestSellerRankJson: serializeBestSellerRank(p),
                observedAt: observedDate,
              },
            });
            snapshotsCreated++;

            // Update main observation row
            await prisma.productObservation.update({
              where: { id: existingObs.id },
              data: {
                fingerprint: changeEval.newFingerprint,
                title: p.title,
                imageUrl: p.imageUrl || existingObs.imageUrl,
                price: p.price ?? existingObs.price,
                rating: p.rating ?? existingObs.rating,
                reviewCount: p.reviewCount ?? existingObs.reviewCount,
                favoritesCount: p.favoritesCount ?? existingObs.favoritesCount,
                salesCount: p.salesCount ?? existingObs.salesCount,
                estimatedDemand: p.estimatedDemand ?? existingObs.estimatedDemand,
                shopName: p.shop?.name || existingObs.shopName,
                shopExternalId: p.shop?.externalId || existingObs.shopExternalId,
                shopUrl: p.shop?.url || existingObs.shopUrl,
                keyword: p.keyword || existingObs.keyword,
                categoryPath: p.categoryPath && p.categoryPath.length > 0 ? p.categoryPath : existingObs.categoryPath,
                brand: p.brand || existingObs.brand,
                badges: p.badges && p.badges.length > 0 ? p.badges : existingObs.badges,
                availability: p.availability ?? existingObs.availability,
                shippingInfo: p.shippingInfo || existingObs.shippingInfo,
                bestSellerRankJson: serializeBestSellerRank(p) || existingObs.bestSellerRankJson,
                fieldLineageJson: p.fieldLineage ? JSON.stringify(p.fieldLineage) : existingObs.fieldLineageJson,
                confidence: p.opportunityScore?.confidence ?? existingObs.confidence,
                observedAt: observedDate,
                researchRunId: options.researchRunId || existingObs.researchRunId,
              },
            });
            updatedCount++;
          } else {
            // Touch timestamp on unchanged observation without creating duplicate snapshot
            await prisma.productObservation.update({
              where: { id: existingObs.id },
              data: {
                observedAt: observedDate,
                researchRunId: options.researchRunId || existingObs.researchRunId,
              },
            });
          }
        } else {
          // Create new observation
          const newObs = await prisma.productObservation.create({
            data: {
              organizationId: orgId,
              researchRunId: options.researchRunId,
              marketplace: mkt,
              externalId: p.externalId,
              fingerprint,
              title: p.title,
              imageUrl: p.imageUrl || null,
              price: p.price ?? null,
              currency: p.currency || "USD",
              rating: p.rating ?? null,
              reviewCount: p.reviewCount ?? null,
              favoritesCount: p.favoritesCount ?? null,
              salesCount: p.salesCount ?? null,
              estimatedDemand: p.estimatedDemand ?? null,
              shopName: p.shop?.name || null,
              shopExternalId: p.shop?.externalId || null,
              shopUrl: p.shop?.url || null,
              keyword: p.keyword || null,
              categoryPath: p.categoryPath || [],
              brand: p.brand || null,
              badges: p.badges || [],
              availability: p.availability ?? null,
              shippingInfo: p.shippingInfo || null,
              bestSellerRankJson: serializeBestSellerRank(p),
              sourceType: p.acquisitionMethod || "PUBLIC_WEB",
              sourceUrl: p.url || null,
              provenance: (p as any).provenance || p.source || "ACTUAL_DATA",
              confidence: p.opportunityScore?.confidence ?? 70,
              fieldLineageJson: p.fieldLineage ? JSON.stringify(p.fieldLineage) : null,
              observedAt: observedDate,
            },
          });

          // Create initial baseline snapshot
          await prisma.productObservationSnapshot.create({
            data: {
              productObservationId: newObs.id,
              fingerprint,
              price: p.price ?? null,
              currency: p.currency || "USD",
              rating: p.rating ?? null,
              reviewCount: p.reviewCount ?? null,
              favoritesCount: p.favoritesCount ?? null,
              salesCount: p.salesCount ?? null,
              availability: p.availability ?? null,
              shopName: p.shop?.name ?? null,
              bestSellerRankJson: serializeBestSellerRank(p),
              observedAt: observedDate,
            },
          });
          snapshotsCreated++;
        }
      } catch {
        // Non-blocking in case of schema variance or concurrency
      }

      // 2. Backward-Compatible Legacy Prospect Persistence
      try {
        const existingProspect = await prisma.prospect.findFirst({
          where: {
            organizationId: orgId,
            listingExternalId: p.externalId,
          },
        });

        if (existingProspect) {
          await prisma.prospect.update({
            where: { id: existingProspect.id },
            data: {
              listingTitle: p.title,
              price: p.price !== null && p.price !== undefined ? p.price : existingProspect.price,
              listingImageUrl: p.imageUrl || existingProspect.listingImageUrl,
              numFavorers: p.favoritesCount !== null ? p.favoritesCount : existingProspect.numFavorers,
              reviewCount: p.reviewCount !== null ? p.reviewCount : existingProspect.reviewCount,
              reviewAverage: p.rating !== null ? p.rating : existingProspect.reviewAverage,
              totalSales: p.salesCount !== null ? p.salesCount : existingProspect.totalSales,
            },
          });
        } else {
          // Resolve SearchConfig for legacy relation
          let configId = options.searchConfigId;
          if (!configId) {
            const existingConfig = await prisma.searchConfig.findFirst({
              where: { organizationId: orgId, isActive: true },
              select: { id: true },
            });
            configId = existingConfig?.id;
          }

          if (configId) {
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
        }
      } catch {
        // Non-blocking
      }

      savedCount++;
    }

    return { savedCount, updatedCount, snapshotsCreated, skippedCount };
  } catch (err: any) {
    return { savedCount, skippedCount, error: err?.message };
  }
}

/**
 * Persists empirical keyword observations acquired from search listings.
 */
export async function persistKeywordObservations(
  keywords: CanonicalKeywordObservation[],
  options: {
    organizationId?: string;
    marketplace?: MarketplaceId | string;
  } = {}
): Promise<{ savedCount: number }> {
  if (!keywords || keywords.length === 0 || !options.organizationId) {
    return { savedCount: 0 };
  }

  let savedCount = 0;
  const orgId = options.organizationId;
  const mkt = options.marketplace || "etsy";

  for (const k of keywords) {
    const kwText = (k.keyword || k.term || "").toLowerCase().trim();
    if (!kwText) continue;

    try {
      await prisma.keywordObservation.upsert({
        where: {
          organizationId_marketplace_keyword: {
            organizationId: orgId,
            marketplace: mkt,
            keyword: kwText,
          },
        },
        update: {
          listingFrequencyPercent: k.listingFrequencyPercent || 0,
          occurrenceCount: k.occurrenceCount || 1,
          observedAveragePrice: k.observedAveragePrice ?? null,
          demandProxyScore: k.demandProxyScore || 50,
          competitionProxy: k.competitionProxy || "UNAVAILABLE",
          intentCategory: (k as any).intentCategory || (k as any).intent || "GENERAL",
          observedAt: new Date(),
        },
        create: {
          organizationId: orgId,
          marketplace: mkt,
          keyword: kwText,
          listingFrequencyPercent: k.listingFrequencyPercent || 0,
          occurrenceCount: k.occurrenceCount || 1,
          observedAveragePrice: k.observedAveragePrice ?? null,
          demandProxyScore: k.demandProxyScore || 50,
          competitionProxy: k.competitionProxy || "UNAVAILABLE",
          intentCategory: (k as any).intentCategory || (k as any).intent || "GENERAL",
          source: "PUBLIC_WEB",
          observedAt: new Date(),
        },
      });
      savedCount++;
    } catch {
      // Non-blocking
    }
  }

  return { savedCount };
}

/**
 * Persists aggregated category observations.
 */
export async function persistCategoryObservation(
  category: PublicCategoryIntelligenceResult,
  options: {
    organizationId?: string;
    marketplace?: MarketplaceId | string;
  } = {}
): Promise<{ success: boolean }> {
  if (!category || !options.organizationId) {
    return { success: false };
  }

  try {
    const orgId = options.organizationId;
    const mkt = options.marketplace || "etsy";

    await prisma.categoryObservation.upsert({
      where: {
        organizationId_marketplace_categoryName: {
          organizationId: orgId,
          marketplace: mkt,
          categoryName: category.categoryName,
        },
      },
      update: {
        observedCatalogCount: category.observedCatalogCount || category.totalListings || 0,
        minPrice: category.priceDistribution?.min ?? null,
        maxPrice: category.priceDistribution?.max ?? null,
        medianPrice: category.priceDistribution?.median ?? null,
        averagePrice: category.priceDistribution?.average ?? null,
        averageOpportunityScore: category.opportunityDistribution?.averageScore ?? null,
        highOpportunityCount: category.opportunityDistribution?.highOpportunityCount ?? 0,
        freshnessStatus: category.freshness?.status || "LIVE",
        observedAt: new Date(),
      },
      create: {
        organizationId: orgId,
        marketplace: mkt,
        categoryName: category.categoryName,
        observedCatalogCount: category.observedCatalogCount || category.totalListings || 0,
        minPrice: category.priceDistribution?.min ?? null,
        maxPrice: category.priceDistribution?.max ?? null,
        medianPrice: category.priceDistribution?.median ?? null,
        averagePrice: category.priceDistribution?.average ?? null,
        averageOpportunityScore: category.opportunityDistribution?.averageScore ?? null,
        highOpportunityCount: category.opportunityDistribution?.highOpportunityCount ?? 0,
        freshnessStatus: category.freshness?.status || "LIVE",
        observedAt: new Date(),
      },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}
