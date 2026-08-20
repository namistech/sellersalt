/**
 * SellerSalt Query Normalization & Search Variants Engine
 * 
 * Cleans, standardizes, and generates bounded semantic research query variants
 * to maximize public search yield without triggering excessive fan-out.
 */

export interface NormalizedQueryProfile {
  originalQuery: string;
  normalizedQuery: string;
  cleanTokens: string[];
  variants: string[];
  isSpecific: boolean;
  intentCategory?: "PRODUCT" | "NICHE" | "CATEGORY" | "BRAND";
}

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "for", "with", "and", "or", "of", "by", "to", "from",
]);

export class QueryNormalizer {
  /**
   * Cleans and standardizes a raw query string.
   */
  public static cleanQuery(rawQuery: string): string {
    return this.normalize(rawQuery).normalizedQuery || (rawQuery || "").trim();
  }

  /**
   * Normalizes a raw research query into standard form and produces bounded variants.
   */
  public static normalize(rawQuery: string, maxVariants = 3): NormalizedQueryProfile {
    const original = (rawQuery || "").trim();
    if (!original) {
      return {
        originalQuery: "",
        normalizedQuery: "",
        cleanTokens: [],
        variants: [],
        isSpecific: false,
      };
    }

    // 1. Lowercase and remove punctuation noise (preserve alphanumeric and spaces)
    const cleaned = original
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // 2. Tokenize and filter stop words
    const allTokens = cleaned.split(" ").filter((t) => t.length > 0);
    const cleanTokens = allTokens.filter((t) => !STOP_WORDS.has(t) && t.length > 1);

    const normalizedQuery = cleanTokens.join(" ") || cleaned;

    // 3. Generate controlled variants
    const variantsSet = new Set<string>();
    variantsSet.add(normalizedQuery);

    if (cleanTokens.length >= 3) {
      // Shorter 2-token core variant
      variantsSet.add(cleanTokens.slice(0, 2).join(" "));
      // Last 2 tokens variant
      variantsSet.add(cleanTokens.slice(-2).join(" "));
    } else if (cleanTokens.length === 2) {
      // Individual prominent token
      variantsSet.add(cleanTokens[0]);
    }

    const variants = Array.from(variantsSet).slice(0, maxVariants);

    return {
      originalQuery: original,
      normalizedQuery,
      cleanTokens,
      variants,
      isSpecific: cleanTokens.length >= 3,
    };
  }
}
