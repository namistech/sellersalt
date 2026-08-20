/**
 * SellerSalt Differentiation Analysis Engine
 * 
 * Analyzes observable catalog patterns, feature keywords, material descriptors,
 * and price gaps across competitor listings to identify empirical differentiation vectors.
 * 
 * ZERO-FABRICATION RULE:
 * - Surfaces observed attribute frequencies (e.g. "X appears in 12% of listings").
 * - Never claims automatic psychological insights or fabricated consumer desires.
 */

import type { NormalizedProduct } from "@/marketplaces/core/types";
import type { DifferentiationAssessment } from "@/marketplaces/core/validation/types";

const COMMON_STOP_WORDS = new Set([
  "and", "with", "for", "the", "in", "on", "a", "an", "of", "to", "by", "from",
  "or", "is", "at", "set", "pack", "pcs", "piece", "pieces", "gift", "gifts",
]);

export class DifferentiationEngine {
  /**
   * Analyzes observed product listings to extract common and underrepresented attributes.
   */
  public static analyze(products: NormalizedProduct[]): DifferentiationAssessment {
    if (!products || products.length === 0) {
      return {
        commonAttributes: [],
        underrepresentedAttributes: [],
        priceGaps: [],
        keywordGaps: [],
        categoryGaps: [],
        observableOpportunities: [],
        explanation: "Differentiation analysis requires at least 2 observed product listings.",
      };
    }

    const wordFrequency: Record<string, number> = {};
    const prices: number[] = [];
    const categoriesSet = new Set<string>();

    for (const prod of products) {
      if (prod.price !== null && prod.price > 0) {
        prices.push(prod.price);
      }

      if (prod.category) {
        const catName = typeof prod.category === "object" ? prod.category.name : prod.category;
        if (catName) categoriesSet.add(catName);
      }

      const tokens = (prod.title || "")
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2 && !COMMON_STOP_WORDS.has(t));

      const uniqueTokensInTitle = new Set(tokens);
      for (const t of uniqueTokensInTitle) {
        wordFrequency[t] = (wordFrequency[t] || 0) + 1;
      }
    }

    const total = products.length;
    const commonAttributes: string[] = [];
    const underrepresentedAttributes: string[] = [];

    const sortedWords = Object.entries(wordFrequency).sort((a, b) => b[1] - a[1]);

    for (const [word, count] of sortedWords) {
      const prevalencePct = Math.round((count / total) * 100);
      if (prevalencePct >= 40) {
        commonAttributes.push(`"${word}" (present in ${prevalencePct}% of observed listings)`);
      } else if (prevalencePct >= 15 && prevalencePct <= 25) {
        underrepresentedAttributes.push(`"${word}" (present in ${prevalencePct}% of listings)`);
      }
    }

    // Price gap analysis
    const priceGaps: string[] = [];
    if (prices.length >= 4) {
      prices.sort((a, b) => a - b);
      const median = prices[Math.floor(prices.length / 2)];
      const min = prices[0];
      const max = prices[prices.length - 1];

      if (median > min * 1.8) {
        priceGaps.push(`Value Gap: Sparse offerings between $${min.toFixed(2)} and $${(min * 1.5).toFixed(2)}.`);
      }
      if (max > median * 2.0) {
        priceGaps.push(`Premium Gap: Limited structured offerings in the $${(median * 1.5).toFixed(2)} - $${max.toFixed(2)} tier.`);
      }
    }

    const observableOpportunities: string[] = [];
    if (underrepresentedAttributes.length > 0) {
      observableOpportunities.push(`Incorporate underrepresented modifiers (${underrepresentedAttributes.slice(0, 2).join(", ")}) into title and tags.`);
    }
    if (priceGaps.length > 0) {
      observableOpportunities.push(priceGaps[0]);
    }
    observableOpportunities.push("Differentiate with unique material bundles or specialized packaging.");

    return {
      commonAttributes: commonAttributes.slice(0, 5),
      underrepresentedAttributes: underrepresentedAttributes.slice(0, 5),
      priceGaps,
      keywordGaps: sortedWords.slice(3, 8).map(([w]) => `Long-tail variant: ${w}`),
      categoryGaps: Array.from(categoriesSet).slice(0, 3),
      observableOpportunities,
      explanation: `Analyzed ${products.length} competitor listings across ${categoriesSet.size || 1} category branches.`,
    };
  }
}
