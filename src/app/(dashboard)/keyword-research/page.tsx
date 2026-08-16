"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ExternalLink,
  Bookmark,
  Download,
  Compass,
  Sparkles,
  Layers,
  Filter,
  Check,
  AlertTriangle,
  ArrowUpDown,
  Tag,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Input, Button, Badge, Heading, Text } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import {
  searchStandaloneKeywords,
  savePlannedKeyword,
  addKeywordToPlanner,
} from "@/services/keyword-research-client";
import type {
  KeywordSearchResponse,
  HarvestedKeyword,
  KeywordCompetitionRating,
  KeywordTailClassification,
  KeywordIntentClassification,
} from "@/types/keyword-research";

type MatchMode = "contains" | "exact" | "starts" | "ends";
type WordFilter = "all" | "1" | "2" | "3" | "4plus";
type SortOption = "frequency" | "relevance" | "demand" | "wordCount" | "competition";

const COMPETITION_COLORS: Record<KeywordCompetitionRating, string> = {
  VERY_LOW: "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/30",
  LOW: "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/30",
  MODERATE: "text-[#B37800] bg-[#FFF8E6] border-[#FFB020]/30",
  HIGH: "text-amber-800 bg-amber-50 border-amber-300",
  VERY_HIGH: "text-[#E02424] bg-[#FDF2F2] border-[#F98080]/30",
};

export default function KeywordResearchPage() {
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  // Filters & Sorting
  const [matchMode, setMatchMode] = useState<MatchMode>("contains");
  const [wordFilter, setWordFilter] = useState<WordFilter>("all");
  const [onlyTagCompliant, setOnlyTagCompliant] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<string>("ALL");
  const [selectedComp, setSelectedComp] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("frequency");

  // State
  const [searchResponse, setSearchResponse] = useState<KeywordSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Planner & Bookmark tracking
  const [plannedKeywords, setPlannedKeywords] = useState<Record<string, boolean>>({});
  const [savingPlannerTerm, setSavingPlannerTerm] = useState<string | null>(null);
  const [savedPlannerTerms, setSavedPlannerTerms] = useState<Record<string, boolean>>({});

  async function executeSearch(targetQuery?: string) {
    const q = (targetQuery || query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await searchStandaloneKeywords({
        query: q,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      });
      setSearchResponse(response);
      if (targetQuery) {
        setQuery(targetQuery);
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute keyword research.");
      setSearchResponse(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleBookmark(term: string, evidenceUrl?: string) {
    setPlannedKeywords((prev) => ({ ...prev, [term]: true }));
    try {
      await savePlannedKeyword(term, evidenceUrl);
    } catch {
      setPlannedKeywords((prev) => ({ ...prev, [term]: false }));
    }
  }

  async function handleAddTermToPlanner(keyword: HarvestedKeyword) {
    if (!searchResponse) return;
    setSavingPlannerTerm(keyword.term);
    try {
      await addKeywordToPlanner(keyword, searchResponse.query, searchResponse.summary);
      setSavedPlannerTerms((prev) => ({ ...prev, [keyword.term]: true }));
    } catch (err: any) {
      alert(err.message || "Failed to add keyword to Planner");
    } finally {
      setSavingPlannerTerm(null);
    }
  }

  // Filter and sort harvested keywords
  const filteredKeywords = (searchResponse?.keywords || []).filter((item) => {
    // Tag compliance filter
    if (onlyTagCompliant && !item.isTagCompliant) return false;

    // Word count filter
    if (wordFilter === "1" && item.wordCount !== 1) return false;
    if (wordFilter === "2" && item.wordCount !== 2) return false;
    if (wordFilter === "3" && item.wordCount !== 3) return false;
    if (wordFilter === "4plus" && item.wordCount < 4) return false;

    // Intent filter
    if (selectedIntent !== "ALL" && item.intentClassification !== selectedIntent) return false;

    // Competition filter
    if (selectedComp !== "ALL" && item.competitionLevel !== selectedComp) return false;

    // Match mode filter against query
    const qLower = searchResponse?.query.toLowerCase() || "";
    const tLower = item.term.toLowerCase();
    if (matchMode === "exact" && tLower !== qLower) return false;
    if (matchMode === "starts" && !tLower.startsWith(qLower)) return false;
    if (matchMode === "ends" && !tLower.endsWith(qLower)) return false;
    if (matchMode === "contains" && !tLower.includes(qLower) && item.relevanceScore < 20) return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === "frequency") return b.frequency - a.frequency;
    if (sortBy === "relevance") return b.relevanceScore - a.relevanceScore;
    if (sortBy === "demand") return b.estimatedDemandSignal - a.estimatedDemandSignal;
    if (sortBy === "wordCount") return b.wordCount - a.wordCount;
    if (sortBy === "competition") return b.competitionScore - a.competitionScore;
    return 0;
  });

  function handleExportCsv() {
    if (!searchResponse || filteredKeywords.length === 0) return;

    const header = [
      "Keyword Term",
      "Word Count",
      "Character Count",
      "Tag Compliant (<=20 chars)",
      "Observed Frequency",
      "Catalog Penetration (%)",
      "Relevance Score (0-100)",
      "Estimated Demand Signal (Avg Favorites)",
      "Competition Rating",
      "Tail Classification",
      "Intent Classification",
      "Data Provenance",
    ].join(",");

    const rows = filteredKeywords.map((k) =>
      [
        `"${k.term.replace(/"/g, '""')}"`,
        k.wordCount,
        k.charCount,
        k.isTagCompliant ? "YES" : "NO",
        k.frequency,
        `${k.percentage}%`,
        k.relevanceScore,
        k.estimatedDemandSignal,
        k.competitionLevel,
        k.tailClassification,
        k.intentClassification,
        k.provenance,
      ].join(",")
    );

    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sellersalt-keywords-${searchResponse.query.replace(/\s+/g, "_")}.csv`;
    link.click();
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Standalone Keyword Research"
        description="Harvest high-ranking tags, long-tail search phrases, and competitor keywords cold across Etsy's live marketplace."
      />

      {/* Main Search Input Form */}
      <Card padding="lg" className="border-line bg-white shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch();
          }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter any keyword (e.g. 'leather passport holder', 'minimalist desk mat')..."
                className="pl-10 h-11 text-sm font-medium"
              />
              <Search className="h-4 w-4 text-ink-tertiary absolute left-3.5 top-3.5 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min $"
                className="w-24 h-11 text-xs"
              />
              <span className="text-xs text-ink-tertiary">-</span>
              <Input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max $"
                className="w-24 h-11 text-xs"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="h-11 px-6 text-sm font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white shrink-0"
            >
              <Search className="h-4 w-4 mr-1.5" /> Research Keyword
            </Button>
          </div>
        </form>
      </Card>

      {/* Search Error State */}
      {error && (
        <Card padding="md" className="border-red-200 bg-red-50 text-red-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="h-4 w-4 text-red-600" /> Keyword Search Error
          </div>
          <p className="text-xs">{error}</p>
        </Card>
      )}

      {/* Results View */}
      {searchResponse && (
        <div className="space-y-6">
          {/* Summary KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card padding="md" className="border-line bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-ink-tertiary uppercase">Etsy Listing Supply</span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>
              <div className="text-2xl font-extrabold text-ink font-mono pt-1">
                {searchResponse.summary.totalEtsySupply.toLocaleString()}
              </div>
              <div className="text-[11px] text-ink-tertiary">
                Competing active listings on Etsy
              </div>
            </Card>

            <Card padding="md" className="border-line bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-ink-tertiary uppercase">Avg. Observed Price</span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>
              <div className="text-2xl font-extrabold text-ink font-mono pt-1">
                ${searchResponse.summary.avgPrice.toFixed(2)}
              </div>
              <div className="text-[11px] text-ink-tertiary">
                Mean across top {searchResponse.summary.sampledListingCount} listings
              </div>
            </Card>

            <Card padding="md" className="border-line bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-ink-tertiary uppercase">Demand Proxy</span>
                <DataProvenanceBadge type="ESTIMATED" />
              </div>
              <div className="text-2xl font-extrabold text-[#0E8F5D] font-mono pt-1">
                {searchResponse.summary.avgFavorers.toLocaleString()} <span className="text-xs font-sans font-normal text-ink-tertiary">favs</span>
              </div>
              <div className="text-[11px] text-ink-tertiary">
                Avg. buyer favorites across top results
              </div>
            </Card>

            <Card padding="md" className="border-line bg-white shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-ink-tertiary uppercase">Competition Level</span>
                <DataProvenanceBadge type="SELLERSALT_SCORE" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${COMPETITION_COLORS[searchResponse.summary.competitionLevel]}`}>
                  {searchResponse.summary.competitionLevel.replace("_", " ")}
                </div>
                <span className="text-xs font-mono font-bold text-ink">
                  {searchResponse.summary.competitionScore}/100
                </span>
              </div>
              <div className="text-[11px] text-ink-tertiary">
                Multi-factor page 1 ranking barrier
              </div>
            </Card>
          </div>

          {/* Interactive Filters Bar */}
          <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-line-subtle">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#0E8F5D]" />
                <span className="text-xs font-bold text-ink uppercase tracking-wide">
                  Filter Harvested Keywords ({filteredKeywords.length} of {searchResponse.keywords.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={handleExportCsv}
                  className="text-xs font-medium"
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
                </Button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Word count filter */}
              <div className="flex items-center gap-1 bg-[#FAFAF8] p-1 rounded-lg border border-line">
                <span className="text-[10px] font-bold text-ink-tertiary uppercase px-1.5">Words:</span>
                {(["all", "1", "2", "3", "4plus"] as WordFilter[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWordFilter(w)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      wordFilter === w
                        ? "bg-[#0E8F5D] text-white"
                        : "text-ink-secondary hover:text-ink"
                    }`}
                  >
                    {w === "all" ? "All" : w === "4plus" ? "4+ (Long-Tail)" : `${w} Words`}
                  </button>
                ))}
              </div>

              {/* Tag Compliant Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer bg-[#FAFAF8] px-2.5 py-1.5 rounded-lg border border-line select-none">
                <input
                  type="checkbox"
                  checked={onlyTagCompliant}
                  onChange={(e) => setOnlyTagCompliant(e.target.checked)}
                  className="rounded border-line text-[#0E8F5D] focus:ring-[#0E8F5D]"
                />
                <span className="text-[11px] font-semibold text-ink">≤ 20 Chars (Etsy Compliant)</span>
              </label>

              {/* Intent classification */}
              <select
                value={selectedIntent}
                onChange={(e) => setSelectedIntent(e.target.value)}
                className="bg-[#FAFAF8] border border-line rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-ink"
              >
                <option value="ALL">All Search Intents</option>
                <option value="PRODUCT_TYPE">Product Types</option>
                <option value="RECIPIENT_OCCASION">Occasion & Recipient</option>
                <option value="MATERIAL_STYLE">Material & Style</option>
                <option value="GENERAL">General</option>
              </select>

              {/* Competition Filter */}
              <select
                value={selectedComp}
                onChange={(e) => setSelectedComp(e.target.value)}
                className="bg-[#FAFAF8] border border-line rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-ink"
              >
                <option value="ALL">All Competition Levels</option>
                <option value="VERY_LOW">Very Low Competition</option>
                <option value="LOW">Low Competition</option>
                <option value="MODERATE">Moderate Competition</option>
                <option value="HIGH">High Competition</option>
                <option value="VERY_HIGH">Very High Competition</option>
              </select>

              {/* Sort selector */}
              <div className="flex items-center gap-1 ml-auto">
                <ArrowUpDown className="h-3.5 w-3.5 text-ink-tertiary" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-[#FAFAF8] border border-line rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-ink"
                >
                  <option value="frequency">Sort: Most Frequent</option>
                  <option value="relevance">Sort: Relevance Score</option>
                  <option value="demand">Sort: Estimated Demand</option>
                  <option value="wordCount">Sort: Word Count</option>
                  <option value="competition">Sort: Lowest Competition</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Harvested Keywords Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredKeywords.map((item) => {
              const isPlanned = plannedKeywords[item.term];
              const isSavedPlanner = savedPlannerTerms[item.term];
              const isSaving = savingPlannerTerm === item.term;

              return (
                <Card
                  key={item.term}
                  padding="sm"
                  className="border-line bg-white shadow-2xs hover:border-line-subtle transition-all flex flex-col justify-between space-y-2.5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => executeSearch(item.term)}
                          className="font-bold text-xs text-ink hover:text-[#0E8F5D] text-left truncate block transition-colors"
                          title="Click to research this keyword"
                        >
                          {item.term}
                        </button>
                        <div className="text-[10px] text-ink-tertiary flex items-center gap-1.5 mt-0.5">
                          <span>{item.wordCount} words</span>
                          <span>·</span>
                          <span className={item.isTagCompliant ? "text-[#0E8F5D] font-medium" : "text-amber-700"}>
                            {item.charCount} chars {item.isTagCompliant ? "(Etsy Tag)" : "(Title Only)"}
                          </span>
                        </div>
                      </div>

                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${COMPETITION_COLORS[item.competitionLevel]}`}>
                        {item.competitionLevel.replace("_", " ")}
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-line-subtle text-center">
                      <div className="bg-[#FAFAF8] p-1.5 rounded-lg border border-line-subtle">
                        <div className="text-[9px] text-ink-tertiary uppercase">Frequency</div>
                        <div className="text-xs font-mono font-extrabold text-ink">{item.frequency}x</div>
                        <div className="text-[9px] text-ink-tertiary">{item.percentage}% of sample</div>
                      </div>

                      <div className="bg-[#FAFAF8] p-1.5 rounded-lg border border-line-subtle">
                        <div className="text-[9px] text-ink-tertiary uppercase">Relevance</div>
                        <div className="text-xs font-mono font-extrabold text-[#0E8F5D]">{item.relevanceScore}%</div>
                        <div className="text-[9px] text-ink-tertiary">Semantic match</div>
                      </div>

                      <div className="bg-[#FAFAF8] p-1.5 rounded-lg border border-line-subtle">
                        <div className="text-[9px] text-ink-tertiary uppercase">Est. Demand</div>
                        <div className="text-xs font-mono font-extrabold text-ink">{item.estimatedDemandSignal}</div>
                        <div className="text-[9px] text-ink-tertiary">Avg. favorites</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-line-subtle">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/prospects?search=${encodeURIComponent(item.term)}`}
                        className="p-1.5 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-muted transition-colors"
                        title="Search marketplace in Prospects"
                      >
                        <Compass className="h-3.5 w-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleBookmark(item.term)}
                        className={`p-1.5 rounded-md text-xs transition-colors ${
                          isPlanned
                            ? "text-[#0E8F5D] bg-[#E7FAF1]"
                            : "text-ink-tertiary hover:text-ink hover:bg-surface-muted"
                        }`}
                        title={isPlanned ? "Saved in Planned Keywords" : "Save to Planned Keywords"}
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${isPlanned ? "fill-current" : ""}`} />
                      </button>
                    </div>

                    <Button
                      variant={isSavedPlanner ? "secondary" : "primary"}
                      size="compact"
                      loading={isSaving}
                      disabled={isSavedPlanner}
                      onClick={() => handleAddTermToPlanner(item)}
                      className="text-[11px] font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
                    >
                      {isSavedPlanner ? (
                        <>
                          <Check className="h-3 w-3 mr-1" /> Added to Planner
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" /> Add to Planner
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Observed Top Listings Gallery */}
          {searchResponse.topListings.length > 0 && (
            <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Heading as="h2" size="h4">
                      Observed Competing Listings ({searchResponse.topListings.length})
                    </Heading>
                    <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
                  </div>
                  <Text size="body-sm" color="secondary" className="mt-0.5">
                    Top ranking listings on Etsy for &quot;{searchResponse.query}&quot; used to harvest tags and calculate benchmarks.
                  </Text>
                </div>
              </div>

              <div className="divide-y divide-line-subtle border-t border-line-subtle">
                {searchResponse.topListings.map((listing) => (
                  <div
                    key={listing.listingId}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {listing.imageUrl ? (
                        <img
                          src={listing.imageUrl}
                          alt=""
                          className="h-12 w-12 rounded-lg border border-line object-cover shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-[#F4F3EF] border border-line flex items-center justify-center text-[10px] font-bold text-ink-tertiary shrink-0">
                          ETSY
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="font-bold text-xs text-ink truncate">{listing.title}</div>
                        <div className="text-[11px] text-ink-tertiary flex flex-wrap items-center gap-2">
                          <span>Shop: <strong className="text-ink">{listing.shopName}</strong></span>
                          <span>·</span>
                          <span>Price: <strong className="text-ink font-mono">${listing.price.toFixed(2)}</strong></span>
                          <span>·</span>
                          <span>Favorites: <strong className="text-[#0E8F5D] font-mono">{listing.numFavorers}</strong></span>
                        </div>
                        {listing.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {listing.tags.slice(0, 4).map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.2 rounded text-[10px] bg-[#F4F3EF] text-ink-secondary border border-line"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={listing.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg border border-line bg-white hover:bg-[#FAFAF8] text-ink-secondary hover:text-ink text-xs font-medium inline-flex items-center gap-1 shadow-2xs"
                      >
                        <span>Etsy</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Empty Initial State */}
      {!searchResponse && !loading && !error && (
        <Card padding="lg" className="border-line bg-white shadow-xs text-center py-16 space-y-3">
          <Tag className="h-10 w-10 text-ink-tertiary mx-auto" />
          <Heading as="h3" size="h4">
            Search Any Keyword to Begin
          </Heading>
          <Text size="body-sm" color="secondary" className="max-w-md mx-auto">
            Type any product or niche keyword above to harvest all 13 tags from top ranking Etsy listings, calculate supply competition, and discover long-tail opportunities.
          </Text>
        </Card>
      )}
    </div>
  );
}
