"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Compass,
  Flame,
  Search,
  Store,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Target,
  Layers,
  Star,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Award,
  BarChart3,
  RefreshCw,
  FolderTree,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Badge,
  Button,
  SafeImage,
  Input,
  MarketplaceSelector,
  type MarketplaceSelectValue,
} from "@/components/ui";
import { fetchJson } from "@/services/http";
import type {
  NicheOpportunity,
  NicheDiscoverySummary,
  MarketplaceId,
} from "@/marketplaces/core/types";

interface DiscoveryClientProps {
  initialSummary: NicheDiscoverySummary;
  topProducts: any[];
  topShops: any[];
  totalProspects: number;
  totalTrackedShops: number;
  activeStreams: number;
}

function getScoreBadgeClasses(score: number | null) {
  if (score === null) return "bg-surface-muted text-ink-tertiary border-line-subtle";
  if (score >= 80) return "bg-brand-primary-subtle text-brand-primary border-brand-primary/30 font-bold";
  if (score >= 65) return "bg-warn-subtle text-warn-strong border-warn/30 font-semibold";
  return "bg-surface-muted text-ink border-line";
}

import { AutonomousDiscoveryCenter } from "@/components/discovery/AutonomousDiscoveryCenter";

export function DiscoveryClient({
  initialSummary,
  topProducts,
  topShops,
  totalProspects,
  totalTrackedShops,
  activeStreams,
}: DiscoveryClientProps) {
  const [activeTab, setActiveTab] = useState<"autonomous" | "niches">("autonomous");
  const [summary, setSummary] = useState<NicheDiscoverySummary>(initialSummary);
  const [searchQuery, setSearchQuery] = useState("");
  const [marketplace, setMarketplace] = useState<MarketplaceSelectValue>("etsy");
  const [searchMode, setSearchMode] = useState<"database" | "live">("database");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await fetchJson<{ summary: NicheDiscoverySummary }>("/api/niches/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery.trim(),
          marketplace: marketplace === "all" ? "etsy" : marketplace,
          mode: searchMode,
        }),
      });
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || "Failed to discover niches.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b pb-3">
        <button
          onClick={() => setActiveTab("autonomous")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "autonomous"
              ? "bg-primary text-white shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          ✨ Autonomous Opportunity Discovery
        </button>
        <button
          onClick={() => setActiveTab("niches")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "niches"
              ? "bg-primary text-white shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          📂 Niche Database Explorer
        </button>
      </div>

      {activeTab === "autonomous" ? (
        <AutonomousDiscoveryCenter />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0E8F5D]/10 text-[#0E8F5D]">
                  <Compass className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0E8F5D]">
                  Intelligence Central
                </span>
              </div>
              <Heading as="h1" size="h2">
                Niche Discovery & Demand Signals
              </Heading>
              <Text size="body-md" color="secondary" className="mt-0.5">
                Identify high-opportunity ecommerce niches, study demand momentum, and inspect competition barriers.
              </Text>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/radar">
                <Button variant="secondary" size="compact" className="text-xs">
                  <Flame className="h-3.5 w-3.5 mr-1 text-[#FFB020]" /> View Radar
                </Button>
              </Link>
              <Link href="/prospects">
                <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold">
                  Explore All Prospects →
                </Button>
              </Link>
            </div>
          </div>

      {/* Niche Discovery & Search Controls */}
      <Card padding="md" className="border-line bg-white space-y-4 shadow-xs">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full relative">
            <Input
              type="search"
              placeholder="Search or filter niches (e.g. 'digital planner', 'ceramic mug', 'wedding')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 text-xs"
            />
            <Search className="h-4 w-4 text-ink-tertiary absolute left-3 top-2.5" />
          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <MarketplaceSelector
              selectedId={marketplace}
              onChange={setMarketplace}
              allowAll={false}
              className="text-xs"
            />

            <div className="flex rounded-md border border-line p-0.5 bg-surface-secondary text-xs shrink-0">
              <button
                type="button"
                onClick={() => setSearchMode("database")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  searchMode === "database" ? "bg-white text-ink shadow-xs" : "text-ink-secondary hover:text-ink"
                }`}
              >
                Saved Prospects
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("live")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  searchMode === "live" ? "bg-white text-ink shadow-xs" : "text-ink-secondary hover:text-ink"
                }`}
              >
                Live Research
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="compact"
              disabled={loading}
              className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs shrink-0"
            >
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Discover Niches"}
            </Button>
          </div>
        </form>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">
            {error}
          </div>
        )}
      </Card>

      {/* Discovered Niches Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#0E8F5D]" />
            <Heading as="h2" size="h4" className="text-sm font-semibold">
              Discovered Niche Opportunities ({summary.totalNichesFound})
            </Heading>
          </div>
          <span className="text-xs text-ink-tertiary">
            Evaluated via Canonical Intelligence Engine
          </span>
        </div>

        {summary.niches.length === 0 ? (
          <Card padding="lg" className="border-line text-center py-12 bg-white space-y-3">
            <Compass className="h-8 w-8 text-ink-tertiary mx-auto" />
            <div className="text-sm font-semibold text-ink">No niches discovered matching your query</div>
            <p className="text-xs text-ink-secondary max-w-md mx-auto">
              Run a live search above or generate prospects in Product Research to aggregate new niche clusters.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.niches.map((niche) => (
              <Card
                key={niche.id}
                padding="md"
                className="border-line bg-white shadow-xs space-y-4 hover:border-line-strong transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Niche Title & Score */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink">{niche.nicheName}</span>
                        <Badge variant="neutral" className="text-label-sm uppercase">
                          {niche.marketplace}
                        </Badge>
                      </div>
                      <Text size="meta" color="secondary" className="mt-0.5">
                        {niche.observedProductCount} observed product{niche.observedProductCount === 1 ? "" : "s"}
                        {niche.averagePrice !== null ? ` · Avg Price $${niche.averagePrice.toFixed(2)}` : ""}
                      </Text>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`px-2 py-0.5 rounded font-mono text-xs border ${getScoreBadgeClasses(niche.opportunityScore)}`}>
                        {niche.opportunityScore !== null ? `${niche.opportunityScore}/100` : "—"}
                      </span>
                      <span className="text-meta font-mono text-ink-tertiary">
                        {niche.confidence}% conf
                      </span>
                    </div>
                  </div>

                  {/* 3-Pill Signal Summary */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line-subtle text-xs">
                    <div className="p-2 rounded bg-surface-secondary/70 border border-line-subtle space-y-0.5">
                      <div className="text-meta font-medium text-ink-tertiary">Demand Signal</div>
                      <div className="font-bold text-ink flex items-center gap-1">
                        <Zap className="h-3 w-3 text-brand-primary" />
                        {niche.demand.strength}
                      </div>
                      <div className="text-meta text-ink-secondary truncate">
                        {niche.demand.observedDailyVelocity !== null ? `${niche.demand.observedDailyVelocity} units/day` : "Proxy unavailable"}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-surface-secondary/70 border border-line-subtle space-y-0.5">
                      <div className="text-meta font-medium text-ink-tertiary">Competition</div>
                      <div className="font-bold text-ink flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-warn" />
                        {niche.competition.intensity}
                      </div>
                      <div className="text-meta text-ink-secondary truncate">
                        {niche.competition.topShopConcentration !== null ? `${niche.competition.topShopConcentration}% top shops` : "—"}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-surface-secondary/70 border border-line-subtle space-y-0.5">
                      <div className="text-meta font-medium text-ink-tertiary">Freshness</div>
                      <div className="font-bold text-ink flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-[#0E8F5D]" />
                        {niche.momentum.direction}
                      </div>
                      <div className="text-meta text-ink-secondary truncate">
                        {niche.momentum.freshnessRatio !== null ? `${niche.momentum.freshnessRatio}% <90 days` : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Subcategories & Keywords */}
                  {niche.topSubcategories.length > 0 && (
                    <div className="space-y-1 text-xs">
                      <span className="text-label-sm font-medium text-ink-tertiary">Strongest Sub-branches:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {niche.topSubcategories.map((sub) => (
                          <span key={sub.name} className="px-1.5 py-0.5 rounded bg-surface-muted text-ink text-label-sm border border-line-subtle">
                            {sub.name} ({sub.productCount})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample Products Thumbnail Preview */}
                  {niche.sampleProducts.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pt-1">
                      {niche.sampleProducts.map((prod) => (
                        <a
                          key={prod.externalId}
                          href={prod.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-10 w-10 rounded border border-line-subtle overflow-hidden shrink-0 hover:border-line transition-colors relative group"
                          title={prod.title}
                        >
                          {prod.imageUrl ? (
                            <SafeImage src={prod.imageUrl} alt={prod.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-surface-muted flex items-center justify-center text-[8px] text-ink-tertiary">
                              Img
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Verdict & Action */}
                <div className="pt-2 border-t border-line-subtle flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-brand-primary text-meta truncate">
                    {niche.verdict}
                  </span>
                  <Link href={`/prospects`}>
                    <Button variant="ghost" size="compact" className="text-label-sm h-6 px-2 text-[#0E8F5D]">
                      Inspect Listings <ArrowRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Limitations Callout */}
        {summary.marketLimitations.length > 0 && (
          <div className="p-3 rounded-md bg-surface-secondary/50 border border-line-subtle text-meta text-ink-tertiary flex items-start gap-2">
            <Info className="h-4 w-4 text-ink-secondary shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-ink-secondary">Data Provenance & Limitations:</span>
              <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                {summary.marketLimitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        <Link href="/radar" className="group">
          <Card padding="md" className="h-full border-line shadow-xs bg-white hover:border-[#0E8F5D] transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                <Flame className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-ink-tertiary group-hover:text-[#0E8F5D] flex items-center gap-0.5">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="font-bold text-sm text-ink mb-1">Opportunity Radar</div>
            <Text size="meta" color="secondary">
              High-velocity listings with &lt;100 reviews in low-competition market segments.
            </Text>
          </Card>
        </Link>

        <Link href="/categories" className="group">
          <Card padding="md" className="h-full border-line shadow-xs bg-white hover:border-[#0E8F5D] transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
                <FolderTree className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-ink-tertiary group-hover:text-[#0E8F5D] flex items-center gap-0.5">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="font-bold text-sm text-ink mb-1">Category Research</div>
            <Text size="meta" color="secondary">
              Buyer taxonomy hierarchy, price percentiles, and catalog benchmarks.
            </Text>
          </Card>
        </Link>

        <Link href="/trends" className="group">
          <Card padding="md" className="h-full border-line shadow-xs bg-white hover:border-[#0E8F5D] transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#0E8F5D] group-hover:scale-105 transition-transform">
                <TrendingUp className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-ink-tertiary group-hover:text-[#0E8F5D] flex items-center gap-0.5">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="font-bold text-sm text-ink mb-1">Keyword Trends</div>
            <Text size="meta" color="secondary">
              Search term velocity, season surges, and high-demand keyword opportunities.
            </Text>
          </Card>
        </Link>

        <Link href="/settings/channels" className="group">
          <Card padding="md" className="h-full border-line shadow-xs bg-white hover:border-[#0E8F5D] transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
                <Store className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-ink-tertiary group-hover:text-[#0E8F5D] flex items-center gap-0.5">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="font-bold text-sm text-ink mb-1">Marketplace Channels</div>
            <Text size="meta" color="secondary">
              Connect your verified Etsy shop and manage multi-platform storefront sync.
            </Text>
          </Card>
        </Link>
      </div>
        </>
      )}
    </div>
  );
}
