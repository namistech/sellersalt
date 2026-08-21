"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Search,
  Sliders,
  Sparkles,
  Compass,
  ArrowRight,
  Bookmark,
  Store,
} from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Button, Input, Select, Alert, Heading, Text, Eyebrow, Badge } from "@/components/ui";
import { Table, EmptyState, MetricDelta, formatShortDate, type Column } from "@/components/data";
import { fetchTrends, type TrendRow } from "@/services/trends";
import { fetchProspects, type ProspectRow } from "@/services/prospects";
import { ServiceError } from "@/services/http";

interface KeywordIntelligenceRow {
  keyword: string;
  wordCount: number;
  sampleListingCount: number;
  estDailyVolume: number;
  difficultyScore: number;
  competitionSignal: "LOW" | "MODERATE" | "HIGH";
  topShopName?: string;
  // Batch 40: null when no prospect in this keyword bucket has an
  // observed price — never a fabricated placeholder average.
  topPrice: number | null;
}

export default function TrendsPage() {
  const [activeTab, setActiveTab] = useState<"keywords" | "competitors">("keywords");
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keyword filters
  const [searchQuery, setSearchQuery] = useState("");
  const [wordCountFilter, setWordCountFilter] = useState<string>("all");

  useEffect(() => {
    Promise.all([fetchTrends(), fetchProspects()])
      .then(([tData, pData]) => {
        setTrends(tData);
        setProspects(pData);
      })
      .catch((e) => setError(e instanceof ServiceError ? e.message : "Couldn't load intelligence data."))
      .finally(() => setLoading(false));
  }, []);

  // Compute Keyword & SEO Intelligence from real database prospects
  const keywordRows: KeywordIntelligenceRow[] = useMemo(() => {
    const map = new Map<
      string,
      { count: number; totalDaily: number; prices: number[]; shops: Set<string> }
    >();

    for (const p of prospects) {
      if (!p.keyword) continue;
      const kw = p.keyword.trim().toLowerCase();
      const current = map.get(kw) || {
        count: 0,
        totalDaily: 0,
        prices: [],
        shops: new Set<string>(),
      };
      current.count += 1;
      current.totalDaily += p.estDailySales ?? 0;
      // Batch 40: only real observed prices go into the sample —
      // p.price is null whenever the source marketplace didn't expose it.
      if (p.price !== null) current.prices.push(p.price);
      if (p.shopName) current.shops.add(p.shopName);
      map.set(kw, current);
    }

    return Array.from(map.entries()).map(([kw, data]) => {
      const words = kw.split(/\s+/).filter(Boolean).length;
      // Batch 40: null (never a fabricated $15 placeholder) when no
      // prospect in this keyword bucket has an observed price.
      const avgPrice =
        data.prices.length > 0
          ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length
          : null;
      const avgDaily = data.totalDaily / Math.max(1, data.count);

      // Deterministic difficulty score (0-100) based on shop concentration & listing age
      const difficulty = Math.min(
        95,
        Math.max(15, Math.round(data.shops.size * 12 + data.count * 4))
      );
      const competitionSignal: "LOW" | "MODERATE" | "HIGH" =
        difficulty < 40 ? "LOW" : difficulty < 70 ? "MODERATE" : "HIGH";

      return {
        keyword: kw,
        wordCount: words,
        sampleListingCount: data.count,
        estDailyVolume: Math.round(avgDaily * 10) / 10,
        difficultyScore: difficulty,
        competitionSignal,
        topPrice: avgPrice !== null ? Math.round(avgPrice * 100) / 100 : null,
      };
    });
  }, [prospects]);

  // Filtered keywords
  const filteredKeywords = useMemo(() => {
    return keywordRows
      .filter((row) => {
        if (
          searchQuery &&
          !row.keyword.toLowerCase().includes(searchQuery.toLowerCase().trim())
        ) {
          return false;
        }
        if (wordCountFilter === "1-2" && row.wordCount > 2) return false;
        if (wordCountFilter === "3" && row.wordCount !== 3) return false;
        if (wordCountFilter === "4+" && row.wordCount < 4) return false;
        if (wordCountFilter === "longtail" && row.wordCount < 3) return false;
        return true;
      })
      .sort((a, b) => b.estDailyVolume - a.estDailyVolume);
  }, [keywordRows, searchQuery, wordCountFilter]);

  function handleExportCompetitorTrends() {
    const header = "Shop,Last Sales,Sales Change,Last Reviews,Review Change,Snapshots,Tracked Since";
    const body = trends
      .map((t) =>
        [
          t.shopName,
          t.lastTotalSales ?? "",
          t.salesGrowth ?? "",
          t.lastReviewCount,
          t.reviewGrowth,
          t.snapshotCount,
          t.firstSeenAt,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellersalt-trends-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportKeywords() {
    const header = "Keyword Niche,Word Count,Est Daily Velocity,Difficulty Score,Competition Signal,Avg Price (USD),Sample Listings";
    const body = filteredKeywords
      .map((k) =>
        [
          `"${k.keyword.replace(/"/g, '""')}"`,
          k.wordCount,
          k.estDailyVolume,
          k.difficultyScore,
          k.competitionSignal,
          k.topPrice !== null ? k.topPrice.toFixed(2) : "Unavailable",
          k.sampleListingCount,
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellersalt-keyword-intelligence-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trends & Keyword SEO Intelligence"
        description="Analyze Etsy search demand volume, long-tail keyword difficulty scores, and longitudinal competitor sales velocity."
        primaryAction={
          activeTab === "keywords" ? (
            <Button
              variant="secondary"
              leadingIcon={<Download className="h-4 w-4" />}
              onClick={handleExportKeywords}
              disabled={filteredKeywords.length === 0}
            >
              Export Keywords CSV
            </Button>
          ) : (
            <Button
              variant="secondary"
              leadingIcon={<Download className="h-4 w-4" />}
              onClick={handleExportCompetitorTrends}
              disabled={trends.length === 0}
            >
              Export Trends CSV
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="danger" title="Couldn't load Trends" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("keywords")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "keywords"
              ? "bg-[#141B16] text-white"
              : "bg-white hover:bg-[#F4F3EF] text-ink border border-line"
          }`}
        >
          Keyword & SEO Intelligence ({keywordRows.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("competitors")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "competitors"
              ? "bg-[#141B16] text-white"
              : "bg-white hover:bg-[#F4F3EF] text-ink border border-line"
          }`}
        >
          Competitor Velocity Movers ({trends.length})
        </button>
      </div>

      {/* 1. KEYWORD & SEO INTELLIGENCE TAB */}
      {activeTab === "keywords" && (
        <div className="space-y-4">
          {/* Keyword Search & Word-Count Filter Controls */}
          <Card padding="md" className="border-line bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-ink-tertiary" />
                <Input
                  placeholder="Filter keywords or niches (e.g. planner, svg, vintage)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs border-0 focus:ring-0 w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-tertiary whitespace-nowrap">
                  Word Length:
                </span>
                <Select
                  value={wordCountFilter}
                  onChange={(e) => setWordCountFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Lengths" },
                    { value: "longtail", label: "Long-Tail (3+ words)" },
                    { value: "1-2", label: "1-2 Words" },
                    { value: "3", label: "3 Words" },
                    { value: "4+", label: "4+ Words" },
                  ]}
                  className="text-xs"
                />
              </div>
            </div>
          </Card>

          {/* High-Information Density Table */}
          <Card padding="sm" className="border-line bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary font-semibold">
                  <tr>
                    <th className="p-3">Keyword Niche</th>
                    <th className="p-3">Length</th>
                    <th className="p-3">Est. Daily Sales Velocity</th>
                    <th className="p-3">Keyword Difficulty</th>
                    <th className="p-3">Competition</th>
                    <th className="p-3">Avg Price</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle font-mono">
                  {filteredKeywords.map((k) => (
                    <tr key={k.keyword} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="p-3 font-sans font-bold text-ink">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-[#FFB020] shrink-0" />
                          <span>{k.keyword}</span>
                        </div>
                      </td>
                      <td className="p-3 text-ink-secondary">{k.wordCount} words</td>
                      <td className="p-3 font-bold text-[#0E8F5D]">
                        {k.estDailyVolume.toFixed(1)} / day
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-[#E3E6E0] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                k.difficultyScore < 40
                                  ? "bg-[#0E8F5D]"
                                  : k.difficultyScore < 70
                                  ? "bg-[#FFB020]"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${k.difficultyScore}%` }}
                            />
                          </div>
                          <span>{k.difficultyScore}/100</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            k.competitionSignal === "LOW"
                              ? "success"
                              : k.competitionSignal === "MODERATE"
                              ? "gold"
                              : "neutral"
                          }
                        >
                          {k.competitionSignal}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold text-ink">
                        {k.topPrice !== null ? `$${k.topPrice.toFixed(2)}` : "Unavailable"}
                      </td>
                      <td className="p-3 text-right font-sans">
                        <Link href={`/prospects?search=${encodeURIComponent(k.keyword)}`}>
                          <Button variant="secondary" size="compact" className="text-xs">
                            Research →
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 2. COMPETITOR VELOCITY MOVERS TAB */}
      {activeTab === "competitors" && (
        <div className="space-y-4">
          {(() => {
            const topMover = trends.reduce<typeof trends[number] | null>((best, t) => {
              if (t.salesGrowth == null) return best;
              if (!best || (best.salesGrowth ?? -Infinity) < t.salesGrowth) return t;
              return best;
            }, null);
            if (!topMover || (topMover.salesGrowth ?? 0) <= 0) return null;
            return (
              <Card variant="feature" padding="md" className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Eyebrow tone="accent">Fastest-Growing Competitor</Eyebrow>
                  <Link
                    href={`/shops/${topMover.shopExternalId}`}
                    className="mt-1 flex items-center gap-1.5 font-bold text-ink text-lg hover:text-brand-primary"
                  >
                    <Store className="h-4 w-4 text-brand-primary" />
                    {topMover.shopName}
                  </Link>
                </div>
                <div className="text-right">
                  <Eyebrow>Sales Growth</Eyebrow>
                  <div className="text-2xl font-extrabold text-brand-primary font-mono">
                    +{topMover.salesGrowth!.toLocaleString()}
                  </div>
                </div>
              </Card>
            );
          })()}

          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div>
            <Eyebrow>
              Longitudinal Competitor Sales Velocity ({trends.length})
            </Eyebrow>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              Verified sales growth comparing first-seen snapshots to current lifetime sales.
            </Text>
          </div>

          {trends.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-tertiary">
              No trend data yet. Set a search to run Daily or Weekly to track competitor movement over time.
            </div>
          ) : (
            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary font-semibold">
                  <tr>
                    <th className="p-3">Shop</th>
                    <th className="p-3 text-right">Lifetime Sales</th>
                    <th className="p-3 text-right">Sales Change</th>
                    <th className="p-3 text-right">Reviews</th>
                    <th className="p-3 text-right">Review Change</th>
                    <th className="p-3 text-right">Snapshots</th>
                    <th className="p-3 text-right">Tracked Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle font-mono">
                  {trends.map((t) => (
                    <tr key={t.shopExternalId} className="hover:bg-[#FAFAF8]">
                      <td className="p-3 font-sans font-bold">
                        <Link
                          href={`/shops/${t.shopExternalId}`}
                          className="text-[#0E8F5D] hover:underline flex items-center gap-1.5"
                        >
                          <Store className="h-3.5 w-3.5" />
                          {t.shopName}
                        </Link>
                      </td>
                      <td className="p-3 text-right font-bold text-ink">{t.lastTotalSales ?? "—"}</td>
                      <td className="p-3 text-right">
                        {t.salesGrowth != null ? (
                          <MetricDelta value={t.salesGrowth} type="absolute" />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-right">{t.lastReviewCount}</td>
                      <td className="p-3 text-right">
                        <MetricDelta value={t.reviewGrowth} type="absolute" />
                      </td>
                      <td className="p-3 text-right">{t.snapshotCount}</td>
                      <td className="p-3 text-right font-sans text-ink-tertiary">
                        {formatShortDate(t.firstSeenAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </Card>
        </div>
      )}
    </div>
  );
}
