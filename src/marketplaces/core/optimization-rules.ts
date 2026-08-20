// Marketplace-specific listing constraints, expressed as data rather than
// hardcoded into the universal optimizer/generator. src/services/
// listing-generation.ts and src/services/seo-engine.ts consume these
// instead of embedding Etsy's 140-char/13-tag rules as literals — Etsy's
// rules are still the only ones with real values (everything else is
// unknown until that marketplace's connector goes live), but the shape now
// exists for a second marketplace to plug in without touching the optimizer.

import type { MarketplaceId } from "./types";

export interface MarketplaceOptimizationRules {
  marketplace: MarketplaceId;
  titleMaxLength: number | null;
  titleMinRecommended: number | null;
  tagCount: number | null;
  tagMaxLength: number | null;
  descriptionMinRecommended: number | null;
  supportsTags: boolean;
  supportsCategoryTaxonomy: boolean;
  /** Etsy's real fee structure (6.5% transaction + ~3% payment processing +
   * $0.20 listing fee) used by the margin factor in universal-scoring.ts.
   * `null` means "unknown — do not compute a margin estimate," never "0". */
  feeSchedule: { percentageFee: number; flatFee: number } | null;
}

export const ETSY_OPTIMIZATION_RULES: MarketplaceOptimizationRules = {
  marketplace: "etsy",
  titleMaxLength: 140,
  titleMinRecommended: 120,
  tagCount: 13,
  tagMaxLength: 20,
  descriptionMinRecommended: 160,
  supportsTags: true,
  supportsCategoryTaxonomy: true,
  feeSchedule: { percentageFee: 0.095, flatFee: 0.2 },
};

/** No connector has live marketplace-specific optimization constraints yet —
 * every field is `null`/false rather than a guessed number, so a caller that
 * forgets to check `supportsTags` etc. gets an obviously-wrong `null` instead
 * of a silently-plausible-looking fake constraint. */
function unknownRules(marketplace: MarketplaceId): MarketplaceOptimizationRules {
  return {
    marketplace,
    titleMaxLength: null,
    titleMinRecommended: null,
    tagCount: null,
    tagMaxLength: null,
    descriptionMinRecommended: null,
    supportsTags: false,
    supportsCategoryTaxonomy: false,
    feeSchedule: null,
  };
}

const RULES: Record<MarketplaceId, MarketplaceOptimizationRules> = {
  etsy: ETSY_OPTIMIZATION_RULES,
  shopify: unknownRules("shopify"),
  woocommerce: unknownRules("woocommerce"),
  amazon: unknownRules("amazon"),
  ebay: unknownRules("ebay"),
  tiktok_shop: unknownRules("tiktok_shop"),
  walmart: unknownRules("walmart"),
};

export function getOptimizationRules(marketplace: MarketplaceId): MarketplaceOptimizationRules {
  return RULES[marketplace];
}
