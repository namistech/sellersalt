import type {
  OriginalityCheckInput,
  OriginalityCheckResult,
  OriginalityStatus,
  SimilarityMatch,
} from "@/types/originality";

/**
 * Tokenizes text into normalized lowercase alphanumeric words.
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
}

/**
 * Generates word N-grams from a token array.
 */
function generateNgrams(tokens: string[], n: number): Set<string> {
  const ngrams = new Set<string>();
  if (tokens.length < n) return ngrams;
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.add(tokens.slice(i, i + n).join(" "));
  }
  return ngrams;
}

/**
 * Calculates Jaccard similarity between two token sets.
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  if (unionCount === 0) return 0;
  return Number((intersectionCount / unionCount).toFixed(4));
}

/**
 * Finds the longest common consecutive phrase match (word count) between two texts.
 */
export function findLongestCommonPhrase(
  draftTokens: string[],
  sourceTokens: string[]
): { length: number; phrase: string } {
  let maxLength = 0;
  let maxPhrase = "";

  const sourceSet = new Set<string>();
  // Index source 3, 4, 5+ word phrases
  for (let n = 3; n <= Math.min(10, sourceTokens.length); n++) {
    for (let i = 0; i <= sourceTokens.length - n; i++) {
      sourceSet.add(sourceTokens.slice(i, i + n).join(" "));
    }
  }

  for (let n = Math.min(10, draftTokens.length); n >= 3; n--) {
    for (let i = 0; i <= draftTokens.length - n; i++) {
      const phrase = draftTokens.slice(i, i + n).join(" ");
      if (sourceSet.has(phrase)) {
        if (n > maxLength) {
          maxLength = n;
          maxPhrase = phrase;
          return { length: maxLength, phrase: maxPhrase }; // Grep largest first
        }
      }
    }
  }

  return { length: maxLength, phrase: maxPhrase };
}

/**
 * Deterministic Originality Protection Engine
 * Evaluates listing drafts against competitor/research sources.
 * Enforces strict <15% text overlap requirement.
 */
export function evaluateListingOriginality(
  input: OriginalityCheckInput
): OriginalityCheckResult {
  const draftFullText = [
    input.draftTitle || "",
    input.draftDescription || "",
    ...(input.draftTags || []),
  ].join(" ");

  const sourceFullText = [
    input.sourceTitle || "",
    input.sourceDescription || "",
    ...(input.sourceTags || []),
  ].join(" ");

  const draftTokens = tokenize(draftFullText);
  const sourceTokens = tokenize(sourceFullText);

  // If no source text is supplied (e.g. manual creation from scratch), 100% original
  if (sourceTokens.length === 0 || draftTokens.length === 0) {
    return {
      originalityScore: 100,
      status: "PASSED",
      jaccardSimilarity: 0,
      maxCommonSubstringLength: 0,
      matches: [],
      trademarkAlerts: [],
      evaluatedAt: new Date().toISOString(),
    };
  }

  // 1. Calculate Jaccard token similarity
  const jaccard = calculateJaccardSimilarity(draftTokens, sourceTokens);

  // 2. 3-gram overlap percentage
  const draft3Grams = generateNgrams(draftTokens, 3);
  const source3Grams = generateNgrams(sourceTokens, 3);

  let shared3GramCount = 0;
  const matches: SimilarityMatch[] = [];

  for (const ngram of draft3Grams) {
    if (source3Grams.has(ngram)) {
      shared3GramCount++;
      if (matches.length < 5) {
        matches.push({
          matchedPhrase: ngram,
          wordCount: 3,
          sourceContext: "Competitor listing research snapshot",
          draftContext: "Generated draft text",
          isExactMatch: true,
        });
      }
    }
  }

  const ngramSimilarity =
    draft3Grams.size > 0 ? shared3GramCount / draft3Grams.size : 0;

  // 3. Find longest consecutive matching phrase
  const longestPhrase = findLongestCommonPhrase(draftTokens, sourceTokens);

  // 4. Calculate composite originality score (0–100%)
  // Effective overlap is max of Jaccard and N-gram overlap
  const effectiveOverlap = Math.max(jaccard, ngramSimilarity);
  const overlapPercentage = Math.min(100, Number((effectiveOverlap * 100).toFixed(1)));
  const originalityScore = Math.max(0, Math.min(100, Number((100 - overlapPercentage).toFixed(1))));

  // 5. Enforce Canonical Pass/Fail Rules:
  // - Threshold: Must have < 15% overlap (originality >= 85%)
  // - Maximum consecutive matching words <= 4 words
  let status: OriginalityStatus = "PASSED";
  if (effectiveOverlap > 0.15 || longestPhrase.length > 4) {
    status = "REJECTED";
  } else if (effectiveOverlap > 0.10 || longestPhrase.length === 4) {
    status = "FLAGGED";
  }

  return {
    originalityScore,
    status,
    jaccardSimilarity: jaccard,
    maxCommonSubstringLength: longestPhrase.length,
    matches,
    trademarkAlerts: [],
    evaluatedAt: new Date().toISOString(),
  };
}
