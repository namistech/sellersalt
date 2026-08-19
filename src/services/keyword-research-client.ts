import { fetchJson } from "./http";
import type {
  KeywordSearchRequest,
  KeywordSearchResponse,
  HarvestedKeyword,
  KeywordSearchSummary,
} from "@/types/keyword-research";
import type { CapabilityUnavailable } from "@/marketplaces/core/availability";

/** Single-marketplace research. When `request.marketplace` names a
 * marketplace/capability that isn't wired up yet, the API returns a
 * structured CapabilityUnavailable instead of throwing — callers must
 * check for that shape rather than assuming real keyword results. */
export async function searchStandaloneKeywords(
  request: KeywordSearchRequest
): Promise<KeywordSearchResponse | CapabilityUnavailable> {
  return fetchJson<KeywordSearchResponse | CapabilityUnavailable>("/api/keywords/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function savePlannedKeyword(
  keyword: string,
  sourceListingUrl?: string
): Promise<{ success: boolean; keyword: any }> {
  return fetchJson<{ success: boolean; keyword: any }>("/api/planned-keywords", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, sourceListingUrl }),
  });
}

export async function addKeywordToPlanner(
  keyword: HarvestedKeyword,
  sourceQuery: string,
  summary: KeywordSearchSummary
): Promise<{ item: any; isExisting: boolean; message: string }> {
  return fetchJson<{ item: any; isExisting: boolean; message: string }>("/api/planner/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `Keyword: ${keyword.term}`,
      type: "KEYWORD_RESEARCH",
      targetKeywords: [keyword.term],
      sourceType: "KEYWORD",
      sourceId: keyword.term,
      notes: `Discovered from search for "${sourceQuery}" (${keyword.frequency} occurrences, ${keyword.percentage}% catalog penetration).`,
      researchSnapshot: {
        term: keyword.term,
        sourceQuery,
        wordCount: keyword.wordCount,
        charCount: keyword.charCount,
        isTagCompliant: keyword.isTagCompliant,
        frequency: keyword.frequency,
        percentage: keyword.percentage,
        relevanceScore: keyword.relevanceScore,
        estimatedDemandSignal: keyword.estimatedDemandSignal,
        competitionLevel: keyword.competitionLevel,
        tailClassification: keyword.tailClassification,
        intentClassification: keyword.intentClassification,
        capturedSummarySupply: summary.totalEtsySupply,
        capturedAvgPrice: summary.avgPrice,
        capturedAt: new Date().toISOString(),
      },
    }),
  });
}
