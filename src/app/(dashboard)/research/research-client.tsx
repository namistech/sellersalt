"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Hash,
  Store,
  FolderTree,
  Flame,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  History,
  Activity,
  GitCompare,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Info,
  ShieldCheck,
} from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ResearchReportView } from "@/components/research/ResearchReportView";
import { getMarketplaceCapabilityMatrix, getMarketplaceCapability, type MarketplaceCapabilityDetails } from "@/lib/marketplace-capability-matrix";
import type { MarketplaceId } from "@/marketplaces/core/types";
import type { WorkbenchResearchResponse, ResearchRunType } from "@/marketplaces/core/acquisition/workbench";

interface ResearchClientProps {
  initialRecentRuns: any[];
  initialSourceHealth: any[];
}

const RESEARCH_TABS: Array<{ id: ResearchRunType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
  { id: "PRODUCT", label: "Product Research", icon: Search, description: "Discover high-opportunity products, pricing sweet-spots, and review barriers." },
  { id: "KEYWORD", label: "Keyword Intelligence", icon: Hash, description: "Harvest empirical buyer terms, listing prevalence, and semantic intent clusters." },
  { id: "SHOP", label: "Shop & Seller Research", icon: Store, description: "Analyze competitor store leverage, catalog yield, and entry barriers." },
  { id: "CATEGORY", label: "Category Taxonomy", icon: FolderTree, description: "Explore marketplace category catalog yield, price distributions, and opportunity distributions." },
  { id: "NICHE", label: "Niche Discovery", icon: FolderTree, description: "Detect low-competition, high-demand product clusters." },
  { id: "RADAR", label: "Opportunity Radar", icon: Flame, description: "Cross-marketplace decision radar comparing opportunities across Etsy, Amazon, eBay, and Walmart." },
];

const AVAILABLE_MARKETPLACES: Array<{ id: MarketplaceId; label: string; icon: string }> = [
  { id: "etsy", label: "Etsy", icon: "🛍️" },
  { id: "amazon", label: "Amazon", icon: "📦" },
  { id: "ebay", label: "eBay", icon: "🏷️" },
  { id: "walmart", label: "Walmart", icon: "🏪" },
  { id: "tiktok_shop", label: "TikTok Shop", icon: "📱" },
];

type ProgressStage =
  | "IDLE"
  | "PREPARING"
  | "CHECKING_SOURCES"
  | "ACQUIRING_DATA"
  | "NORMALIZING"
  | "EVALUATING_INTELLIGENCE"
  | "PERSISTING"
  | "COMPLETED"
  | "FAILED";

export function ResearchClient({ initialRecentRuns, initialSourceHealth }: ResearchClientProps) {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<ResearchRunType>("PRODUCT");
  const [viewMode, setViewMode] = useState<"form" | "history" | "health" | "compare">("form");

  // Form Inputs
  const [query, setQuery] = useState<string>("");
  const [selectedMarketplace, setSelectedMarketplace] = useState<MarketplaceId>("etsy");
  const [selectedMarketplacesRadar, setSelectedMarketplacesRadar] = useState<MarketplaceId[]>(["etsy", "amazon", "ebay", "walmart"]);
  const [limit, setLimit] = useState<number>(25);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [bypassCache, setBypassCache] = useState<boolean>(false);

  // Execution & Progress State
  const [progressStage, setProgressStage] = useState<ProgressStage>("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<WorkbenchResearchResponse | null>(null);

  // History & Health State
  const [recentRuns, setRecentRuns] = useState<any[]>(initialRecentRuns || []);
  const [sourceHealth, setSourceHealth] = useState<any[]>(initialSourceHealth || []);

  // Comparison State
  const [compareRunIdA, setCompareRunIdA] = useState<string>("");
  const [compareRunIdB, setCompareRunIdB] = useState<string>("");
  const [compareResult, setCompareResult] = useState<any | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Marketplace Capability
  const capabilityMatrix = getMarketplaceCapabilityMatrix();
  const currentCapability = getMarketplaceCapability(selectedMarketplace);

  const handleRunResearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() && activeTab !== "CATEGORY") {
      setErrorMessage("Please enter a research query or seed term.");
      return;
    }

    setErrorMessage(null);
    setActiveReport(null);
    setProgressStage("PREPARING");

    const targetMarketplaces = activeTab === "RADAR" ? selectedMarketplacesRadar : [selectedMarketplace];

    try {
      setProgressStage("CHECKING_SOURCES");
      await new Promise((r) => setTimeout(r, 250));

      setProgressStage("ACQUIRING_DATA");
      const res = await fetch("/api/research/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab,
          query: query.trim(),
          marketplaces: targetMarketplaces,
          limit,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          bypassCache,
        }),
      });

      setProgressStage("NORMALIZING");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Research execution failed.");
      }

      setProgressStage("EVALUATING_INTELLIGENCE");
      await new Promise((r) => setTimeout(r, 200));

      setProgressStage("PERSISTING");
      setActiveReport(data);
      setProgressStage("COMPLETED");

      // Refresh recent runs list
      fetch("/api/research/runs?limit=10")
        .then((r) => r.json())
        .then((d) => {
          if (d.runs) setRecentRuns(d.runs);
        })
        .catch(() => {});
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to complete research run.");
      setProgressStage("FAILED");
    }
  };

  const handleOpenHistoricalRun = async (runId: string) => {
    try {
      const res = await fetch(`/api/research/runs/${runId}`);
      const data = await res.json();
      if (res.ok && data.run) {
        // Construct structured response
        const mappedResponse: WorkbenchResearchResponse = {
          runId: data.run.id,
          type: data.run.type,
          query: data.run.query,
          marketplaces: data.run.marketplaces,
          status: data.run.status,
          data: data.run.observations.map((o: any) => ({
            marketplace: o.marketplace,
            externalId: o.externalId,
            title: o.title,
            price: o.price,
            currency: o.currency,
            rating: o.rating,
            reviewCount: o.reviewCount,
            favoritesCount: o.favoritesCount,
            salesCount: o.salesCount,
            estimatedDemand: o.estimatedDemand,
            shop: { name: o.shopName, externalId: o.shopExternalId },
            categoryPath: o.categoryPath,
            url: o.sourceUrl,
            acquisitionMethod: o.sourceType,
            source: o.provenance,
            observedAt: o.observedAt,
            capturedAt: o.observedAt,
          })),
          sourcesUsed: data.run.sourcesUsed,
          itemCount: data.run.itemCount,
          liveCount: data.run.liveCount,
          historicalCount: data.run.historicalCount,
          freshnessStatus: data.run.freshnessStatus,
          confidence: data.run.confidence,
          durationMs: data.run.durationMs,
          isCached: true,
          limitations: [],
        };
        setActiveReport(mappedResponse);
        setViewMode("form");
        setActiveTab(data.run.type);
      }
    } catch (err: any) {
      setErrorMessage("Could not load historical run details.");
    }
  };

  const handleCompareRuns = async () => {
    if (!compareRunIdA || !compareRunIdB) {
      setErrorMessage("Please select two distinct research runs to compare.");
      return;
    }
    setIsComparing(true);
    setCompareResult(null);

    try {
      const res = await fetch("/api/research/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runIdA: compareRunIdA, runIdB: compareRunIdB }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to compare runs.");
      setCompareResult(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Comparison failed.");
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Research Center Banner & Top Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Ecommerce Research Center</h1>
            <Badge variant="success" className="text-[11px]">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Public Ingestion Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Empirical marketplace intelligence acquired directly from legitimate public data. No API credentials required.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("form")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              viewMode === "form" ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            New Research
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              viewMode === "history" ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted text-foreground"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History ({recentRuns.length})
          </button>
          <button
            onClick={() => setViewMode("compare")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              viewMode === "compare" ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted text-foreground"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare Runs
          </button>
          <button
            onClick={() => setViewMode("health")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              viewMode === "health" ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted text-foreground"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Source Health
          </button>
        </div>
      </div>

      {/* 2. Error Notice Banner */}
      {errorMessage && (
        <div className="p-4 border rounded-xl bg-destructive/10 border-destructive/20 text-destructive text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="font-bold text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* 3. VIEW MODE: RESEARCH FORM */}
      {viewMode === "form" && (
        <div className="space-y-6">
          {/* Research Type Selection Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {RESEARCH_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setActiveReport(null);
                    setErrorMessage(null);
                  }}
                  className={`p-3 text-left border rounded-xl flex flex-col justify-between transition-all ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary shadow-sm"
                      : "bg-card hover:bg-muted/50 border-border text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs block">{tab.label}</span>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{tab.description}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Research Form */}
          <Card className="p-6 border rounded-xl bg-card shadow-sm space-y-5">
            <form onSubmit={handleRunResearch} className="space-y-4">
              {/* Query & Marketplace Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Search Input */}
                <div className="lg:col-span-7 space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    {activeTab === "PRODUCT" && "Product / Niche Keywords"}
                    {activeTab === "KEYWORD" && "Seed Keyword Term"}
                    {activeTab === "SHOP" && "Shop Name, URL, or Identifier"}
                    {activeTab === "CATEGORY" && "Category / Taxonomy Term"}
                    {activeTab === "NICHE" && "Seed Niche Query"}
                    {activeTab === "RADAR" && "Cross-Marketplace Search Query"}
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={
                        activeTab === "PRODUCT"
                          ? "e.g. ceramic coffee mug, leather wallet, wall art..."
                          : activeTab === "KEYWORD"
                          ? "e.g. minimalist jewelry, personalized gift, linen dress..."
                          : activeTab === "SHOP"
                          ? "e.g. PlannerKate1, CatLoverStudio, or store URL..."
                          : activeTab === "CATEGORY"
                          ? "e.g. home decor, jewelry, clothing..."
                          : "e.g. wedding invitations, printable planners..."
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                    />
                  </div>
                </div>

                {/* Marketplace Picker */}
                {activeTab !== "RADAR" ? (
                  <div className="lg:col-span-5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">Target Marketplace</label>
                      <Badge variant={currentCapability.badgeVariant} className="text-[10px] py-0 px-1.5">
                        {currentCapability.statusLabel}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {AVAILABLE_MARKETPLACES.slice(0, 4).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMarketplace(m.id)}
                          className={`py-2 px-2 text-xs font-semibold border rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                            selectedMarketplace === m.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted text-foreground"
                          }`}
                        >
                          <span>{m.icon}</span>
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="lg:col-span-5 space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Radar Marketplaces (Parallel Fan-Out)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_MARKETPLACES.map((m) => {
                        const isIncluded = selectedMarketplacesRadar.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedMarketplacesRadar((prev) =>
                                isIncluded ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                              );
                            }}
                            className={`py-1.5 px-2.5 text-xs font-medium border rounded-lg flex items-center gap-1.5 transition-all ${
                              isIncluded
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            <span>{m.icon}</span>
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Filtering & Execution Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t text-xs">
                {/* Result Limit */}
                <div>
                  <span className="text-muted-foreground block font-medium mb-1">Result Limit</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full py-1.5 px-2 bg-background border rounded-lg font-semibold"
                  >
                    <option value={10}>10 Items (Fast)</option>
                    <option value={25}>25 Items (Standard)</option>
                    <option value={50}>50 Items (Deep)</option>
                  </select>
                </div>

                {/* Min Price */}
                <div>
                  <span className="text-muted-foreground block font-medium mb-1">Min Price ($)</span>
                  <input
                    type="number"
                    placeholder="Min $"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full py-1.5 px-2 bg-background border rounded-lg"
                  />
                </div>

                {/* Max Price */}
                <div>
                  <span className="text-muted-foreground block font-medium mb-1">Max Price ($)</span>
                  <input
                    type="number"
                    placeholder="Max $"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full py-1.5 px-2 bg-background border rounded-lg"
                  />
                </div>

                {/* Cache Bypass */}
                <div className="flex items-center gap-2 sm:col-span-2 pt-4">
                  <input
                    type="checkbox"
                    id="bypassCache"
                    checked={bypassCache}
                    onChange={(e) => setBypassCache(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="bypassCache" className="text-xs text-muted-foreground cursor-pointer">
                    Bypass cache & fetch fresh public data
                  </label>
                </div>

                {/* Submit Action */}
                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="submit"
                    disabled={progressStage !== "IDLE" && progressStage !== "COMPLETED" && progressStage !== "FAILED"}
                    className="w-full py-2 px-4 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {progressStage !== "IDLE" && progressStage !== "COMPLETED" && progressStage !== "FAILED" ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Run Research
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Marketplace Capability Transparency Footer */}
            {activeTab !== "RADAR" && currentCapability.limitations.length > 0 && (
              <div className="p-3 bg-muted/30 border rounded-lg text-[11px] text-muted-foreground flex items-start gap-2">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">{currentCapability.displayName} Public Web Capabilities:</strong>{" "}
                  {currentCapability.limitations.join(" ")}
                </div>
              </div>
            )}
          </Card>

          {/* Progress Indicator Timeline */}
          {progressStage !== "IDLE" && progressStage !== "COMPLETED" && progressStage !== "FAILED" && (
            <Card className="p-5 border rounded-xl bg-card space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-primary flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Executing Research Run...
                </span>
                <span className="text-muted-foreground">Deterministic Pipeline Stages</span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{
                    width:
                      progressStage === "PREPARING"
                        ? "15%"
                        : progressStage === "CHECKING_SOURCES"
                        ? "35%"
                        : progressStage === "ACQUIRING_DATA"
                        ? "60%"
                        : progressStage === "NORMALIZING"
                        ? "80%"
                        : progressStage === "EVALUATING_INTELLIGENCE"
                        ? "90%"
                        : "95%",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] text-muted-foreground pt-1">
                <span className={progressStage === "PREPARING" ? "text-primary font-bold" : ""}>1. Prepare</span>
                <span className={progressStage === "CHECKING_SOURCES" ? "text-primary font-bold" : ""}>2. Check Sources</span>
                <span className={progressStage === "ACQUIRING_DATA" ? "text-primary font-bold" : ""}>3. Public Ingestion</span>
                <span className={progressStage === "NORMALIZING" ? "text-primary font-bold" : ""}>4. Normalize</span>
                <span className={progressStage === "EVALUATING_INTELLIGENCE" ? "text-primary font-bold" : ""}>5. Scoring Engine</span>
                <span className={progressStage === "PERSISTING" ? "text-primary font-bold" : ""}>6. Report Generation</span>
              </div>
            </Card>
          )}

          {/* Active Research Report */}
          {activeReport && (
            <ResearchReportView
              report={activeReport}
              onRefresh={() => {
                setBypassCache(true);
                handleRunResearch();
              }}
            />
          )}
        </div>
      )}

      {/* 4. VIEW MODE: RESEARCH RUN HISTORY */}
      {viewMode === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Recent Research Runs</h2>
            <span className="text-xs text-muted-foreground">Showing {recentRuns.length} recorded runs</span>
          </div>

          {recentRuns.length === 0 ? (
            <Card className="p-12 text-center border rounded-xl bg-card">
              <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <h3 className="text-base font-semibold">No Research History Yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Run your first research to see historical runs recorded here.</p>
            </Card>
          ) : (
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Query</th>
                    <th className="p-3">Marketplaces</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Observations</th>
                    <th className="p-3">Confidence</th>
                    <th className="p-3">Freshness</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <Badge variant="neutral" className="text-[11px] font-bold">
                          {run.type}
                        </Badge>
                      </td>
                      <td className="p-3 font-semibold text-foreground">{run.query || "All Catalog"}</td>
                      <td className="p-3 capitalize">{run.marketplaces?.join(", ")}</td>
                      <td className="p-3">
                        <Badge variant={run.status === "COMPLETED" ? "success" : run.status === "PARTIAL" ? "warning" : "danger"}>
                          {run.status}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium">{run.itemCount} items</td>
                      <td className="p-3">{run.confidence}%</td>
                      <td className="p-3">{run.freshnessStatus}</td>
                      <td className="p-3 text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenHistoricalRun(run.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. VIEW MODE: COMPARE RESEARCH RUNS */}
      {viewMode === "compare" && (
        <div className="space-y-6">
          <Card className="p-6 border rounded-xl bg-card space-y-4 shadow-sm">
            <h2 className="text-base font-bold text-foreground">Longitudinal Research Comparison</h2>
            <p className="text-xs text-muted-foreground">
              Select two past research runs to compare appearing/disappearing products, price drops, review velocities, and opportunity shifts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Baseline Run (Run A)</label>
                <select
                  value={compareRunIdA}
                  onChange={(e) => setCompareRunIdA(e.target.value)}
                  className="w-full p-2 text-xs bg-background border rounded-lg font-medium"
                >
                  <option value="">Select baseline run...</option>
                  {recentRuns.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.type} &ldquo;{r.query}&rdquo; ({r.marketplaces?.join(",")}) — {new Date(r.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Comparison Run (Run B)</label>
                <select
                  value={compareRunIdB}
                  onChange={(e) => setCompareRunIdB(e.target.value)}
                  className="w-full p-2 text-xs bg-background border rounded-lg font-medium"
                >
                  <option value="">Select comparison run...</option>
                  {recentRuns.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.type} &ldquo;{r.query}&rdquo; ({r.marketplaces?.join(",")}) — {new Date(r.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleCompareRuns}
              disabled={isComparing || !compareRunIdA || !compareRunIdB}
              className="py-2 px-4 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isComparing ? "Comparing Runs..." : "Compare Selected Runs"}
            </button>
          </Card>

          {/* Comparison Output */}
          {compareResult && (
            <Card className="p-6 border rounded-xl bg-card space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-foreground">Comparison Summary & Deltas</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 border rounded-lg bg-emerald-500/10 border-emerald-500/20">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold block text-[11px]">New / Appearing</span>
                  <span className="font-bold text-foreground text-sm">{compareResult.appearingCount || 0} listings</span>
                </div>
                <div className="p-3 border rounded-lg bg-red-500/10 border-red-500/20">
                  <span className="text-red-700 dark:text-red-400 font-semibold block text-[11px]">Disappeared</span>
                  <span className="font-bold text-foreground text-sm">{compareResult.disappearingCount || 0} listings</span>
                </div>
                <div className="p-3 border rounded-lg bg-blue-500/10 border-blue-500/20">
                  <span className="text-blue-700 dark:text-blue-400 font-semibold block text-[11px]">Persisting</span>
                  <span className="font-bold text-foreground text-sm">{compareResult.persistingCount || 0} listings</span>
                </div>
                <div className="p-3 border rounded-lg bg-amber-500/10 border-amber-500/20">
                  <span className="text-amber-700 dark:text-amber-400 font-semibold block text-[11px]">Price Drops</span>
                  <span className="font-bold text-foreground text-sm">{compareResult.priceDropsCount || 0} items</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 6. VIEW MODE: SOURCE HEALTH MATRIX */}
      {viewMode === "health" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Acquisition Source Operational Health</h2>
            <span className="text-xs text-muted-foreground">Live metrics from SourceHealthTracker</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(capabilityMatrix).map((m) => {
              const liveHealth = sourceHealth.find((h) => h.marketplace === m.marketplace && h.sourceType === m.primaryAcquisitionMethod);
              return (
                <Card key={m.marketplace} className="p-5 border rounded-xl bg-card space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{m.icon}</span>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{m.displayName}</h3>
                        <span className="text-[11px] text-muted-foreground">{m.primaryAcquisitionMethod}</span>
                      </div>
                    </div>
                    <Badge variant={m.badgeVariant}>
                      {m.statusLabel}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Operational State</span>
                      <strong className="text-foreground">{liveHealth?.status || "HEALTHY"}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Avg Latency</span>
                      <strong className="text-foreground">{liveHealth?.latencyMs ? `${liveHealth.latencyMs}ms` : "—"}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Consecutive Errors</span>
                      <strong className="text-foreground">{liveHealth?.consecutiveFailures || 0}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground block">Supported Capabilities:</span>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {m.publicWebCapabilities.productSearch && <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">Product Search</span>}
                      {m.publicWebCapabilities.keywordDiscovery && <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">Keyword Discovery</span>}
                      {m.publicWebCapabilities.shopResearch && <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">Shop Research</span>}
                      {m.publicWebCapabilities.categoryDiscovery && <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">Category Taxonomy</span>}
                      {m.publicWebCapabilities.pricing && <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded">Pricing Extraction</span>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
