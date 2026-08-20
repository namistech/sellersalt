"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Hash,
  Store,
  FolderTree,
  Flame,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Star,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart2,
  RefreshCw,
  Globe,
  Radio,
  Database,
  Award,
} from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ResearchWorkbenchCard } from "./ResearchWorkbenchCard";
import { evaluateResearchQuality, type ResearchQualityReport } from "@/marketplaces/core/acquisition/research-quality";
import type { WorkbenchResearchResponse } from "@/marketplaces/core/acquisition/workbench";
import type { NormalizedProduct, NicheDiscoverySummary, CrossMarketplaceComparison } from "@/marketplaces/core/types";
import type { KeywordResearchSummary } from "@/marketplaces/core/acquisition/keywords";
import type { PublicShopResearchResult } from "@/marketplaces/core/acquisition/shops";
import type { PublicCategoryIntelligenceResult } from "@/marketplaces/core/acquisition/categories";

interface ResearchReportViewProps {
  report: WorkbenchResearchResponse;
  onRefresh?: () => void;
  className?: string;
}

export function ResearchReportView({ report, onRefresh, className = "" }: ResearchReportViewProps) {
  const [activeTab, setActiveTab] = useState<"observations" | "signals" | "provenance" | "diff">("observations");
  const [productFilter, setProductFilter] = useState<string>("");

  const qualityReport: ResearchQualityReport = evaluateResearchQuality({
    itemCount: report.itemCount,
    liveCount: report.liveCount,
    historicalCount: report.historicalCount,
    sourcesUsed: report.sourcesUsed,
    freshnessStatus: report.freshnessStatus,
    confidence: report.confidence,
    marketplaces: report.marketplaces,
    sampleProducts: report.type === "PRODUCT" && Array.isArray(report.data) ? (report.data as NormalizedProduct[]) : undefined,
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header & Primary Metadata */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {report.type} RESEARCH REPORT
            </span>
            <Badge variant={report.status === "COMPLETED" ? "success" : report.status === "PARTIAL" ? "warning" : "danger"}>
              {report.status}
            </Badge>
            <Badge variant={qualityReport.badgeVariant} className="text-[11px]">
              <Award className="w-3 h-3 mr-1" />
              {qualityReport.label} ({qualityReport.qualityScore}/100)
            </Badge>
            {report.isCached && (
              <Badge variant="neutral" className="text-[11px]">
                <Clock className="w-3 h-3 mr-1" />
                Cached Result
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>&ldquo;{report.query || "All Catalog"}&rdquo;</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
            <span>Marketplaces: <strong className="text-foreground capitalize">{report.marketplaces.join(", ")}</strong></span>
            <span>•</span>
            <span>Observations: <strong className="text-foreground">{report.itemCount} items</strong></span>
            <span>•</span>
            <span>Freshness: <strong className="text-foreground">{report.freshnessStatus}</strong></span>
            <span>•</span>
            <span>Confidence: <strong className="text-foreground">{report.confidence}%</strong></span>
            <span>•</span>
            <span>Duration: <strong className="text-foreground">{report.durationMs}ms</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-run Live
            </button>
          )}
        </div>
      </div>

      {/* 2. Source Strategy & Provenance Transparency Card */}
      <ResearchWorkbenchCard
        sourceType={report.sourcesUsed.includes("PUBLIC_WEB") ? "PUBLIC_WEB" : "HISTORICAL_OBSERVATION"}
        marketplace={report.marketplaces[0] || "etsy"}
        freshnessStatus={report.freshnessStatus}
        confidenceScore={report.confidence}
        diffSummary={report.diffSummary as any}
      />

      {/* 3. Navigation Sub-Tabs */}
      <div className="flex border-b space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("observations")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "observations"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Observations & Results ({report.itemCount})
        </button>
        <button
          onClick={() => setActiveTab("signals")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "signals"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Signal Intelligence & Economics
        </button>
        <button
          onClick={() => setActiveTab("provenance")}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === "provenance"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Provenance & Research Quality
        </button>
        {report.diffSummary && (
          <button
            onClick={() => setActiveTab("diff")}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === "diff"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Longitudinal Changes & Diffs
          </button>
        )}
      </div>

      {/* 4. Tab Contents */}
      {activeTab === "observations" && (
        <div className="space-y-4">
          {/* PRODUCT RESEARCH RESULTS */}
          {report.type === "PRODUCT" && (
            <ProductObservationsView products={report.data as NormalizedProduct[]} filter={productFilter} setFilter={setProductFilter} />
          )}

          {/* KEYWORD RESEARCH RESULTS */}
          {report.type === "KEYWORD" && (
            <KeywordObservationsView data={report.data as KeywordResearchSummary} />
          )}

          {/* SHOP RESEARCH RESULTS */}
          {report.type === "SHOP" && (
            <ShopObservationsView data={report.data as PublicShopResearchResult} />
          )}

          {/* CATEGORY RESEARCH RESULTS */}
          {report.type === "CATEGORY" && (
            <CategoryObservationsView data={report.data as PublicCategoryIntelligenceResult} />
          )}

          {/* NICHE RESEARCH RESULTS */}
          {report.type === "NICHE" && (
            <NicheObservationsView data={report.data as NicheDiscoverySummary} />
          )}

          {/* RADAR CROSS-MARKETPLACE RESULTS */}
          {report.type === "RADAR" && (
            <RadarObservationsView data={report.data} />
          )}
        </div>
      )}

      {activeTab === "signals" && (
        <div className="space-y-4">
          <SignalIntelligenceView report={report} />
        </div>
      )}

      {activeTab === "provenance" && (
        <div className="space-y-4">
          <DataProvenanceView report={report} qualityReport={qualityReport} />
        </div>
      )}

      {activeTab === "diff" && report.diffSummary && (
        <div className="space-y-4">
          <DiffSummaryView diff={report.diffSummary} />
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// PRODUCT OBSERVATIONS SUB-VIEW
// ----------------------------------------------------------------------------
function ProductObservationsView({
  products,
  filter,
  setFilter,
}: {
  products: NormalizedProduct[];
  filter: string;
  setFilter: (f: string) => void;
}) {
  if (!products || products.length === 0) {
    return (
      <div className="p-12 text-center border rounded-xl bg-card">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-base font-semibold">No Product Observations Found</h3>
        <p className="text-xs text-muted-foreground mt-1">
          The public web search returned 0 items. Try broadening your keyword query.
        </p>
      </div>
    );
  }

  const filtered = products.filter((p) =>
    !filter ? true : p.title.toLowerCase().includes(filter.toLowerCase()) || p.shop?.name?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter observed products..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Showing {filtered.length} of {products.length} observed products
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((prod, idx) => (
          <Card key={prod.externalId || idx} className="p-4 border rounded-xl bg-card flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              {/* Card Header: Marketplace + Opportunity Badge */}
              <div className="flex items-center justify-between">
                <Badge variant="neutral" className="capitalize text-[11px]">
                  {prod.marketplace}
                </Badge>
                {prod.opportunityScore && prod.opportunityScore.score !== null ? (
                  <Badge variant={prod.opportunityScore.score >= 75 ? "success" : prod.opportunityScore.score >= 50 ? "neutral" : "warning"}>
                    {prod.opportunityScore.score}/100 • {prod.opportunityScore.tier || "Score"}
                  </Badge>
                ) : (
                  <Badge variant="neutral">Score Unavailable</Badge>
                )}
              </div>

              {/* Title & Link */}
              <div>
                <a
                  href={prod.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm text-foreground hover:text-primary transition-colors line-clamp-2"
                >
                  {prod.title}
                </a>
                {prod.shop?.name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    by <strong className="text-foreground">{prod.shop.name}</strong>
                  </p>
                )}
              </div>

              {/* Price & Rating Row */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                <div>
                  <span className="text-muted-foreground block">Observed Price</span>
                  <span className="font-bold text-sm text-foreground">
                    {prod.price !== null && prod.price !== undefined ? `$${prod.price.toFixed(2)}` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Reviews & Rating</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 inline" />
                    {prod.rating !== null && prod.rating !== undefined ? prod.rating.toFixed(1) : "—"}
                    <span className="text-muted-foreground font-normal">
                      ({prod.reviewCount !== null && prod.reviewCount !== undefined ? prod.reviewCount.toLocaleString() : "0"})
                    </span>
                  </span>
                </div>
              </div>

              {/* Category Breadcrumbs */}
              {prod.categoryPath && prod.categoryPath.length > 0 && (
                <div className="text-[11px] text-muted-foreground pt-1 truncate">
                  Taxonomy: {prod.categoryPath.join(" › ")}
                </div>
              )}
            </div>

            {/* Card Footer: Provenance & Action Link */}
            <div className="pt-3 mt-3 border-t flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {prod.acquisitionMethod || "PUBLIC_WEB"}
              </span>
              {prod.url && (
                <a
                  href={prod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  View Listing <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// KEYWORD OBSERVATIONS SUB-VIEW
// ----------------------------------------------------------------------------
function KeywordObservationsView({ data }: { data: KeywordResearchSummary }) {
  if (!data || !data.topKeywords || data.topKeywords.length === 0) {
    return (
      <div className="p-12 text-center border rounded-xl bg-card">
        <Hash className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <h3 className="text-base font-semibold">No Keyword Observations</h3>
        <p className="text-xs text-muted-foreground mt-1">No empirical keywords were extracted from public listings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clusters */}
      {data.clusters && data.clusters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.clusters.map((c, i) => (
            <Card key={i} className="p-3 border rounded-xl bg-card text-xs space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">{c.theme}</span>
              <div className="font-bold text-foreground text-sm">{c.totalOccurrences} occurrences</div>
              <p className="text-muted-foreground truncate">{c.keywords.slice(0, 4).join(", ")}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Keywords Table */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
            <tr>
              <th className="p-3">Harvested Keyword Term</th>
              <th className="p-3">Listing Frequency (%)</th>
              <th className="p-3">Observed Average Price</th>
              <th className="p-3">Demand Proxy</th>
              <th className="p-3">Competition Proxy</th>
              <th className="p-3">Search Volume Feed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.topKeywords.map((kw, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-semibold text-foreground">{kw.keyword || kw.term}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{kw.listingFrequencyPercent}%</span>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${kw.listingFrequencyPercent}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="p-3 font-medium">
                  {kw.observedAveragePrice !== null && kw.observedAveragePrice !== undefined ? `$${kw.observedAveragePrice.toFixed(2)}` : "—"}
                </td>
                <td className="p-3">
                  <Badge variant={kw.demandProxyScore >= 70 ? "success" : "neutral"}>
                    {kw.demandProxyScore}/100
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge variant={kw.competitionProxy === "LOW" ? "success" : kw.competitionProxy === "HIGH" ? "warning" : "neutral"}>
                    {kw.competitionProxy}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">
                  <span className="text-[11px] bg-muted px-2 py-0.5 rounded font-mono">
                    Unavailable (Zero-Fabrication)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SHOP OBSERVATIONS SUB-VIEW
// ----------------------------------------------------------------------------
function ShopObservationsView({ data }: { data: PublicShopResearchResult }) {
  if (!data || !data.shop) {
    return (
      <div className="p-12 text-center border rounded-xl bg-card">
        <Store className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <h3 className="text-base font-semibold">Shop Data Unavailable</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shop Profile Header */}
      <Card className="p-5 border rounded-xl bg-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{data.shop.name}</h2>
            <p className="text-xs text-muted-foreground">
              Marketplace: <strong className="text-foreground capitalize">{data.marketplace}</strong>
            </p>
          </div>
          {data.competition && (
            <Badge variant={data.competition.score && data.competition.score >= 70 ? "success" : "neutral"} className="text-xs py-1 px-3">
              Competition Rating: {data.competition.score}/100
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t text-xs">
          <div>
            <span className="text-muted-foreground block">Active Listings</span>
            <span className="font-bold text-sm text-foreground">
              {data.shop.activeListings !== null && data.shop.activeListings !== undefined ? data.shop.activeListings : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Lifetime Reviews</span>
            <span className="font-bold text-sm text-foreground">
              {data.shop.reviewCount !== null && data.shop.reviewCount !== undefined ? data.shop.reviewCount.toLocaleString() : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Average Price</span>
            <span className="font-bold text-sm text-foreground">
              {data.priceRange?.average !== null && data.priceRange?.average !== undefined ? `$${data.priceRange.average?.toFixed(2)}` : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Total Sales</span>
            <span className="font-semibold text-xs text-muted-foreground italic">
              {(data.shop as any).salesCount !== null && (data.shop as any).salesCount !== undefined ? (data.shop as any).salesCount.toLocaleString() : "Sales data unavailable"}
            </span>
          </div>
        </div>
      </Card>

      {/* Sample Products */}
      {data.sampleProducts && data.sampleProducts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Observed Catalog Sample ({data.sampleProducts.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.sampleProducts.map((p, i) => (
              <Card key={i} className="p-3 border rounded-xl bg-card text-xs space-y-1">
                <p className="font-semibold truncate">{p.title}</p>
                <div className="flex justify-between text-muted-foreground">
                  <span>${p.price?.toFixed(2) || "—"}</span>
                  <span>{p.rating ? `★ ${p.rating.toFixed(1)}` : ""} ({p.reviewCount || 0})</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// CATEGORY OBSERVATIONS SUB-VIEW
// ----------------------------------------------------------------------------
function CategoryObservationsView({ data }: { data: PublicCategoryIntelligenceResult }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Card className="p-5 border rounded-xl bg-card space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{data.categoryName}</h2>
          <p className="text-xs text-muted-foreground">
            Marketplace: <strong className="text-foreground capitalize">{data.marketplace}</strong> • Catalog Sample: <strong className="text-foreground">{data.observedCatalogCount || data.totalListings} listings</strong>
          </p>
        </div>

        {/* Price Percentiles */}
        {data.priceDistribution && (
          <div className="pt-3 border-t space-y-2 text-xs">
            <span className="font-semibold text-muted-foreground">Price Distribution & Percentiles:</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-2 border rounded-lg bg-muted/30">
                <span className="text-muted-foreground block text-[11px]">Min Price</span>
                <span className="font-bold text-foreground">${data.priceDistribution.min?.toFixed(2) || "—"}</span>
              </div>
              <div className="p-2 border rounded-lg bg-muted/30">
                <span className="text-muted-foreground block text-[11px]">10th Percentile</span>
                <span className="font-bold text-foreground">${data.priceDistribution.percentile10?.toFixed(2) || "—"}</span>
              </div>
              <div className="p-2 border rounded-lg bg-primary/10 border-primary/20">
                <span className="text-primary font-semibold block text-[11px]">Median Price</span>
                <span className="font-bold text-foreground">${data.priceDistribution.median?.toFixed(2) || "—"}</span>
              </div>
              <div className="p-2 border rounded-lg bg-muted/30">
                <span className="text-muted-foreground block text-[11px]">90th Percentile</span>
                <span className="font-bold text-foreground">${data.priceDistribution.percentile90?.toFixed(2) || "—"}</span>
              </div>
              <div className="p-2 border rounded-lg bg-muted/30">
                <span className="text-muted-foreground block text-[11px]">Max Price</span>
                <span className="font-bold text-foreground">${data.priceDistribution.max?.toFixed(2) || "—"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Opportunity Distribution */}
        {data.opportunityDistribution && (
          <div className="pt-3 border-t space-y-2 text-xs">
            <span className="font-semibold text-muted-foreground">Opportunity Score Distribution:</span>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2.5 border rounded-lg bg-emerald-500/10 border-emerald-500/20">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold block text-[11px]">High Opportunity (&ge;80)</span>
                <span className="font-bold text-foreground text-sm">{data.opportunityDistribution.highOpportunityCount} items</span>
              </div>
              <div className="p-2.5 border rounded-lg bg-blue-500/10 border-blue-500/20">
                <span className="text-blue-700 dark:text-blue-400 font-semibold block text-[11px]">Moderate (65–79)</span>
                <span className="font-bold text-foreground text-sm">{data.opportunityDistribution.moderateOpportunityCount} items</span>
              </div>
              <div className="p-2.5 border rounded-lg bg-muted/50">
                <span className="text-muted-foreground font-semibold block text-[11px]">Competitive (&lt;65)</span>
                <span className="font-bold text-foreground text-sm">{data.opportunityDistribution.competitiveCount} items</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------------
// NICHE OBSERVATIONS SUB-VIEW
// ----------------------------------------------------------------------------
function NicheObservationsView({ data }: { data: NicheDiscoverySummary }) {
  if (!data || !data.niches || data.niches.length === 0) {
    return (
      <div className="p-12 text-center border rounded-xl bg-card">
        <FolderTree className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <h3 className="text-base font-semibold">No Niche Opportunities Identified</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.niches.map((niche: any, i: number) => (
        <Card key={i} className="p-5 border rounded-xl bg-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground">{niche.nicheName}</h3>
              <p className="text-xs text-muted-foreground">
                Category: {niche.categoryPath?.join(" › ") || "General"} • {niche.observedProductCount} products observed
              </p>
            </div>
            {niche.score !== null && niche.score !== undefined && (
              <Badge variant={niche.score >= 75 ? "success" : "neutral"} className="text-xs py-1 px-3">
                {niche.score}/100 • {niche.tier}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t text-xs">
            <div>
              <span className="text-muted-foreground block">Price Range</span>
              <span className="font-bold text-foreground">
                ${niche.pricing?.minPrice?.toFixed(0) || "0"} – ${niche.pricing?.maxPrice?.toFixed(0) || "0"} (Med: ${niche.pricing?.medianPrice?.toFixed(0) || "0"})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Daily Velocity</span>
              <span className="font-bold text-foreground">
                {niche.demand?.observedDailyVelocity !== null && niche.demand?.observedDailyVelocity !== undefined ? `~${niche.demand.observedDailyVelocity.toFixed(1)}/day` : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Review Barrier</span>
              <span className="font-bold text-foreground">
                {niche.competition?.medianReviews !== null && niche.competition?.medianReviews !== undefined ? `${niche.competition.medianReviews} reviews` : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Historical Momentum</span>
              <span className="font-semibold text-muted-foreground italic">
                {niche.momentum?.direction || "Unknown (Insufficient history)"}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// RADAR CROSS-MARKETPLACE SUB-VIEW
// ----------------------------------------------------------------------------
function RadarObservationsView({ data }: { data: any }) {
  const comparison = data?.comparison;
  if (!comparison) return null;

  const best = comparison.bestMarketplace || comparison.bestChannel;
  const evals = comparison.evaluations || comparison.channels || [];

  return (
    <div className="space-y-6">
      {/* Best Channel Recommendation */}
      {best && (
        <Card className="p-5 border border-primary/30 bg-primary/5 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Flame className="w-4 h-4" />
            BEST AVAILABLE CHANNEL: {(best.displayName || best.marketplace || "").toUpperCase()}
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            {best.reason || best.recommendationReason}
          </p>
          <div className="flex gap-4 text-xs pt-1">
            <span>Score: <strong>{best.opportunityScore}/100</strong></span>
            <span>Confidence: <strong>{best.confidence}%</strong></span>
            {(best.totalProductsCount || best.totalProducts) && (
              <span>Products: <strong>{best.totalProductsCount || best.totalProducts}</strong></span>
            )}
          </div>
        </Card>
      )}

      {/* Comparison Matrix */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
            <tr>
              <th className="p-3">Marketplace</th>
              <th className="p-3">Coverage Status</th>
              <th className="p-3">Observed Products</th>
              <th className="p-3">Opportunity Score</th>
              <th className="p-3">Confidence</th>
              <th className="p-3">Available Signals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {evals.map((ch: any, i: number) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <td className="p-3 font-bold uppercase text-foreground">{ch.displayName || ch.marketplace}</td>
                <td className="p-3">
                  <Badge variant={ch.status === "AVAILABLE" ? "success" : ch.status === "PARTIAL" ? "warning" : "danger"}>
                    {ch.status}
                  </Badge>
                </td>
                <td className="p-3 font-semibold">{ch.totalProductsCount ?? ch.totalProducts ?? (ch.products?.length > 0 ? ch.products.length : "—")}</td>
                <td className="p-3 font-bold">
                  {ch.opportunityScore !== null && ch.opportunityScore !== undefined ? `${ch.opportunityScore}/100` : "—"}
                </td>
                <td className="p-3">{ch.confidence !== null && ch.confidence !== undefined ? `${ch.confidence}%` : "—"}</td>
                <td className="p-3 text-muted-foreground">
                  {ch.availableSignals && ch.availableSignals.length > 0 ? ch.availableSignals.join(", ") : "None"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// SIGNAL INTELLIGENCE & ECONOMICS SUB-VIEW
// ----------------------------------------------------------------------------
function SignalIntelligenceView({ report }: { report: WorkbenchResearchResponse }) {
  return (
    <Card className="p-5 border rounded-xl bg-card space-y-4 text-xs">
      <h3 className="text-sm font-bold text-foreground">Unit Economics & Signal Breakdown</h3>
      <p className="text-muted-foreground leading-relaxed">
        SellerSalt decomposes market opportunity into 4 distinct empirical signal groups: Sales Velocity & Demand, Unit Economics & Margin, Incumbent Competition Barrier, and Market Freshness & Momentum.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="p-3 border rounded-lg bg-muted/20 space-y-1">
          <span className="font-semibold text-foreground block">1. Demand & Velocity (Weight: 35%)</span>
          <p className="text-muted-foreground">Derived from transaction pace, review accumulation, and active catalog engagement.</p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/20 space-y-1">
          <span className="font-semibold text-foreground block">2. Unit Economics & Margins (Weight: 25%)</span>
          <p className="text-muted-foreground">Calculates net take-home after marketplace-specific transaction and processing fees.</p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/20 space-y-1">
          <span className="font-semibold text-foreground block">3. Competition & Moat Barrier (Weight: 20%)</span>
          <p className="text-muted-foreground">Evaluates top incumbent review volume to assess entry barrier for new sellers.</p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/20 space-y-1">
          <span className="font-semibold text-foreground block">4. Market Momentum & Freshness (Weight: 20%)</span>
          <p className="text-muted-foreground">Measures listing recency and rapid conversion pace relative to listing age.</p>
        </div>
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// PROVENANCE & RESEARCH QUALITY SUB-VIEW
// ----------------------------------------------------------------------------
function DataProvenanceView({
  report,
  qualityReport,
}: {
  report: WorkbenchResearchResponse;
  qualityReport: ResearchQualityReport;
}) {
  return (
    <div className="space-y-6">
      {/* Quality Score Breakdown Card */}
      <Card className="p-5 border rounded-xl bg-card space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Research Quality & Dataset Trustworthiness
            </h3>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Evaluates empirical data completeness, observation volume, signal coverage, and provenance.
            </p>
          </div>
          <Badge variant={qualityReport.badgeVariant} className="text-xs py-1 px-2.5">
            {qualityReport.qualityScore}/100 • {qualityReport.qualityTier}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {qualityReport.factors.map((f) => (
            <div key={f.id} className="p-3 border rounded-lg bg-muted/20 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-foreground text-[11px]">{f.name}</span>
                <span className="font-semibold text-primary">{f.score}/{f.maxScore}</span>
              </div>
              <p className="text-muted-foreground text-[10px] leading-tight">{f.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* "How SellerSalt Got This Data" Source Acquisition Summary */}
      <Card className="p-5 border rounded-xl bg-card space-y-4 text-xs">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          How SellerSalt Acquired This Data
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 border rounded-lg bg-blue-500/5 border-blue-500/20 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              Primary Source: PUBLIC_WEB
            </div>
            <p className="text-muted-foreground text-[11px]">
              Direct legitimate public web observation. {report.liveCount} live observations captured.
            </p>
            <Badge variant="success" className="text-[10px]">Active & Verified</Badge>
          </div>

          <div className="p-3 border rounded-lg bg-muted/30 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Radio className="w-3.5 h-3.5 text-muted-foreground" />
              Secondary Source: MARKETPLACE_API
            </div>
            <p className="text-muted-foreground text-[11px]">
              {report.sourcesUsed.includes("MARKETPLACE_API") ? "Used for secondary metadata enrichment." : "Not required / Not used."}
            </p>
            <Badge variant={report.sourcesUsed.includes("MARKETPLACE_API") ? "success" : "neutral"} className="text-[10px]">
              {report.sourcesUsed.includes("MARKETPLACE_API") ? "Enriched" : "Optional / Unused"}
            </Badge>
          </div>

          <div className="p-3 border rounded-lg bg-muted/30 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Database className="w-3.5 h-3.5 text-muted-foreground" />
              Tertiary Fallback: HISTORICAL_DB
            </div>
            <p className="text-muted-foreground text-[11px]">
              {report.historicalCount > 0 ? `${report.historicalCount} historical observations utilized.` : "Not needed — real live data obtained."}
            </p>
            <Badge variant="neutral" className="text-[10px]">
              {report.historicalCount > 0 ? "Utilized" : "Unused"}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <h4 className="font-semibold text-foreground">Active Limitations for this Research Run:</h4>
          <ul className="space-y-1.5 list-disc pl-4 text-muted-foreground">
            {report.limitations && report.limitations.length > 0 ? (
              report.limitations.map((lim, i) => <li key={i}>{lim}</li>)
            ) : (
              <li>No specific limitations recorded for this run.</li>
            )}
            <li>Exact buyer monthly search volume is unavailable without licensed third-party volume provider feeds.</li>
            <li>Longitudinal deltas require at least 2 historical snapshots separated in time.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------------
// DIFF SUMMARY SUB-VIEW
// ----------------------------------------------------------------------------
function DiffSummaryView({ diff }: { diff: any }) {
  return (
    <Card className="p-5 border rounded-xl bg-card space-y-4 text-xs">
      <h3 className="text-sm font-bold text-foreground">Longitudinal Query Changes & Deltas</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 border rounded-lg bg-emerald-500/10 border-emerald-500/20">
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold block text-[11px]">New Listings</span>
          <span className="font-bold text-foreground text-sm">{diff.appearingCount}</span>
        </div>
        <div className="p-3 border rounded-lg bg-red-500/10 border-red-500/20">
          <span className="text-red-700 dark:text-red-400 font-semibold block text-[11px]">Disappeared Listings</span>
          <span className="font-bold text-foreground text-sm">{diff.disappearingCount}</span>
        </div>
        <div className="p-3 border rounded-lg bg-blue-500/10 border-blue-500/20">
          <span className="text-blue-700 dark:text-blue-400 font-semibold block text-[11px]">Persisting Listings</span>
          <span className="font-bold text-foreground text-sm">{diff.persistingCount}</span>
        </div>
        <div className="p-3 border rounded-lg bg-amber-500/10 border-amber-500/20">
          <span className="text-amber-700 dark:text-amber-400 font-semibold block text-[11px]">Price Drops Detected</span>
          <span className="font-bold text-foreground text-sm">{diff.priceDropsCount}</span>
        </div>
      </div>
    </Card>
  );
}
