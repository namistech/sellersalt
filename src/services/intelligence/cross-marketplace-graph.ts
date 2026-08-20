/**
 * SellerSalt Cross-Marketplace Intelligence & Evidence Synthesis Engine
 * 
 * Aggregates and compares multi-marketplace observations for linked products,
 * keywords, and categories without conflating distinct marketplace environments.
 */

import type { MarketplaceId } from "@/marketplaces/core/types";
import { MarketGraphEngine } from "./market-graph-engine";
import type { CanonicalProductEntity } from "@/marketplaces/core/graph/entities";

export interface CrossMarketplaceProductEvidence {
  canonicalProductId: string;
  title: string;
  matchedMarketplaces: MarketplaceId[];
  marketplaceDetails: Array<{
    marketplace: MarketplaceId;
    externalId: string;
    price: number | null;
    rating: number | null;
    reviewCount: number | null;
    sellerName: string | null;
    url?: string;
  }>;
  priceComparison: {
    minPrice: number | null;
    maxPrice: number | null;
    spreadDeltaPercent: number | null;
    lowestMarketplace: MarketplaceId | null;
  };
  sellerOverlap: {
    hasSameSeller: boolean;
    sharedSellerName: string | null;
  };
  crossMarketplaceConfidence: number; // 0-100
  disclosures: string[];
}

export class CrossMarketplaceGraphEngine {
  /**
   * Compiles multi-marketplace evidence for a product entity by traversing cross-marketplace edges.
   */
  public static getProductCrossMarketplaceEvidence(productId: string): CrossMarketplaceProductEvidence | null {
    const rootNode = MarketGraphEngine.getNode(productId);
    if (!rootNode || rootNode.entityType !== "PRODUCT") {
      return null;
    }

    const prod = rootNode as CanonicalProductEntity;
    const rels = MarketGraphEngine.getRelationships(productId, "both");

    const matchedProducts: CanonicalProductEntity[] = [prod];

    for (const rel of rels) {
      if (rel.relationshipType === "PRODUCT_MATCHED_ACROSS_MARKETPLACES") {
        const otherId = rel.sourceEntityId === productId ? rel.targetEntityId : rel.sourceEntityId;
        const otherNode = MarketGraphEngine.getNode(otherId);
        if (otherNode && otherNode.entityType === "PRODUCT") {
          matchedProducts.push(otherNode as CanonicalProductEntity);
        }
      }
    }

    const details = matchedProducts.map((p) => ({
      marketplace: p.marketplace,
      externalId: p.externalId,
      price: p.price,
      rating: p.rating,
      reviewCount: p.reviewCount,
      sellerName: p.sellerName,
      url: p.url,
    }));

    const prices = details
      .map((d) => d.price)
      .filter((p): p is number => p !== null && p !== undefined && p > 0);

    let minPrice: number | null = null;
    let maxPrice: number | null = null;
    let spreadDeltaPercent: number | null = null;
    let lowestMarketplace: MarketplaceId | null = null;

    if (prices.length > 0) {
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
      const lowestItem = details.find((d) => d.price === minPrice);
      lowestMarketplace = lowestItem ? lowestItem.marketplace : null;

      if (prices.length > 1 && minPrice > 0) {
        spreadDeltaPercent = parseFloat((((maxPrice - minPrice) / minPrice) * 100).toFixed(1));
      }
    }

    // Check seller overlap
    const sellerNames = details.map((d) => d.sellerName?.toLowerCase()).filter(Boolean);
    const hasSameSeller = sellerNames.length > 1 && new Set(sellerNames).size === 1;

    return {
      canonicalProductId: productId,
      title: prod.title,
      matchedMarketplaces: Array.from(new Set(details.map((d) => d.marketplace))),
      marketplaceDetails: details,
      priceComparison: {
        minPrice,
        maxPrice,
        spreadDeltaPercent,
        lowestMarketplace,
      },
      sellerOverlap: {
        hasSameSeller,
        sharedSellerName: hasSameSeller ? details[0].sellerName : null,
      },
      crossMarketplaceConfidence: details.length > 1 ? 85 : 50,
      disclosures: [
        "Each marketplace observation is maintained independently without synthetic revenue cross-multipliers.",
        "Cross-marketplace match tier reflects deterministic title token overlap and price alignment.",
      ],
    };
  }
}
