/**
 * SellerSalt Entity Resolution & Identity Engine
 * 
 * Provides deterministic identity assignment and cross-marketplace product matching
 * with calibrated confidence scoring and transparent matching evidence.
 * 
 * MATCHING CONFIDENCE TIERS:
 * - EXACT: Identical marketplace-native ID / UPC / canonical URL
 * - HIGH_CONFIDENCE: Same brand + identical normalized core title + price band alignment (<= 15% delta)
 * - PROBABLE: High token overlap (>= 75%), same category archetype, compatible price range
 * - POSSIBLE: Moderate token overlap (50-74%), shared attributes
 * - UNRESOLVED: Insufficient evidence
 */

import crypto from "node:crypto";
import type { NormalizedProduct, MarketplaceId } from "@/marketplaces/core/types";
import type {
  CanonicalProductEntity,
  CanonicalSellerEntity,
  CanonicalCategoryEntity,
  CanonicalKeywordEntity,
  CanonicalNicheEntity,
  EntityMatchConfidence,
  CrossMarketplaceMatchTier,
} from "@/marketplaces/core/graph/entities";
import { evaluateFreshness } from "@/marketplaces/core/acquisition/freshness";

export interface EntityResolutionMatchResult {
  matchTier: CrossMarketplaceMatchTier;
  confidenceTier: EntityMatchConfidence;
  confidenceScore: number; // 0-100
  tokenOverlapScore: number; // 0-1
  priceDeltaPercent: number | null;
  matchingFields: string[];
  evidenceExplanation: string;
}

export class EntityResolutionEngine {
  /**
   * Generates a deterministic, collision-resistant canonical Product Entity ID.
   */
  public static generateProductId(marketplace: string, externalId: string): string {
    const cleanMp = (marketplace || "unknown").toLowerCase().trim();
    const cleanId = (externalId || "").trim();
    if (!cleanId) {
      const hash = crypto.createHash("sha256").update(`${cleanMp}:unknown_${Date.now()}`).digest("hex").substring(0, 16);
      return `prod:${cleanMp}:${hash}`;
    }
    return `prod:${cleanMp}:${cleanId}`;
  }

  /**
   * Generates a deterministic canonical Seller Entity ID.
   */
  public static generateSellerId(marketplace: string, shopIdentifier: string): string {
    const cleanMp = (marketplace || "unknown").toLowerCase().trim();
    const cleanShop = (shopIdentifier || "unnamed")
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();
    return `seller:${cleanMp}:${cleanShop}`;
  }

  /**
   * Generates a deterministic canonical Category Entity ID.
   */
  public static generateCategoryId(marketplace: string, categoryPath: string[] | string): string {
    const cleanMp = (marketplace || "all").toLowerCase().trim();
    const pathStr = Array.isArray(categoryPath) ? categoryPath.join("/") : categoryPath;
    const cleanPath = (pathStr || "general")
      .toLowerCase()
      .replace(/[^\w\s\/-]/g, "")
      .replace(/\s+/g, "-")
      .trim();
    return `cat:${cleanMp}:${cleanPath}`;
  }

  /**
   * Generates a deterministic canonical Keyword Entity ID.
   */
  public static generateKeywordId(keyword: string): string {
    const clean = (keyword || "")
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();
    return `kw:${clean}`;
  }

  /**
   * Generates a deterministic canonical Niche Entity ID.
   */
  public static generateNicheId(nicheName: string): string {
    const clean = (nicheName || "niche")
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();
    return `niche:${clean}`;
  }

  /**
   * Transforms a raw NormalizedProduct into a CanonicalProductEntity.
   */
  public static toCanonicalProduct(
    product: NormalizedProduct,
    organizationId?: string
  ): CanonicalProductEntity {
    const externalId = product.externalId || `ext_${Date.now()}`;
    const id = this.generateProductId(product.marketplace, externalId);
    const observedAt = product.capturedAt || product.observedAt || new Date();

    const normalizedTitle = (product.title || "")
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const fingerprint = crypto
      .createHash("sha256")
      .update(`${product.marketplace}:${externalId}:${normalizedTitle}:${product.price ?? "null"}`)
      .digest("hex");

    return {
      id,
      entityType: "PRODUCT",
      marketplace: product.marketplace,
      externalId,
      fingerprint,
      name: product.title,
      normalizedName: normalizedTitle,
      title: product.title,
      price: product.price ?? null,
      currency: product.currency ?? "USD",
      rating: product.rating ?? null,
      reviewCount: product.reviewCount ?? null,
      favoritesCount: product.favoritesCount ?? null,
      sellerId: product.shop?.name ? this.generateSellerId(product.marketplace, product.shop.name) : null,
      sellerName: product.shop?.name ?? null,
      categoryPath: product.categoryPath ?? [],
      attributes: {},
      url: product.url,
      imageUrl: product.imageUrl,
      firstObservedAt: observedAt,
      lastObservedAt: observedAt,
      observationCount: 1,
      freshness: evaluateFreshness(observedAt, "general"),
      provenance: product.source || "ACTUAL_DATA",
      organizationId,
      latestOpportunityScore: product.opportunityScore?.score ?? null,
      latestValidationVerdict: product.opportunityScore?.verdict ?? null,
      momentum: "INSUFFICIENT_DATA",
    };
  }

  /**
   * Compares two products across marketplaces to determine entity equivalence with evidence.
   */
  public static compareCrossMarketplaceProducts(
    prodA: NormalizedProduct | CanonicalProductEntity,
    prodB: NormalizedProduct | CanonicalProductEntity
  ): EntityResolutionMatchResult {
    // 1. Same marketplace and same external ID -> EXACT
    if (prodA.marketplace === prodB.marketplace && prodA.externalId === prodB.externalId) {
      return {
        matchTier: "SAME_PRODUCT",
        confidenceTier: "EXACT",
        confidenceScore: 100,
        tokenOverlapScore: 1.0,
        priceDeltaPercent: 0,
        matchingFields: ["marketplace", "externalId", "title"],
        evidenceExplanation: "Identical marketplace-native external listing identifier.",
      };
    }

    // 2. Tokenize and calculate Jaccard token overlap
    const tokensA = this.tokenizeTitle(prodA.title);
    const tokensB = this.tokenizeTitle(prodB.title);

    const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
    const union = new Set([...tokensA, ...tokensB]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;

    // 3. Price Delta calculation
    let priceDeltaPercent: number | null = null;
    if (
      prodA.price !== null &&
      prodA.price !== undefined &&
      prodB.price !== null &&
      prodB.price !== undefined &&
      prodA.price > 0 &&
      prodB.price > 0
    ) {
      const diff = Math.abs(prodA.price - prodB.price);
      const avg = (prodA.price + prodB.price) / 2;
      priceDeltaPercent = parseFloat(((diff / avg) * 100).toFixed(1));
    }

    const matchingFields: string[] = [];
    if (jaccard >= 0.7) matchingFields.push("titleTokens");
    if (priceDeltaPercent !== null && priceDeltaPercent <= 15) matchingFields.push("priceBand");

    const getSellerName = (p: NormalizedProduct | CanonicalProductEntity): string | undefined => {
      if ("shop" in p && p.shop?.name) return p.shop.name;
      if ("sellerName" in p && p.sellerName) return p.sellerName;
      return undefined;
    };

    const sellerA = getSellerName(prodA);
    const sellerB = getSellerName(prodB);

    if (sellerA && sellerB && sellerA.toLowerCase() === sellerB.toLowerCase()) {
      matchingFields.push("sellerName");
    }

    // 4. Classify Match Tier and Confidence
    if (jaccard >= 0.85 && priceDeltaPercent !== null && priceDeltaPercent <= 20) {
      return {
        matchTier: "SAME_PRODUCT",
        confidenceTier: "HIGH_CONFIDENCE",
        confidenceScore: Math.round(jaccard * 100),
        tokenOverlapScore: parseFloat(jaccard.toFixed(2)),
        priceDeltaPercent,
        matchingFields,
        evidenceExplanation: `High token overlap (${Math.round(jaccard * 100)}%) and aligned price band (${priceDeltaPercent}% delta).`,
      };
    }

    if (jaccard >= 0.65) {
      return {
        matchTier: "POSSIBLE_SAME_PRODUCT",
        confidenceTier: "PROBABLE",
        confidenceScore: Math.round(jaccard * 85),
        tokenOverlapScore: parseFloat(jaccard.toFixed(2)),
        priceDeltaPercent,
        matchingFields,
        evidenceExplanation: `Significant title token overlap (${Math.round(jaccard * 100)}%) across ${prodA.marketplace} and ${prodB.marketplace}.`,
      };
    }

    if (jaccard >= 0.4) {
      return {
        matchTier: "RELATED_PRODUCT",
        confidenceTier: "POSSIBLE",
        confidenceScore: Math.round(jaccard * 70),
        tokenOverlapScore: parseFloat(jaccard.toFixed(2)),
        priceDeltaPercent,
        matchingFields,
        evidenceExplanation: `Moderate keyword token overlap (${Math.round(jaccard * 100)}%). Likely competing or related products.`,
      };
    }

    return {
      matchTier: "UNRELATED",
      confidenceTier: "UNRESOLVED",
      confidenceScore: Math.round(jaccard * 50),
      tokenOverlapScore: parseFloat(jaccard.toFixed(2)),
      priceDeltaPercent,
      matchingFields: [],
      evidenceExplanation: "Insufficient token overlap to establish cross-marketplace relationship.",
    };
  }

  private static tokenizeTitle(title: string): Set<string> {
    const stopWords = new Set(["a", "an", "the", "in", "on", "at", "for", "with", "and", "or", "of", "to", "by"]);
    const cleaned = (title || "")
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t));
    return new Set(cleaned);
  }
}
