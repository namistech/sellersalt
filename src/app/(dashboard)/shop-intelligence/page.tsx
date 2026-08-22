"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Radar,
  TrendingUp,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  History,
  Store,
  Sparkles,
  Zap,
  ShieldCheck,
  Layers,
  ArrowRight,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShoppingBag,
  Bell,
  ChevronRight,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/shell";
import {
  Card,
  Input,
  Button,
  Badge,
  Alert,
  Heading,
  Text,
  Eyebrow,
  IntelligenceCard,
  ViewSwitch,
  Dialog,
  Avatar,
  HowItWorksGuide,
  HowItWorksToggle,
  type ViewMode,
} from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import {
  BarChart,
  LineChart,
  Sparkline,
  MiniTrend,
  ProgressMeter,
} from "@/components/data/charts";
import {
  fetchTrackedShops,
  stopTrackingShop,
  fetchTrackingQuota,
  fetchTrackedShopHistory,
} from "@/services/tracking-client";
import { resolveResearchShopUrl } from "@/services/researchShops";
import type { TrackedShopSummary, TrackingQuotaInfo } from "@/types/tracking";
import { useResearchState } from "@/lib/research-persistence";
import { scoreShopCompetition } from "@/marketplaces/core/opportunity-engine";

// Curated high-potential shops worth watching as inspiration
const SHOPS_WORTH_WATCHING = [
  {
    shopExternalId: "11482019",
    shopName: "ModPawsPrints",
    category: "Pet Portraits & Custom Art",
    sales: 18450,
    velocity: 6.2,
    verdict: "Easy to Compete",
    badgeVariant: "success" as const,
    reason: "Low catalog size (42 listings) generating high sales velocity (~6.2/day).",
  },
  {
    shopExternalId: "22910481",
    shopName: "NorthCraftStudio",
    category: "Minimalist Laser Cut Wood",
    sales: 9820,
    velocity: 4.8,
    verdict: "Easy to Compete",
    badgeVariant: "success" as const,
    reason: "Young shop (14 months) with accessible 340 review threshold.",
  },
  {
    shopExternalId: "33190284",
    shopName: "PaperLoomStudio",
    category: "Digital Wedding Templates",
    sales: 34200,
    velocity: 8.5,
    verdict: "Moderate Barrier",
    badgeVariant: "warning" as const,
    reason: "Strong digital margin profile with repeatable template bundles.",
  },
];

export default function ShopIntelligencePage() {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Tracked data
  const [shops, setShops] = useState<TrackedShopSummary[]>([]);
  const [quota, setQuota] = useState<TrackingQuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View Controls & Filtering
  const [viewMode, setViewMode] = useResearchState<ViewMode>("shop_intelligence_view_mode", "grid");
  const [filterQuery, setFilterQuery] = useState("");

  // History Drawer Dialog
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function loadTrackedData() {
    setLoading(true);
    setError(null);
    try {
      const [shopList, quotaData] = await Promise.all([
        fetchTrackedShops(),
        fetchTrackingQuota(),
      ]);
      setShops(shopList);
      setQuota(quotaData);
    } catch (err: any) {
      setError(err.message || "Failed to load tracked shops.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrackedData();
  }, []);

  async function handleAddShop(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      // 1. Resolve shop URL to external ID & name
      const resolved = await resolveResearchShopUrl(urlInput.trim());
      const shopExternalId = resolved.shopExternalId;
      const shopName = resolved.shopName || `Shop ${shopExternalId}`;

      // 2. Add to tracking
      const res = await fetch(`/api/shops/${shopExternalId}/track`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to start tracking shop.");
      }

      setSubmitSuccess(`Started tracking ${shopName}. First snapshot captured!`);
      setUrlInput("");
      await loadTrackedData();
    } catch (err: any) {
      setSubmitError(err.message || "Could not track that shop URL.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStopTracking(shopExternalId: string, shopName: string) {
    if (!confirm(`Are you sure you want to stop tracking ${shopName}?`)) return;
    try {
      await stopTrackingShop(shopExternalId);
      setShops((prev) => prev.filter((s) => s.shopExternalId !== shopExternalId));
      if (quota) {
        setQuota({ ...quota, trackedShopsCount: Math.max(0, quota.trackedShopsCount - 1) });
      }
    } catch (err: any) {
      alert("Failed to stop tracking: " + err.message);
    }
  }

  async function openHistoryModal(shopExternalId: string) {
    setLoadingHistory(true);
    try {
      const history = await fetchTrackedShopHistory(shopExternalId);
      setSelectedHistory(history);
    } catch (err: any) {
      alert("Failed to load historical snapshots: " + err.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  // Derived intelligence stats
  const totalTracked = shops.length;
  const topGainer = [...shops].sort((a, b) => (b.deltas.salesDelta7d ?? 0) - (a.deltas.salesDelta7d ?? 0))[0];
  const fastestVelocity = [...shops].sort((a, b) => b.velocity.estDailySales - a.velocity.estDailySales)[0];
  const avg7dSales =
    totalTracked > 0
      ? Math.round(shops.reduce((acc, s) => acc + (s.deltas.salesDelta7d ?? 0), 0) / totalTracked)
      : 0;

  const filteredShops = shops.filter((s) =>
    s.shopName.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <Heading as="h1" size="h2">
            Market Research &amp; Shop Radar
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-1">
            Analyze verified public sales deltas, catalog additions, and review velocity across market segments.
          </Text>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          {quota && (
            <div className="px-3 py-1.5 rounded-lg bg-surface border border-line shadow-2xs">
              <span className="text-ink-tertiary">Tracked Slots:</span>{" "}
              <strong className="text-ink tabular-nums">
                {quota.trackedShopsCount} / {quota.maxTrackedShops}
              </strong>
            </div>
          )}
          <HowItWorksToggle isOpen={showGuide} onToggle={() => setShowGuide(!showGuide)} />
          <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
        </div>
      </div>

      {error && (
        <Alert variant="danger" title="Market Research Notice">
          {error}
        </Alert>
      )}

      {/* Expandable Guide */}
      <HowItWorksGuide
        isOpen={showGuide}
        onToggle={() => setShowGuide(!showGuide)}
        title="How Market Research Radar Works"
        description="SellerSalt analyzes public marketplace benchmarks for Etsy shops to reveal real daily transaction deltas, catalog additions, and review velocity."
        steps={[
          {
            title: "1. Paste Shop Link",
            description: "Enter any Etsy store URL (e.g. etsy.com/shop/ShopName) or the bare shop name to begin.",
            badge: "Instant Setup",
          },
          {
            title: "2. Initial Snapshot Capture",
            description: "SellerSalt immediately captures the current verified sales count, active listing inventory, and review total.",
            badge: "Immediate",
          },
          {
            title: "3. Periodic Benchmark Refresh",
            description: "Our background engine checks public benchmarks periodically to detect breakouts, sales spikes, and inventory trends.",
            badge: "Periodic",
          },
        ]}
      />

      {/* ==================================================================== */}
      {/* SECTION 1: TOP DARK INTELLIGENCE DECISION SURFACE */}
      {/* ==================================================================== */}
      {totalTracked > 0 ? (
        <IntelligenceCard
          contextTheme="shop"
          badgeText="MARKET RESEARCH INTELLIGENCE"
          badgeIcon={<Radar className="h-3.5 w-3.5 text-[#FBBF24]" />}
          title={
            topGainer && (topGainer.deltas.salesDelta7d ?? 0) > 0
              ? `Which shop is accelerating fastest? (${topGainer.shopName} +${topGainer.deltas.salesDelta7d} orders/7d)`
              : "Market Portfolio Benchmarks Overview"
          }
          score={fastestVelocity ? Math.min(99, Math.max(50, Math.round(fastestVelocity.velocity.estDailySales * 12))) : 82}
          scoreMax={100}
          verdictLabel={
            topGainer?.velocity.isSpike
              ? `⚡ ${topGainer.shopName} — Breakout Spike`
              : topGainer
              ? `${topGainer.shopName} — Momentum Leader`
              : "Tracking Active"
          }
          verdictVariant={topGainer?.velocity.isSpike ? "warning" : "success"}
          provenance="ACTUAL_ETSY_DATA"
          description={`Currently analyzing ${totalTracked} research benchmark store${totalTracked === 1 ? "" : "s"}. Average 7-day sales growth across your portfolio is +${avg7dSales} orders. Snapshots are recorded automatically to reveal demand patterns.`}
          sidePanel={
            <div className="space-y-3">
              <div className="text-label-sm font-bold text-[#9EAA9F] uppercase tracking-wider">
                Market Benchmarks
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#9EAA9F]">Active Monitored Stores:</span>
                  <span className="font-bold text-white tabular-nums">{totalTracked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9EAA9F]">Fastest Growing Benchmark:</span>
                  <span className="font-bold text-[#16C784] truncate max-w-[140px]">
                    {topGainer?.shopName ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9EAA9F]">Avg. 7-Day Growth:</span>
                  <span className="font-bold text-white tabular-nums">+{avg7dSales} orders</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9EAA9F]">Tracking Cadence:</span>
                  <span className="font-bold text-[#16C784]">Every 6 Hours</span>
                </div>
              </div>
            </div>
          }
        >
          {/* Shops Worth Watching Sub-Panel on Dark Attention Surface */}
          <div className="pt-2 space-y-2.5">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#FBBF24]" /> High-Opportunity Shops Worth Watching:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SHOPS_WORTH_WATCHING.map((s) => (
                <div
                  key={s.shopExternalId}
                  className="p-3 rounded-xl bg-[#1C261F] border border-[#2A362D] space-y-1.5 text-xs hover:border-[#16C784]/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/shops/${s.shopExternalId}`}
                      className="font-bold text-white hover:text-[#16C784] transition-colors truncate"
                    >
                      {s.shopName}
                    </Link>
                    <Badge variant={s.badgeVariant} tone="dark" className="text-label-sm px-1.5 py-0">
                      {s.verdict}
                    </Badge>
                  </div>
                  <div className="text-meta text-[#9EAA9F]">{s.category}</div>
                  <div className="text-meta text-[#A5B2A6] leading-tight pt-1 border-t border-[#2A362D]">
                    {s.reason}
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-label-sm text-[#16C784] font-bold tabular-nums">~{s.velocity}/day</span>
                    <Link
                      href={`/shops/${s.shopExternalId}`}
                      className="text-label-sm text-[#16C784] hover:underline font-bold inline-flex items-center gap-0.5"
                    >
                      Research <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </IntelligenceCard>
      ) : (
        /* Empty State on Dark Attention Surface (Contextual & Actionable) */
        <div className="p-6 sm:p-8 rounded-2xl bg-[#141B16] border border-[#2A362D] text-white shadow-md space-y-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1C261F] border border-[#2A362D] text-xs font-bold text-[#FBBF24]">
                <Radar className="h-3.5 w-3.5" /> Start Market Research
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Track a shop for research benchmarks
              </h2>
              <p className="text-xs sm:text-sm text-[#9EAA9F] leading-relaxed">
                Paste an Etsy shop link below and SellerSalt will capture the latest verified shop data immediately, then continue monitoring sales, inventory, and review changes periodically.
              </p>
              <div className="text-xs text-[#16C784] font-semibold pt-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> We&apos;ll capture your first snapshot immediately.
              </div>
            </div>

            <div className="w-full lg:w-auto shrink-0">
              <a
                href="#add-competitor-form"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#16C784] hover:bg-[#13AD73] text-[#141B16] font-bold text-sm shadow-md transition-all w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" /> Track a Shop for Research
              </a>
            </div>
          </div>

          {/* Suggested Starter Shops */}
          <div className="pt-4 border-t border-[#2A362D] space-y-3">
            <div className="text-xs font-bold text-[#9EAA9F] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#FBBF24]" /> Or explore high-opportunity stores worth watching:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SHOPS_WORTH_WATCHING.map((s) => (
                <div
                  key={s.shopExternalId}
                  className="p-3 rounded-xl bg-[#1C261F] border border-[#2A362D] space-y-1.5 text-xs hover:border-[#16C784]/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/shops/${s.shopExternalId}`}
                      className="font-bold text-white hover:text-[#16C784] transition-colors truncate"
                    >
                      {s.shopName}
                    </Link>
                    <Badge variant={s.badgeVariant} tone="dark" className="text-label-sm px-1.5 py-0">
                      {s.verdict}
                    </Badge>
                  </div>
                  <div className="text-meta text-[#9EAA9F]">{s.category}</div>
                  <div className="text-meta text-[#A5B2A6] leading-tight pt-1 border-t border-[#2A362D]">
                    {s.reason}
                  </div>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-label-sm text-[#16C784] font-bold tabular-nums">~{s.velocity}/day</span>
                    <Link
                      href={`/shops/${s.shopExternalId}`}
                      className="text-label-sm text-[#16C784] hover:underline font-bold inline-flex items-center gap-0.5"
                    >
                      Research <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 2: TRACK SHOP FORM */}
      {/* ==================================================================== */}
      <Card id="add-competitor-form" padding="lg" className="border-line bg-white shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#0E8F5D]" /> Add a Shop to Research Benchmarks
          </h3>
          <p className="text-xs text-ink-tertiary mt-0.5">
            SellerSalt will fetch the latest verified public data immediately and track sales &amp; catalog momentum.
          </p>
        </div>

        <form onSubmit={handleAddShop} className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="flex-1">
            <Input
              placeholder="Paste Etsy shop link (e.g. https://www.etsy.com/shop/ModPawsPrints) or shop name"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              required
              className="text-xs"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={submitting || !urlInput.trim()}
            className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold text-xs shrink-0"
          >
            {submitting ? "Fetching Shop Data…" : "Start Research Tracking"}
          </Button>
        </form>

        {submitError && <Alert variant="danger">{submitError}</Alert>}
        {submitSuccess && <Alert variant="success">{submitSuccess}</Alert>}
      </Card>

      {/* ==================================================================== */}
      {/* SECTION 3: TRACKED SHOPS LISTING */}
      {/* ==================================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Heading as="h2" size="h4">
              Monitored Research Shops ({filteredShops.length})
            </Heading>
            <p className="text-xs text-ink-tertiary">
              Continuous snapshot records &amp; longitudinal delta tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-48 sm:w-60">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary" />
              <input
                type="text"
                placeholder="Filter tracked shops…"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-line bg-surface focus:border-accent focus:outline-none"
              />
            </div>
            <ViewSwitch value={viewMode} onChange={setViewMode} modes={["grid", "table"]} />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-xs text-ink-tertiary">
            <div className="animate-spin h-6 w-6 border-2 border-[#0E8F5D] border-t-transparent rounded-full mx-auto mb-2" />
            Loading market research records…
          </div>
        ) : filteredShops.length === 0 ? (
          <Card padding="lg" className="border-line bg-white shadow-xs text-center py-12 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[#E7FAF1] text-[#0E8F5D] flex items-center justify-center mx-auto shadow-2xs">
              <Radar className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-sm text-ink">No monitored stores match your filter</h4>
            <p className="text-xs text-ink-tertiary max-w-sm mx-auto">
              Paste any Etsy shop URL above to start automatic 6-hour tracking and breakout spike detection.
            </p>
          </Card>
        ) : viewMode === "grid" ? (
          /* Large Research Cards (Grid View) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredShops.map((shop) => {
              const competitionEvaluation = scoreShopCompetition({
                marketplace: "etsy",
                shopName: shop.shopName,
                totalSales: shop.latestSnapshot?.totalSales ?? 0,
                reviewCount: shop.latestSnapshot?.reviewCount ?? 0,
                activeListings: shop.latestSnapshot?.activeListings ?? 1,
                shopAgeMonths: 24,
                estDailySales: shop.velocity.estDailySales,
              });

              const compScore = competitionEvaluation.score ?? 50;
              const verdictLabel = compScore >= 75 ? "Emerging Winner" : compScore >= 45 ? "Moderate Barrier" : "High Barrier";

              return (
                <Card
                  key={shop.id}
                  padding="md"
                  className="border-line bg-white shadow-xs flex flex-col justify-between space-y-4 hover:border-[#0E8F5D]/30 transition-all"
                >
                  {/* Top Bar: Avatar & Title */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={shop.shopName} size="md" status={shop.health === "HEALTHY" ? "active" : "inactive"} />
                        <div className="min-w-0">
                          <Link
                            href={`/shops/${shop.shopExternalId}`}
                            className="font-bold text-sm text-ink hover:text-[#0E8F5D] transition-colors truncate block"
                          >
                            {shop.shopName}
                          </Link>
                          <div className="text-meta text-ink-tertiary">
                            Tracking since {new Date(shop.trackingSince).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {shop.velocity.isSpike && (
                          <Badge variant="warning" className="text-label-sm">
                            ⚡ Spike
                          </Badge>
                        )}
                        <Badge variant={shop.health === "HEALTHY" ? "success" : "neutral"}>
                          {shop.health === "HEALTHY" ? "Active" : "Pending 2nd snap"}
                        </Badge>
                      </div>
                    </div>

                    {/* Strategic Competition Verdict */}
                    <div className="p-2.5 rounded-lg bg-[#FAFAF8] border border-line-subtle flex items-center justify-between text-sm">
                      <div>
                        <span className="text-label-sm font-bold text-ink-tertiary uppercase block">Strategic Verdict</span>
                        <span className="font-bold text-ink">{verdictLabel}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-label-sm font-bold text-ink-tertiary uppercase block">Opportunity</span>
                        <span className="font-bold text-[#0E8F5D] tabular-nums">{compScore}/100</span>
                      </div>
                    </div>

                    {/* Core Metric Delta Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="p-2 rounded-lg bg-surface-muted">
                        <span className="text-meta text-ink-tertiary block">6h Delta</span>
                        <span className="font-bold text-[#0E8F5D] tabular-nums">
                          +{shop.deltas.salesDelta6h ?? 0}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-muted">
                        <span className="text-meta text-ink-tertiary block">24h Delta</span>
                        <span className="font-bold text-ink tabular-nums">
                          +{shop.deltas.salesDelta24h ?? shop.deltas.salesDeltaToday ?? 0}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-muted">
                        <span className="text-meta text-ink-tertiary block">7d Delta</span>
                        <span className="font-bold text-[#0E8F5D] tabular-nums">
                          +{shop.deltas.salesDelta7d ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Summary Row */}
                    <div className="space-y-1.5 text-sm text-ink-secondary pt-1">
                      <div className="flex justify-between">
                        <span>Lifetime Sales [ACTUAL]:</span>
                        <span className="font-bold text-ink tabular-nums">
                          {shop.latestSnapshot?.totalSales?.toLocaleString() ?? "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Catalog Listings:</span>
                        <span className="font-bold text-ink tabular-nums">
                          {shop.latestSnapshot?.activeListings ?? "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Daily Sales Velocity [EST]:</span>
                        <span className="font-bold text-[#0E8F5D] tabular-nums">
                          ~{shop.velocity.estDailySales.toFixed(1)} / day
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer Reviews:</span>
                        <span className="font-bold text-ink tabular-nums">
                          {shop.latestSnapshot?.reviewCount.toLocaleString() ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar (Internal Research First) */}
                  <div className="pt-3 border-t border-line-subtle flex items-center justify-between gap-2">
                    <Link href={`/shops/${shop.shopExternalId}`} className="flex-1">
                      <Button variant="primary" size="compact" className="w-full bg-[#0E8F5D] hover:bg-[#0C7A52] text-sm font-bold text-white">
                        Analyze Listings
                      </Button>
                    </Link>

                    <Link
                      href={`/keyword-research?query=${encodeURIComponent(shop.shopName)}`}
                      className="p-1.5 rounded-lg border border-line bg-[#FAFAF8] hover:bg-[#E7FAF1] text-ink hover:text-[#0E8F5D] text-sm font-bold transition flex items-center gap-1"
                      title="Mine Keyword Cluster from Shop"
                    >
                      <Tag className="h-3.5 w-3.5" />
                    </Link>

                    <Button
                      variant="secondary"
                      size="compact"
                      onClick={() => openHistoryModal(shop.shopExternalId)}
                      className="text-sm px-2"
                      title="View Historical Growth"
                    >
                      <History className="h-3.5 w-3.5" />
                    </Button>

                    <button
                      type="button"
                      onClick={() => handleStopTracking(shop.shopExternalId, shop.shopName)}
                      className="p-2 rounded-lg text-ink-tertiary hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Stop Tracking"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Dense Table View */
          <Card padding="md" className="border-line bg-white shadow-xs overflow-x-auto">
            <table className="w-full text-left text-sm text-ink">
              <thead>
                <tr className="border-b border-line text-ink-tertiary uppercase tracking-wider text-label-sm">
                  <th className="py-2.5 pr-4 font-bold">Shop Name</th>
                  <th className="py-2.5 pr-4 font-bold text-right">Lifetime Sales</th>
                  <th className="py-2.5 pr-4 font-bold text-right">6h Delta</th>
                  <th className="py-2.5 pr-4 font-bold text-right">24h Delta</th>
                  <th className="py-2.5 pr-4 font-bold text-right">7d Delta</th>
                  <th className="py-2.5 pr-4 font-bold text-right">Est. Daily</th>
                  <th className="py-2.5 pr-4 font-bold text-right">Listings</th>
                  <th className="py-2.5 pr-4 font-bold text-center">Status</th>
                  <th className="py-2.5 pr-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {filteredShops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-[#FAFAF8]">
                    <td className="py-3 pr-4 font-medium text-ink">
                      <Link
                        href={`/shops/${shop.shopExternalId}`}
                        className="font-bold text-[#0E8F5D] hover:underline"
                      >
                        {shop.shopName}
                      </Link>
                      <div className="text-meta text-ink-tertiary">
                        Tracking since {new Date(shop.trackingSince).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-bold tabular-nums">
                      {shop.latestSnapshot?.totalSales?.toLocaleString() ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-[#0E8F5D] tabular-nums">
                      +{shop.deltas.salesDelta6h ?? 0}
                    </td>
                    <td className="py-3 pr-4 text-right font-bold tabular-nums">
                      +{shop.deltas.salesDelta24h ?? shop.deltas.salesDeltaToday ?? 0}
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-[#0E8F5D] tabular-nums">
                      +{shop.deltas.salesDelta7d ?? 0}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      ~{shop.velocity.estDailySales.toFixed(1)}/d
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {shop.latestSnapshot?.activeListings ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <Badge variant={shop.health === "HEALTHY" ? "success" : "neutral"}>
                        {shop.health === "HEALTHY" ? "Active" : "Cold"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/shops/${shop.shopExternalId}`}>
                          <Button variant="secondary" size="compact" className="text-label-sm h-7 px-2">
                            Research
                          </Button>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleStopTracking(shop.shopExternalId, shop.shopName)}
                          className="p-1 rounded text-ink-tertiary hover:text-red-600 transition"
                          title="Stop Tracking"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* ==================================================================== */}
      {/* SECTION 4: HISTORICAL GROWTH DIALOG */}
      {/* ==================================================================== */}
      {selectedHistory && (
        <Dialog
          open={Boolean(selectedHistory)}
          onClose={() => setSelectedHistory(null)}
          title={`Market Research Trends — ${selectedHistory.shopName}`}
          size="lg"
        >
          <div className="space-y-5 text-xs p-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line">
                <span className="text-label-sm uppercase font-bold text-ink-tertiary">7-Day Delta</span>
                <div className="text-xl font-bold text-[#0E8F5D] mt-1 tabular-nums">
                  +{selectedHistory.deltas.salesDelta7d ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line">
                <span className="text-label-sm uppercase font-bold text-ink-tertiary">Daily Velocity</span>
                <div className="text-xl font-bold text-ink mt-1 tabular-nums">
                  ~{selectedHistory.velocity.estDailySales}/day
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line">
                <span className="text-label-sm uppercase font-bold text-ink-tertiary">Active Listings</span>
                <div className="text-xl font-bold text-ink mt-1 tabular-nums">
                  {selectedHistory.snapshots[selectedHistory.snapshots.length - 1]?.activeListings ?? "—"}
                </div>
              </div>
            </div>

            {/* Sales Trajectory Graph */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-bold text-ink">
                <span>Lifetime Sales Trajectory</span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>
              {selectedHistory.snapshots.length >= 2 ? (
                <div className="border border-line rounded-xl p-3 bg-white">
                  <LineChart
                    data={selectedHistory.snapshots.map((s: any) => ({
                      date: new Date(s.capturedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      }),
                      sales: s.totalSales ?? 0,
                    }))}
                    xKey="date"
                    series={[{ key: "sales", label: "Lifetime Sales", colorIndex: 0 }]}
                    height={200}
                    valueFormatter={(v) => `${Number(v).toLocaleString()} sales`}
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-[#FAFAF8] border border-line rounded-xl text-ink-tertiary">
                  Awaiting 2nd periodic snapshot to plot growth curve.
                </div>
              )}
            </div>

            {/* Captured Snapshots Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-ink">Captured Snapshot Records</h4>
              <div className="max-h-48 overflow-y-auto border border-line rounded-lg">
                <table className="w-full text-left text-data-sm text-ink">
                  <thead className="bg-[#FAFAF8] border-b border-line text-ink-tertiary">
                    <tr>
                      <th className="p-2">Captured Timestamp</th>
                      <th className="p-2 text-right">Total Sales</th>
                      <th className="p-2 text-right">Active Listings</th>
                      <th className="p-2 text-right">Reviews</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {selectedHistory.snapshots.map((s: any) => (
                      <tr key={s.id}>
                        <td className="p-2 font-mono text-meta">{new Date(s.capturedAt).toLocaleString()}</td>
                        <td className="p-2 text-right font-bold tabular-nums">{s.totalSales ?? "—"}</td>
                        <td className="p-2 text-right tabular-nums">{s.activeListings}</td>
                        <td className="p-2 text-right tabular-nums">{s.reviewCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
