"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ExternalLink, Bookmark, Download, Compass } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Input, Button, Alert, Badge, Heading, Text } from "@/components/ui";

interface KeywordResult {
  keyword: string;
  wordCount: number;
  listingCount: number;
  uniqueShopCount: number;
  avgPrice: number;
  avgEstDailySales: number;
  estimatedDemandSignal: number;
  competitionLevel: "easy" | "moderate" | "hard";
  competitionLabel: string;
  evidenceListingUrl: string;
  evidenceListingTitle: string;
  evidenceShopName: string;
}

type MatchMode = "contains" | "exact" | "starts" | "ends";
type WordFilter = "all" | "1" | "2" | "3" | "4plus";

const COMPETITION_BADGE: Record<KeywordResult["competitionLevel"], "success" | "warning" | "danger"> = {
  easy: "success",
  moderate: "warning",
  hard: "danger",
};

export default function KeywordResearchPage() {
  const [query, setQuery] = useState("");
  const [match, setMatch] = useState<MatchMode>("contains");
  const [wordFilter, setWordFilter] = useState<WordFilter>("all");
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [plannedKeywords, setPlannedKeywords] = useState<Record<string, boolean>>({});
  const [planningLoading, setPlanningLoading] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const params = new URLSearchParams({ q: query.trim(), match });
      if (wordFilter !== "all") params.set("words", wordFilter);
      const res = await fetch(`/api/keyword-research?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Keyword research failed.");
        setResults([]);
        return;
      }
      setResults(data.results ?? []);
    } catch {
      setError("Network error running keyword research.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToPlanning(r: KeywordResult) {
    setPlanningLoading(r.keyword);
    setPlannedKeywords((prev) => ({ ...prev, [r.keyword]: true }));
    try {
      await fetch("/api/planned-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: r.keyword, sourceListingUrl: r.evidenceListingUrl }),
      });
    } catch {
      setPlannedKeywords((prev) => ({ ...prev, [r.keyword]: false }));
    } finally {
      setPlanningLoading(null);
    }
  }

  function handleExportCsv() {
    const header = "Keyword,Word Count,Listings,Unique Shops,Avg Price,Avg Est Daily Sales,Estimated Demand Signal,Competition";
    const body = results
      .map((r) =>
        [
          `"${r.keyword.replace(/"/g, '""')}"`,
          r.wordCount,
          r.listingCount,
          r.uniqueShopCount,
          r.avgPrice,
          r.avgEstDailySales,
          r.estimatedDemandSignal,
          r.competitionLabel,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellersalt-keyword-research-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const MATCH_OPTIONS: Array<{ id: MatchMode; label: string }> = [
    { id: "contains", label: "Contains" },
    { id: "exact", label: "Exact match" },
    { id: "starts", label: "Starts with" },
    { id: "ends", label: "Ends with" },
  ];

  const WORD_OPTIONS: Array<{ id: WordFilter; label: string }> = [
    { id: "all", label: "All lengths" },
    { id: "1", label: "1 word" },
    { id: "2", label: "2 words" },
    { id: "3", label: "3 words" },
    { id: "4plus", label: "4+ words (long-tail)" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keyword Research"
        description="Search real keywords discovered across your Etsy research — not generated suggestions."
        primaryAction={
          results.length > 0 ? (
            <Button variant="secondary" leadingIcon={<Download className="h-4 w-4" />} onClick={handleExportCsv}>
              Export CSV
            </Button>
          ) : undefined
        }
      />

      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                label="Keyword or phrase"
                required
                placeholder="e.g. wedding gift, minimalist jewelry"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="primary" loading={loading} leadingIcon={<Search className="h-4 w-4" />} className="bg-[#0E8F5D] hover:bg-[#0C7A52]">
                Research
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase mr-1">Match:</span>
              {MATCH_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMatch(opt.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    match === opt.id ? "bg-[#141B16] text-white" : "bg-surface-muted text-ink-secondary hover:bg-[#F4F3EF]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase mr-1">Length:</span>
              {WORD_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWordFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    wordFilter === opt.id ? "bg-[#141B16] text-white" : "bg-surface-muted text-ink-secondary hover:bg-[#F4F3EF]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </form>

        {error && <Alert variant="danger">{error}</Alert>}
      </Card>

      {searched && !loading && results.length === 0 && !error && (
        <Card padding="lg" className="border-line bg-white shadow-xs text-center py-12">
          <Text color="secondary">
            No keywords found in your research data matching "{query}". Run a Prospects search for this term first — Keyword Research surfaces terms from listings you've already discovered, not generated guesses.
          </Text>
        </Card>
      )}

      {results.length > 0 && (
        <Card padding="sm" className="border-line bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary font-semibold">
                <tr>
                  <th className="p-3">Keyword</th>
                  <th className="p-3">Words</th>
                  <th className="p-3">Listings</th>
                  <th className="p-3">Shops</th>
                  <th className="p-3">Avg Price</th>
                  <th className="p-3">Avg Daily Velocity</th>
                  <th className="p-3">Est. Demand Signal</th>
                  <th className="p-3">Competition</th>
                  <th className="p-3">Evidence</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {results.map((r) => {
                  const isPlanned = plannedKeywords[r.keyword];
                  return (
                    <tr key={r.keyword} className="hover:bg-[#FAFAF8]">
                      <td className="p-3 font-bold text-ink">{r.keyword}</td>
                      <td className="p-3 font-mono text-ink-tertiary">{r.wordCount}</td>
                      <td className="p-3 font-mono">{r.listingCount}</td>
                      <td className="p-3 font-mono">{r.uniqueShopCount}</td>
                      <td className="p-3 font-mono">${r.avgPrice.toFixed(2)}</td>
                      <td className="p-3 font-mono text-[#0E8F5D] font-bold">{r.avgEstDailySales}/day</td>
                      <td className="p-3 font-mono" title="Estimated from average favorites across matching listings — Etsy doesn't expose real search volume.">
                        {r.estimatedDemandSignal.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Badge variant={COMPETITION_BADGE[r.competitionLevel]}>{r.competitionLabel}</Badge>
                      </td>
                      <td className="p-3 max-w-[160px]">
                        <a
                          href={r.evidenceListingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-tertiary hover:text-ink flex items-center gap-1 truncate"
                          title={r.evidenceListingTitle}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{r.evidenceShopName}</span>
                        </a>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/prospects?search=${encodeURIComponent(r.keyword)}`} title="Research this keyword in Prospects">
                            <button type="button" className="p-1.5 rounded text-ink-tertiary hover:text-ink hover:bg-surface-muted">
                              <Compass className="h-3.5 w-3.5" />
                            </button>
                          </Link>
                          <button
                            type="button"
                            disabled={planningLoading === r.keyword || isPlanned}
                            onClick={() => handleAddToPlanning(r)}
                            title={isPlanned ? "Added to planning" : "Add to Keyword Planning"}
                            className={`p-1.5 rounded transition-colors disabled:opacity-60 ${
                              isPlanned ? "text-[#0E8F5D]" : "text-ink-tertiary hover:text-ink hover:bg-surface-muted"
                            }`}
                          >
                            <Bookmark className={`h-3.5 w-3.5 ${isPlanned ? "fill-current" : ""}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
