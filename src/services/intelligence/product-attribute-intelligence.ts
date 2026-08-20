/**
 * SellerSalt — Product Attribute Intelligence Engine
 * 
 * Extracts observable product attributes from public marketplace listings
 * and calculates empirical prevalence, seller concentration, and price associations.
 * Zero-Fabrication: Never claims buyer preference without actual review/sales corroboration.
 */

import type { NormalizedProduct, MarketplaceId } from "@/marketplaces/core/types";
import type {
  ProductAttributeIntelligenceSummary,
  ObservedAttributeValue,
  AttributeType,
} from "@/marketplaces/core/opportunity-workspace-types";

// Common known attribute vocabularies for observable extraction
const ATTRIBUTE_PATTERNS: Array<{
  type: AttributeType;
  regex: RegExp;
  cleanName: (match: string) => string;
}> = [
  // Materials
  {
    type: "MATERIAL",
    regex: /\b(ceramic|stainless steel|leather|wood|cotton|linen|brass|gold plated|sterling silver|bamboo|acrylic|glass|canvas|resin|wool|silk|stoneware|porcelain)\b/gi,
    cleanName: (m) => m.toLowerCase().trim(),
  },
  // Finishes
  {
    type: "FINISH",
    regex: /\b(matte|glossy|brushed|polished|hammered|rustic|distressed|raw|glazed|anodized|embossed|engraved)\b/gi,
    cleanName: (m) => m.toLowerCase().trim(),
  },
  // Styles
  {
    type: "STYLE",
    regex: /\b(minimalist|vintage|boho|bohemian|modern|mid-century|industrial|scandinavian|farmhouse|gothic|art deco|classic)\b/gi,
    cleanName: (m) => m.toLowerCase().trim(),
  },
  // Formats / Bundles
  {
    type: "BUNDLE",
    regex: /\b(set of \d+|pack of \d+|gift set|bundle|starter kit|pair|duo|trio)\b/gi,
    cleanName: (m) => m.toLowerCase().trim(),
  },
  // Recipient / Occasion
  {
    type: "RECIPIENT",
    regex: /\b(for him|for her|for couples|for mom|for dad|for pet|unisex)\b/gi,
    cleanName: (m) => m.toLowerCase().trim(),
  },
  {
    type: "OCCASION",
    regex: /\b(wedding|birthday|anniversary|christmas|housewarming|graduation|baby shower|bridal shower)\b/gi,
    cleanName: (m) => m.toLowerCase().trim(),
  },
  // Feature / Functionality
  {
    type: "FEATURE",
    regex: /\b(personalized|custom|waterproof|reusable|eco-friendly|handmade|organic|adjustable|insulated|portable|magnetic|folding)\b/gi,
    cleanName: (m) => m.toLowerCase().trim(),
  },
];

export class ProductAttributeIntelligenceEngine {
  /**
   * Analyzes observed products and extracts structured attribute intelligence.
   */
  public static analyze(products: NormalizedProduct[]): ProductAttributeIntelligenceSummary {
    if (!products || products.length === 0) {
      return {
        dominantAttributes: [],
        underrepresentedAttributes: [],
        saturatedAttributes: [],
        totalSampledListings: 0,
        totalSampledSellers: 0,
        notes: ["No product observations available to extract attributes."],
      };
    }

    const totalListings = products.length;
    const uniqueSellers = new Set(
      products.map((p) => p.shop?.name || p.shop?.externalId || p.externalId).filter(Boolean)
    );
    const totalSellers = uniqueSellers.size;

    // Track attribute matches: key = `${type}:${value}`
    const attributeStats = new Map<
      string,
      {
        value: string;
        type: AttributeType;
        listings: Set<string>;
        sellers: Set<string>;
        prices: number[];
        marketplaces: Set<MarketplaceId>;
      }
    >();

    for (const product of products) {
      const textCorpus = `${product.title} ${product.categoryPath?.join(" ") || ""}`.toLowerCase();
      const productPrice = typeof product.price === "number" && !isNaN(product.price) ? product.price : null;
      const sellerId = product.shop?.name || product.shop?.externalId || product.externalId;

      for (const pattern of ATTRIBUTE_PATTERNS) {
        const matches = textCorpus.match(pattern.regex);
        if (matches) {
          for (const rawMatch of matches) {
            const cleanVal = pattern.cleanName(rawMatch);
            const key = `${pattern.type}:${cleanVal}`;

            if (!attributeStats.has(key)) {
              attributeStats.set(key, {
                value: cleanVal,
                type: pattern.type,
                listings: new Set(),
                sellers: new Set(),
                prices: [],
                marketplaces: new Set(),
              });
            }

            const stat = attributeStats.get(key)!;
            stat.listings.add(product.externalId);
            if (sellerId) stat.sellers.add(sellerId);
            if (productPrice !== null) stat.prices.push(productPrice);
            stat.marketplaces.add(product.marketplace);
          }
        }
      }
    }

    const allExtracted: ObservedAttributeValue[] = [];

    for (const stat of attributeStats.values()) {
      const listingCount = stat.listings.size;
      const prevalencePercent = Math.round((listingCount / totalListings) * 100);
      const sortedPrices = stat.prices.sort((a, b) => a - b);
      const medianPrice =
        sortedPrices.length > 0
          ? sortedPrices[Math.floor(sortedPrices.length / 2)]
          : null;

      allExtracted.push({
        value: stat.value,
        type: stat.type,
        listingPrevalencePercent: prevalencePercent,
        observedListingCount: listingCount,
        observedSellerCount: stat.sellers.size,
        medianPriceAssociated: medianPrice,
        dominantMarketplaces: Array.from(stat.marketplaces),
        isSaturated: prevalencePercent >= 50,
        isUnderrepresented: totalListings <= 10 ? listingCount <= 1 : prevalencePercent < 15,
        provenance: "ACTUAL_DATA",
        freshness: "LIVE",
      });
    }

    // Sort by prevalence
    allExtracted.sort((a, b) => b.listingPrevalencePercent - a.listingPrevalencePercent);

    const dominantAttributes = allExtracted.filter((a) => a.listingPrevalencePercent >= 25);
    const saturatedAttributes = allExtracted.filter((a) => a.isSaturated);
    const underrepresentedAttributes = allExtracted.filter((a) => a.isUnderrepresented);

    const notes: string[] = [
      `Extracted ${allExtracted.length} observable attributes across ${totalListings} sampled listings and ${totalSellers} sellers.`,
    ];

    if (saturatedAttributes.length > 0) {
      notes.push(
        `High saturation observed in: ${saturatedAttributes.map((a) => a.value).slice(0, 3).join(", ")} (≥50% of listings).`
      );
    }
    if (underrepresentedAttributes.length > 0) {
      notes.push(
        `Underrepresented niches identified in: ${underrepresentedAttributes.map((a) => a.value).slice(0, 3).join(", ")} (<15% of listings).`
      );
    }

    return {
      dominantAttributes,
      underrepresentedAttributes,
      saturatedAttributes,
      totalSampledListings: totalListings,
      totalSampledSellers: totalSellers,
      notes,
    };
  }
}
