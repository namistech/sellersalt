"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Store,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  Tag,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  DollarSign,
  Activity,
  Layers,
} from "lucide-react";
import { Card, Badge, Button, Heading, Text, Input } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import type { OwnShopIntelligenceReport, OwnListingHealthItem } from "@/services/own-shop-intelligence";
import { WhyThisMatters } from "@/components/intelligence/WhyThisMatters";

export interface StoreOperationsClientProps {
  report: OwnShopIntelligenceReport;
  organizationId: string;
}

export function StoreOperationsClient({ report, organizationId }: StoreOperationsClientProps) {
  const [selectedListing, setSelectedListing] = useState<OwnListingHealthItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "OPTIMIZATION" | "UNDERPERFORMING" | "HEALTHY">("ALL");

  const {
    shopName,
    healthScore,
    healthTier,
    healthTierLabel,
    actualData,
    estimatedMetrics,
    seoSummary,
    competitorBenchmark,
    underperformingListings,
    optimizationQueue,
    capabilities,
    primaryNextAction,
    isConnected,
  } = report;

  if (!isConnected) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
                <Store className="h-4 w-4" />
              </span>
              <Heading as="h1" size="h2" className="text-xl font-bold text-ink">
                Store Operations & Diagnostics
              </Heading>
            </div>
            <Text size="body-sm" className="text-ink-secondary mt-1">
              Connect your Etsy storefront to diagnose catalog health, discover missing tags, and boost organic visibility.
            </Text>
          </div>
        </div>

        {/* Actionable Empty State */}
        <Card padding="lg" className="border-line bg-white shadow-xs text-center py-16 px-6 max-w-2xl mx-auto space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-[#E7FAF1] text-[#0E8F5D] flex items-center justify-center mx-auto shadow-xs">
            <Store className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-ink">Connect your Etsy shop</h2>
            <p className="text-sm text-ink-secondary max-w-lg mx-auto leading-relaxed">
              Link your Etsy storefront to unlock real-time store health scores, missing tag analysis, underperforming listing alerts, and 1-click draft optimizations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-lg mx-auto pt-2">
            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-xs font-bold text-ink">1. Connect Store</div>
              <div className="text-[11px] text-ink-tertiary">Secure official OAuth 2.0 connection.</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-xs font-bold text-ink">2. Audit Catalog</div>
              <div className="text-[11px] text-ink-tertiary">Detect empty tag slots and title gaps.</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-xs font-bold text-ink">3. Boost Sales</div>
              <div className="text-[11px] text-ink-tertiary">Apply optimized keywords in Content Studio.</div>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/settings/channels">
              <Button variant="primary" size="default" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold text-sm px-6 py-2.5 shadow-sm">
                <Zap className="h-4 w-4 mr-2" /> Connect Etsy Shop
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Filter listings
  const allListings = [...underperformingListings, ...optimizationQueue];
  const uniqueListingsMap = new Map<string, OwnListingHealthItem>();
  for (const l of allListings) {
    uniqueListingsMap.set(l.id, l);
  }
  const catalog = Array.from(uniqueListingsMap.values());

  const filteredListings = catalog.filter((l) => {
    if (searchQuery && !l.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterTab === "OPTIMIZATION") return l.status === "NEEDS_OPTIMIZATION";
    if (filterTab === "UNDERPERFORMING") return l.isUnderperforming;
    if (filterTab === "HEALTHY") return !l.isUnderperforming;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
              <Store className="h-4 w-4" />
            </span>
            <Heading as="h1" size="h2" className="text-xl font-bold text-ink">
              Store Operations & Diagnostics
            </Heading>
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>
          <Text size="body-sm" className="text-ink-secondary mt-1">
            First-class operating loop for <strong className="text-ink">{shopName}</strong>. Identify catalog bottlenecks, tag gaps, and optimization actions.
          </Text>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/connectors">
            <Button variant="secondary" size="default" className="text-xs font-semibold">
              Connector Diagnostics
            </Button>
          </Link>
          <Link href="/studio">
            <Button variant="primary" size="default" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Open Content Studio
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Section: Store Health Hero & Primary Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Store Health Card */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-ink-tertiary">
              Store Health Index
            </div>
            <DataProvenanceBadge type="SELLERSALT_SCORE" />
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold font-mono text-ink tracking-tight">
              {healthScore}
            </span>
            <span className="text-sm font-semibold text-ink-tertiary">/100</span>
            <Badge
              variant={healthScore >= 80 ? "neutral" : healthScore >= 60 ? "gold" : "danger"}
              className="text-xs font-bold"
            >
              {healthTier}
            </Badge>
          </div>

          <p className="text-xs text-ink-secondary leading-relaxed">
            {healthTierLabel}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-line-subtle text-xs">
            <div>
              <span className="text-[10px] text-ink-tertiary">Active Listings</span>
              <div className="font-bold font-mono text-ink mt-0.5">
                {actualData.activeListingsCount}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-ink-tertiary">13-Tag Coverage</span>
              <div className="font-bold font-mono text-[#0E8F5D] mt-0.5">
                {seoSummary.perfect13TagListingsCount}/{actualData.activeListingsCount} full
              </div>
            </div>
          </div>
        </Card>

        {/* Primary Next Action Banner */}
        <Card padding="lg" className="lg:col-span-2 border-line bg-[#F9FBF9] border-l-4 border-l-[#0E8F5D] shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0E8F5D]">
                <Zap className="h-4 w-4" /> Top Next Best Action
              </span>
              <Badge variant="gold" className="text-[10px] uppercase font-bold">
                {primaryNextAction.urgency} Urgency
              </Badge>
            </div>

            <h2 className="text-base font-bold text-ink">
              {primaryNextAction.headline}
            </h2>

            <WhyThisMatters action={primaryNextAction} />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-tertiary">
              Estimated Impact: <strong className="text-ink">{primaryNextAction.scoreImpactEstimated}</strong>
            </span>
            <Link href={primaryNextAction.actionHref || "/studio"}>
              <Button size="default" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-semibold">
                {primaryNextAction.actionLabel} →
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Mid Section: Catalog Diagnostic Queues */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heading as="h2" size="h3" className="text-base font-bold text-ink">
              Catalog Optimization Queue
            </Heading>
            <Badge variant="neutral" className="text-xs font-mono">
              {filteredListings.length} listings
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog listings..."
                className="pl-8 h-8 text-xs"
              />
              <Search className="h-3.5 w-3.5 text-ink-tertiary absolute left-2.5 top-2.5 pointer-events-none" />
            </div>

            <div className="flex rounded-lg border border-line bg-white p-0.5 text-xs">
              <button
                onClick={() => setFilterTab("ALL")}
                className={`px-3 py-1 rounded-md font-semibold transition ${filterTab === "ALL" ? "bg-ink text-white" : "text-ink-secondary hover:text-ink"}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterTab("OPTIMIZATION")}
                className={`px-3 py-1 rounded-md font-semibold transition ${filterTab === "OPTIMIZATION" ? "bg-ink text-white" : "text-ink-secondary hover:text-ink"}`}
              >
                Needs Tag Fix ({seoSummary.listingsWithTagGapsCount})
              </button>
              <button
                onClick={() => setFilterTab("UNDERPERFORMING")}
                className={`px-3 py-1 rounded-md font-semibold transition ${filterTab === "UNDERPERFORMING" ? "bg-ink text-white" : "text-ink-secondary hover:text-ink"}`}
              >
                Trailing ({underperformingListings.length})
              </button>
            </div>
          </div>
        </div>

        {/* Listings Table */}
        <div className="border border-line rounded-xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAFAF8] border-b border-line text-ink-tertiary font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Listing Title</th>
                <th className="p-3.5">Price</th>
                <th className="p-3.5">Tags Used</th>
                <th className="p-3.5">SEO Score</th>
                <th className="p-3.5">Daily Sales</th>
                <th className="p-3.5">Primary Issue / Diagnostic</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {filteredListings.map((item) => (
                <tr key={item.id} className="hover:bg-surface-muted transition">
                  <td className="p-3.5 font-bold text-ink max-w-xs">
                    <div className="truncate" title={item.title}>
                      {item.title}
                    </div>
                    <div className="text-[10px] text-ink-tertiary font-mono mt-0.5">
                      ID: {item.listingId}
                    </div>
                  </td>
                  <td className="p-3.5 font-mono font-bold text-ink">
                    ${item.price.toFixed(2)}
                  </td>
                  <td className="p-3.5">
                    <span className={`font-mono font-bold ${item.tagsCount === 13 ? "text-[#0E8F5D]" : "text-[#D97706]"}`}>
                      {item.tagsCount}/13
                    </span>
                    {item.tagSlotsRemaining > 0 && (
                      <span className="text-[10px] text-[#D97706] ml-1.5 font-medium">
                        ({item.tagSlotsRemaining} slots empty)
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 font-mono font-bold text-ink">
                    {item.seoScore}/100
                  </td>
                  <td className="p-3.5 font-mono font-semibold text-ink-secondary">
                    {item.estDailySales.toFixed(1)}/day
                  </td>
                  <td className="p-3.5 text-ink-secondary max-w-xs text-[11px]">
                    {item.underperformanceReason || "Healthy tag utilization and search indexation."}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => setSelectedListing(item)}
                        className="text-xs"
                      >
                        Inspect
                      </Button>
                      <Link href={`/studio?draftTitle=${encodeURIComponent(item.title)}`}>
                        <Button
                          size="compact"
                          className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-semibold"
                        >
                          Fix Now
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Listing Detail Inspection Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-line p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-tertiary">
                  Listing Diagnostic & SEO Health
                </span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>
              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                className="p-1 text-ink-tertiary hover:text-ink rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-bold text-ink">
                {selectedListing.title}
              </h2>

              <div className="grid grid-cols-3 gap-3 text-xs bg-[#FAFAF8] p-3 rounded-xl border border-line-subtle">
                <div>
                  <span className="text-[10px] text-ink-tertiary">Listing Price</span>
                  <div className="font-bold font-mono text-ink mt-0.5">
                    ${selectedListing.price.toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-ink-tertiary">Tags Populated</span>
                  <div className="font-bold font-mono text-ink mt-0.5">
                    {selectedListing.tagsCount}/13 tags
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-ink-tertiary">SEO Score</span>
                  <div className="font-bold font-mono text-[#0E8F5D] mt-0.5">
                    {selectedListing.seoScore}/100
                  </div>
                </div>
              </div>

              {/* Actionable Next Best Action */}
              <div className="p-3 bg-[#F9FBF9] border border-[#0E8F5D]/20 rounded-xl space-y-2">
                <div className="text-xs font-bold text-[#0E8F5D] flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Recommended Fix
                </div>
                <div className="text-xs text-ink">
                  {selectedListing.nextAction.whyYouShouldCare}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="default"
                onClick={() => setSelectedListing(null)}
                className="text-xs"
              >
                Close
              </Button>
              <Link href={`/studio?draftTitle=${encodeURIComponent(selectedListing.title)}`}>
                <Button
                  variant="primary"
                  size="default"
                  className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-semibold"
                >
                  Optimize in Studio →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
