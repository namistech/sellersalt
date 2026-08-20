"use client";

import React, { useState } from "react";
import {
  Search,
  Sparkles,
  ShoppingBag,
  TrendingUp,
  Users,
  ShieldCheck,
  RefreshCw,
  Compass,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Star,
  DollarSign,
  Activity,
  CheckCircle2,
  Bookmark,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import type {
  ProductResearchSessionResult,
  ResearchDepthMode,
} from "@/marketplaces/core/research-command-types";
import type { MarketplaceId } from "@/marketplaces/core/types";

interface CommandCenterProps {
  initialQuery?: string;
  initialMarketplaces?: MarketplaceId[];
}

export function ProductResearchCommandCenter({
  initialQuery = "minimalist desk lamp",
  initialMarketplaces = ["etsy", "amazon", "ebay", "walmart"],
}: CommandCenterProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<MarketplaceId[]>(initialMarketplaces);
  const [depth, setDepth] = useState<ResearchDepthMode>("STANDARD");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductResearchSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "products" | "keywords" | "competition" | "opportunities" | "decision" | "quality" | "trace"
  >("products");
  const [traceExpanded, setTraceExpanded] = useState(false);

  const toggleMarketplace = (mp: MarketplaceId) => {
    if (selectedMarketplaces.includes(mp)) {
      if (selectedMarketplaces.length > 1) {
        setSelectedMarketplaces(selectedMarketplaces.filter((m) => m !== mp));
      }
    } else {
      setSelectedMarketplaces([...selectedMarketplaces, mp]);
    }
  };

  const handleExecuteResearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          marketplaces: selectedMarketplaces,
          depth,
        }),
      });

      if (!res.ok) {
        throw new Error(`Research command failed with status ${res.status}`);
      }

      const data = (await res.json()) as ProductResearchSessionResult;
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to execute market research.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Research Command Bar */}
      <Card className="p-6 border rounded-2xl bg-card shadow-sm space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            Product Research Command Center
          </h1>
          <p className="text-xs text-muted-foreground">
            Multi-marketplace evidence-based market research, keyword clustering, competition density, and commercial decision intelligence.
          </p>
        </div>

        <form onSubmit={handleExecuteResearch} className="space-y-4 pt-1">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What product or market do you want to research? (e.g. ceramic coffee mug)"
                className="pl-10 text-xs h-10"
              />
            </div>

            <Button type="submit" disabled={loading} size="default" className="text-xs shrink-0 w-full md:w-auto h-10 px-5">
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1.5" />
              )}
              Research Market
            </Button>
          </div>

          {/* Marketplace selection & Depth mode */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs border-t border-border/50 pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground font-semibold text-[11px]">Marketplaces:</span>
              {(["amazon", "ebay", "walmart", "etsy"] as const).map((mp) => {
                const isSelected = selectedMarketplaces.includes(mp);
                return (
                  <button
                    key={mp}
                    type="button"
                    onClick={() => toggleMarketplace(mp)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors capitalize ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-semibold"
                        : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-primary" : "bg-muted-foreground/40"}`} />
                    {mp}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold text-[11px]">Depth:</span>
              {(["QUICK", "STANDARD", "DEEP"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDepth(d)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    depth === d
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Card>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <Card className="p-12 text-center border rounded-2xl bg-card space-y-4 shadow-sm">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Executing Product Research Command</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Acquiring public observations across {selectedMarketplaces.join(", ")}, clustering keywords, evaluating competition density, and generating commercial opportunities...
            </p>
          </div>
        </Card>
      ) : result ? (
        <div className="space-y-6">
          {/* 2. High-Level Market Overview Card */}
          <Card className="p-6 border rounded-2xl bg-card shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral" className="text-xs font-semibold">
                    {result.overview.totalProductsObserved} Products Observed
                  </Badge>
                  <Badge variant="neutral" className="text-xs">
                    {result.overview.marketplacesSuccessfulCount}/{result.overview.marketplacesResearchedCount} Marketplaces Active
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Freshness: {result.overview.freshnessStatus}
                  </span>
                </div>
                <h2 className="text-xl font-black tracking-tight text-foreground capitalize">
                  {result.query}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Observed Price Band: {result.overview.minPrice ? `$${result.overview.minPrice.toFixed(2)}` : "—"} - {result.overview.maxPrice ? `$${result.overview.maxPrice.toFixed(2)}` : "—"} • Median: {result.overview.medianPrice ? `$${result.overview.medianPrice.toFixed(2)}` : "—"}
                </p>
              </div>

              {/* KPI Score Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <div className="p-3 rounded-xl bg-muted/40 border text-center space-y-0.5">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Opportunity</span>
                  <span className="text-xl font-black text-primary">{result.overview.overallOpportunityScore ?? "—"}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border text-center space-y-0.5">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Demand</span>
                  <span className="text-xl font-black text-foreground">{result.overview.overallDemandScore ?? "—"}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border text-center space-y-0.5">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Competition</span>
                  <span className="text-xl font-black text-foreground">{result.overview.overallCompetitionScore ?? "—"}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border text-center space-y-0.5">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Momentum</span>
                  <Badge variant="neutral" className="text-[10px] mt-1">
                    {result.overview.overallMomentum}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Commercial Verdict Strip */}
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="font-bold text-foreground mr-1.5">{result.commercialDecision.verdictLabel}:</span>
                  <span className="text-muted-foreground">{result.commercialDecision.recommendation}</span>
                </div>
              </div>
              <a
                href={`/validate?q=${encodeURIComponent(result.query)}`}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:brightness-110 shrink-0"
              >
                Validate in Studio
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </Card>

          {/* 3. Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b pb-2 text-xs font-semibold">
            {[
              { id: "products", label: `Observed Products (${result.products.length})`, icon: <ShoppingBag className="w-3.5 h-3.5" /> },
              { id: "keywords", label: `Keyword Clusters (${result.keywords.length})`, icon: <Compass className="w-3.5 h-3.5" /> },
              { id: "competition", label: `Competition & Merchants`, icon: <Users className="w-3.5 h-3.5" /> },
              { id: "opportunities", label: `Opportunities (${result.opportunities.length})`, icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: "decision", label: `Decision & Risks`, icon: <ShieldCheck className="w-3.5 h-3.5" /> },
              { id: "quality", label: `Data Quality & Trust`, icon: <Activity className="w-3.5 h-3.5" /> },
              { id: "trace", label: `Acquisition Trace (${result.acquisitionTrace.length})`, icon: <Layers className="w-3.5 h-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* 4. Tab Contents */}

          {/* Tab: Observed Products */}
          {activeTab === "products" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.products.map((p, idx) => (
                <Card key={idx} className="p-4 border rounded-xl bg-card space-y-3 shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="neutral" className="capitalize text-[10px]">
                        {p.marketplace}
                      </Badge>
                      {p.price !== null && (
                        <span className="text-sm font-black text-foreground">
                          ${p.price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-bold text-foreground line-clamp-2" title={p.title}>
                      {p.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {p.rating !== null && p.rating !== undefined && (
                        <span className="flex items-center gap-1 text-amber-500 font-medium">
                          <Star className="w-3 h-3 fill-amber-500" />
                          {p.rating.toFixed(1)}
                        </span>
                      )}
                      {p.reviewCount !== null && p.reviewCount !== undefined && (
                        <span>{p.reviewCount.toLocaleString()} reviews</span>
                      )}
                      {p.shop?.name && (
                        <span className="truncate max-w-[120px]">{p.shop.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between text-[11px]">
                    <a
                      href={`/validate?q=${encodeURIComponent(p.title)}&marketplace=${p.marketplace}`}
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      Validate
                      <ArrowRight className="w-3 h-3" />
                    </a>

                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        Listing <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Tab: Keyword Clusters */}
          {activeTab === "keywords" && (
            <Card className="p-6 border rounded-xl bg-card space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  Empirical Keyword Prevalence & Intent Clusters
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Search volume: strictly UNAVAILABLE
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-muted-foreground font-semibold">
                      <th className="pb-2">Keyword Term</th>
                      <th className="pb-2">Cluster</th>
                      <th className="pb-2">Listing Prevalence</th>
                      <th className="pb-2">Intent</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {result.keywords.map((kw, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="py-2.5 font-bold text-foreground">{kw.term}</td>
                        <td className="py-2.5">
                          <Badge variant="neutral" className="text-[10px]">
                            {kw.category}
                          </Badge>
                        </td>
                        <td className="py-2.5 font-medium">{kw.listingPrevalencePercent}% of listings</td>
                        <td className="py-2.5 text-muted-foreground">{kw.intent}</td>
                        <td className="py-2.5">
                          <a
                            href={`/validate?q=${encodeURIComponent(kw.term)}`}
                            className="text-primary hover:underline font-semibold text-[11px]"
                          >
                            Validate
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Tab: Competition & Merchants */}
          {activeTab === "competition" && (
            <Card className="p-6 border rounded-xl bg-card space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  Dominant Competitor Merchants & Concentration
                </h3>
                <Badge variant="neutral" className="text-xs">
                  Barrier: {result.competition.reviewBarrierRating}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {result.competition.explanation}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {result.competition.dominantSellers.map((seller, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-muted/30 border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground truncate">{seller.name}</span>
                      <Badge variant="neutral" className="text-[10px] capitalize">
                        {seller.marketplace}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-muted-foreground text-[11px]">
                      <div>Observed Catalog Share: <span className="font-semibold text-foreground">{seller.shareOfObservedCatalogPercent}%</span></div>
                      <div>Observed Reviews: <span className="font-semibold text-foreground">{seller.observedTotalReviews ?? "—"}</span></div>
                      <div>Barrier Rating: <span className="font-semibold text-foreground">{seller.establishedBarrier}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tab: Opportunities */}
          {activeTab === "opportunities" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.opportunities.map((opp, idx) => (
                <Card key={idx} className="p-5 border rounded-xl bg-card space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <Badge variant="neutral" className="text-[10px]">
                      {opp.type}
                    </Badge>
                    <Badge variant={opp.verdictVariant} className="text-[10px]">
                      Score: {opp.score}/100
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-foreground">{opp.title}</h4>
                  <p className="text-xs text-muted-foreground">{opp.explanation.headline}</p>

                  <div className="pt-2 border-t flex items-center justify-between text-xs">
                    <span className="text-[11px] text-muted-foreground">{opp.confidence}% confidence</span>
                    <a
                      href={`/validate?q=${encodeURIComponent(opp.title)}&marketplace=${opp.marketplace}`}
                      className="text-primary font-bold hover:underline"
                    >
                      Validate Product →
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Tab: Decision & Risks */}
          {activeTab === "decision" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5 border rounded-xl bg-card space-y-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Top Drivers to Pursue
                </span>
                <ul className="space-y-1.5 list-disc pl-4 text-xs text-muted-foreground">
                  {result.commercialDecision.topReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5 border rounded-xl bg-card space-y-3">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Strongest Risks
                </span>
                <ul className="space-y-1.5 list-disc pl-4 text-xs text-muted-foreground">
                  {result.commercialDecision.topRisks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5 border rounded-xl bg-card space-y-3">
                <span className="text-xs font-bold text-muted-foreground block flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  Unknown Signals
                </span>
                <ul className="space-y-1.5 list-disc pl-4 text-xs text-muted-foreground/80">
                  {result.commercialDecision.unobservedSignals.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {/* Tab: Data Quality & Trust */}
          {activeTab === "quality" && (
            <Card className="p-6 border rounded-xl bg-card space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">
                  Data Quality & Trust Breakdown
                </h3>
                <Badge variant={result.researchQuality.qualityTier === "HIGH" ? "success" : "info"} className="text-xs">
                  {result.researchQuality.qualityTier} Quality ({result.researchQuality.qualityScore}/100)
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-xs">
                {result.marketplaceCoverage.map((mc, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/30 border space-y-1">
                    <span className="font-bold text-foreground capitalize block">{mc.marketplace}</span>
                    <div className="text-[11px] text-muted-foreground">Status: <span className="font-medium text-foreground">{mc.status}</span></div>
                    <div className="text-[11px] text-muted-foreground">Observed: <span className="font-medium text-foreground">{mc.itemCount} listings</span></div>
                    <div className="text-[11px] text-muted-foreground">Completeness: <span className="font-medium text-foreground">{mc.fieldCompletenessPercent}%</span></div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tab: Acquisition Trace */}
          {activeTab === "trace" && (
            <Card className="p-6 border rounded-xl bg-card space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-foreground">
                Compliant Public Acquisition Trace
              </h3>
              <p className="text-xs text-muted-foreground">
                Verifiable execution steps across public ingestion streams, query normalizers, and memory repositories.
              </p>

              <div className="space-y-2 pt-2 text-xs font-mono">
                {result.acquisitionTrace.map((step, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-muted/30 border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                        {step.stepIndex}
                      </span>
                      <span className="font-bold text-foreground">{step.action}</span>
                      {step.marketplace && (
                        <Badge variant="neutral" className="text-[10px] uppercase font-sans">
                          {step.marketplace}
                        </Badge>
                      )}
                      <span className="text-muted-foreground font-sans">{step.details}</span>
                    </div>
                    <span className="text-muted-foreground text-[10px] shrink-0 font-sans">{step.durationMs}ms</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
