"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Radar,
  TrendingUp,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Activity,
  History,
  CheckCircle2,
  Clock,
  Zap,
  ShoppingBag,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Button, Badge, Alert, Heading, Text, Eyebrow, Dialog, IntelligenceCard } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { SpyTabs } from "../spy-tabs";
import {
  fetchTrackedShops,
  stopTrackingShop,
  fetchTrackedListings,
  stopTrackingListing,
  fetchTrackingAlerts,
  fetchTrackingQuota,
  fetchTrackedShopHistory,
} from "@/services/tracking-client";
import { BarChart, LineChart, Sparkline } from "@/components/data/charts";
import type {
  TrackedShopSummary,
  TrackedListingSummary,
  TrackingAlertItem,
  TrackingQuotaInfo,
} from "@/types/tracking";
import { useResearchState } from "@/lib/research-persistence";

export default function TrackedCompetitorsPage() {
  const [activeTab, setActiveTab] = useResearchState<"shops" | "listings" | "alerts" | "quota">("spy_active_tab", "shops");

  const [shops, setShops] = useState<TrackedShopSummary[]>([]);
  const [listings, setListings] = useState<TrackedListingSummary[]>([]);
  const [alerts, setAlerts] = useState<TrackingAlertItem[]>([]);
  const [quota, setQuota] = useState<TrackingQuotaInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // History Drawer / Modal State
  const [selectedShopHistory, setSelectedShopHistory] = useState<any | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [s, l, a, q] = await Promise.all([
        fetchTrackedShops(),
        fetchTrackedListings(),
        fetchTrackingAlerts(),
        fetchTrackingQuota(),
      ]);
      setShops(s);
      setListings(l);
      setAlerts(a);
      setQuota(q);
    } catch (err: any) {
      setError(err.message || "Failed to load tracking data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleStopShop(shopExternalId: string) {
    if (!confirm("Are you sure you want to stop tracking this shop?")) return;
    try {
      await stopTrackingShop(shopExternalId);
      setShops((prev) => prev.filter((s) => s.shopExternalId !== shopExternalId));
      if (quota) setQuota({ ...quota, trackedShopsCount: Math.max(0, quota.trackedShopsCount - 1) });
    } catch (err: any) {
      alert("Failed to stop tracking: " + err.message);
    }
  }

  async function handleStopListing(listingExternalId: string) {
    if (!confirm("Are you sure you want to stop tracking this listing?")) return;
    try {
      await stopTrackingListing(listingExternalId);
      setListings((prev) => prev.filter((l) => l.listingExternalId !== listingExternalId));
      if (quota) setQuota({ ...quota, trackedListingsCount: Math.max(0, quota.trackedListingsCount - 1) });
    } catch (err: any) {
      alert("Failed to stop tracking: " + err.message);
    }
  }

  async function openShopHistory(shopExternalId: string) {
    setLoadingHistory(true);
    try {
      const history = await fetchTrackedShopHistory(shopExternalId);
      setSelectedShopHistory(history);
    } catch (err: any) {
      alert("Failed to load shop history: " + err.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader title="Competitor Surveillance & Tracking" />
      <SpyTabs active="tracked" />

      {error && (
        <Alert variant="danger" title="Tracking Engine Error">
          {error}
        </Alert>
      )}

      {/* The finding: surfaced above everything else so a breakout spike
          is visible without having to dig into the Alerts tab. */}
      {alerts.length > 0 && (
        <Card variant="feature" padding="md" className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warn-subtle text-warn-strong">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <Eyebrow tone="accent">
                {alerts.length} New Alert{alerts.length === 1 ? "" : "s"}
              </Eyebrow>
              <p className="text-sm text-ink-secondary mt-0.5">
                {alerts.filter((a) => a.severity === "CRITICAL").length > 0
                  ? "A tracked competitor has a critical sales spike or catalog change."
                  : "A tracked competitor or listing has a notable change worth reviewing."}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="compact" onClick={() => setActiveTab("alerts")}>
            View Alerts →
          </Button>
        </Card>
      )}

      {/* Quota & Surveillance Header */}
      <Card padding="md" className="border-line bg-white shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
              Longitudinal Intelligence Engine
            </h3>
            <p className="text-xs text-ink-secondary">
              Automated daily snapshot capture, delta analysis, and breakout sales spike detection.
            </p>
          </div>
        </div>

        {quota && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAFAF8] border border-line">
              <span className="text-ink-secondary">Tracked Shops:</span>
              <strong className="font-mono text-ink">
                {quota.trackedShopsCount} / {quota.maxTrackedShops}
              </strong>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAFAF8] border border-line">
              <span className="text-ink-secondary">Tracked Listings:</span>
              <strong className="font-mono text-ink">
                {quota.trackedListingsCount} / {quota.maxTrackedListings}
              </strong>
            </div>
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>
        )}
      </Card>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-line pb-px text-xs font-semibold">
        {[
          { id: "shops", label: `Competitor Shops (${shops.length})`, icon: Radar },
          { id: "listings", label: `Tracked Listings (${listings.length})`, icon: ShoppingBag },
          { id: "alerts", label: `Alerts & Spikes (${alerts.length})`, icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-[#0E8F5D] text-[#0E8F5D]"
                  : "border-transparent text-ink-secondary hover:text-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Competitor Shops */}
      {activeTab === "shops" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h3 className="text-sm font-bold text-ink">Monitored Competitor Stores</h3>
              <p className="text-xs text-ink-tertiary">Real-time daily sales velocity, catalog movements, and health states.</p>
            </div>
            <Link href="/spy">
              <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs">
                + Add Shop to Track
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-ink-tertiary">Loading tracked competitor shops...</div>
          ) : shops.length === 0 ? (
            <div className="text-center py-12 px-6 max-w-md mx-auto space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-[#E7FAF1] text-[#0E8F5D] flex items-center justify-center mx-auto shadow-2xs">
                <Radar className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-ink">No competitor shops being tracked yet</h4>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Track competitor shops to automatically record daily snapshots of verified sales, new listing additions, and customer review momentum over time.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Link href="/spy">
                  <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold text-white">
                    Discover Shops to Track
                  </Button>
                </Link>
                <Link href="/radar">
                  <Button variant="secondary" size="compact" className="text-xs">
                    Explore Opportunity Radar
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* LEVEL 1: SURVEILLANCE MOMENTUM LEADER (PRIMARY DECISION SURFACE) */}
              {(() => {
                const topGainer = [...shops].sort(
                  (a, b) => (b.deltas.salesDelta7d ?? 0) - (a.deltas.salesDelta7d ?? 0)
                )[0];

                if (!topGainer) return null;

                const hasDelta = (topGainer.deltas.salesDelta7d ?? 0) > 0;

                return (
                  <IntelligenceCard
                    badgeText="SURVEILLANCE MOMENTUM LEADER"
                    badgeIcon={<Radar className="h-3.5 w-3.5 text-[#FFB020]" />}
                    title="Which competitor is gaining the most momentum?"
                    verdictLabel={`${topGainer.shopName}${topGainer.velocity.isSpike ? " · ⚡ Spike Alert" : ""}`}
                    verdictVariant={topGainer.velocity.isSpike ? "warning" : "success"}
                    provenance="ACTUAL_ETSY_DATA"
                    description={
                      hasDelta
                        ? `${topGainer.shopName} leads your monitored competitor portfolio with +${topGainer.deltas.salesDelta7d} verified sales gained over the past 7 days (~${topGainer.velocity.estDailySales.toFixed(1)} sales/day).`
                        : `${topGainer.shopName} has the highest estimated daily velocity (~${topGainer.velocity.estDailySales.toFixed(1)} sales/day) among your monitored stores.`
                    }
                    actionLabel="Inspect Competitor Intelligence"
                    onAction={() => {
                      window.location.href = `/shops/${topGainer.shopExternalId}`;
                    }}
                    sidePanel={
                      <div className="space-y-3">
                        <div className="text-[11px] font-bold text-[#9EAA9F] uppercase tracking-wider">
                          7-Day Performance Delta
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[#9EAA9F]">Sales Delta (7d):</span>
                            <span className="font-mono font-bold text-[#16C784]">+{topGainer.deltas.salesDelta7d ?? 0} orders</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#9EAA9F]">Est. Daily Velocity:</span>
                            <span className="font-mono font-bold text-white">~{topGainer.velocity.estDailySales.toFixed(1)} / day</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#9EAA9F]">Catalog Listings:</span>
                            <span className="font-mono font-bold text-white">{topGainer.latestSnapshot?.activeListings ?? "—"} listings</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#9EAA9F]">Lifetime Sales:</span>
                            <span className="font-mono font-bold text-white">{topGainer.latestSnapshot?.totalSales?.toLocaleString() ?? "—"}</span>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#9EAA9F] pt-1">
                      <span>Monitored Shop: <Link href={`/shops/${topGainer.shopExternalId}`} className="text-[#16C784] font-bold hover:underline">{topGainer.shopName}</Link></span>
                      <span>·</span>
                      <span>Review Accumulation: <strong className="text-white font-mono">{topGainer.latestSnapshot?.reviewCount ?? 0}</strong> reviews</span>
                      <span>·</span>
                      <span>Health State: <strong className="text-[#16C784]">{topGainer.health}</strong></span>
                    </div>
                  </IntelligenceCard>
                );
              })()}

              {/* LEVEL 2: 7-DAY VELOCITY & MOMENTUM COMPARISON CHART */}
              {shops.length >= 2 && (
                <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-[#0E8F5D]" /> 7-Day Velocity & Momentum Comparison
                      </span>
                      <p className="text-[11px] text-ink-tertiary">Comparative sales delta captured across monitored competitors over the past 7 days.</p>
                    </div>
                    <DataProvenanceBadge type="ESTIMATED" />
                  </div>
                  <BarChart
                    data={shops.map((s) => ({
                      shop: s.shopName,
                      delta: s.deltas.salesDelta7d ?? 0,
                    }))}
                    xKey="shop"
                    layout="vertical"
                    yAxisWidth={120}
                    series={[
                      { key: "delta", label: "7-Day Sales Delta (+)", colorIndex: 0 },
                    ]}
                    height={Math.max(160, shops.length * 36)}
                    valueFormatter={(v) => `+${v} sales`}
                    accessibleSummary="Bar chart comparing 7-day sales delta across tracked competitor shops."
                  />
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-ink">
                <thead>
                  <tr className="border-b border-line text-ink-tertiary uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-4 font-semibold">Competitor Shop</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Lifetime Sales</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">7-Day Delta</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Est. Daily Sales</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Active Listings</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Reviews</th>
                    <th className="py-2.5 pr-4 font-semibold text-center">Status</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {shops.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FAFAF8]">
                      <td className="py-3 pr-4 font-medium text-ink">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/shops/${s.shopExternalId}`}
                            className="font-bold text-[#0E8F5D] hover:underline flex items-center gap-1"
                          >
                            <span>{s.shopName}</span>
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </Link>
                          {s.velocity.isSpike && (
                            <Badge variant="warning" className="text-[10px] px-1 py-0">
                              ⚡ Spike
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-ink-tertiary">
                          Tracking since {new Date(s.trackingSince).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Total Sales [ACTUAL] */}
                      <td className="py-3 pr-4 text-right font-mono font-bold text-ink">
                        {s.latestSnapshot?.totalSales ? s.latestSnapshot.totalSales.toLocaleString() : "—"}
                      </td>

                      {/* 7-Day Delta [CALCULATED] */}
                      <td className="py-3 pr-4 text-right font-mono">
                        {s.deltas.salesDelta7d !== null ? (
                          <span className="text-[#0E8F5D] font-bold">+{s.deltas.salesDelta7d}</span>
                        ) : (
                          <span className="text-ink-tertiary text-[11px]">Collecting...</span>
                        )}
                      </td>

                      {/* Est. Daily Sales [ESTIMATED] */}
                      <td className="py-3 pr-4 text-right font-mono text-ink">
                        {s.snapshotCount >= 2 ? (
                          <span>~{s.velocity.estDailySales}/day</span>
                        ) : (
                          <span className="text-ink-tertiary text-[11px]">Pending 2nd snap</span>
                        )}
                      </td>

                      {/* Active Listings [ACTUAL] */}
                      <td className="py-3 pr-4 text-right font-mono">
                        {s.latestSnapshot?.activeListings ?? "—"}
                        {s.deltas.listingDelta !== null && s.deltas.listingDelta !== 0 && (
                          <span className={`ml-1 text-[10px] ${s.deltas.listingDelta > 0 ? "text-[#0E8F5D]" : "text-red-600"}`}>
                            ({s.deltas.listingDelta > 0 ? `+${s.deltas.listingDelta}` : s.deltas.listingDelta})
                          </span>
                        )}
                      </td>

                      {/* Reviews [ACTUAL] */}
                      <td className="py-3 pr-4 text-right font-mono text-ink-secondary">
                        {s.latestSnapshot?.reviewCount.toLocaleString() ?? "—"}
                      </td>

                      {/* Health Status */}
                      <td className="py-3 pr-4 text-center">
                        <Badge
                          variant={
                            s.health === "HEALTHY" ? "success" : s.health === "STALE" ? "warning" : "neutral"
                          }
                        >
                          {s.health === "HEALTHY" ? "Active" : s.health === "STALE" ? "Stale" : "Cold Start"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="compact"
                            onClick={() => openShopHistory(s.shopExternalId)}
                            className="text-[11px] h-7 px-2"
                          >
                            <History className="h-3 w-3 mr-1" /> History
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleStopShop(s.shopExternalId)}
                            title="Stop Tracking"
                            className="p-1 rounded text-ink-tertiary hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Tracked Listings */}
      {activeTab === "listings" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h3 className="text-sm font-bold text-ink">Monitored Listings (ListingWatch)</h3>
              <p className="text-xs text-ink-tertiary">Track competitor pricing adjustments, inventory levels, and favorite velocity.</p>
            </div>
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-ink-tertiary">Loading tracked listings...</div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12 px-6 max-w-md mx-auto space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-ink">No competitor listings being tracked yet</h4>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Monitor breakout listings to capture price changes, tag optimizations, and daily sales spikes as they happen.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Link href="/radar">
                  <Button variant="primary" size="compact" className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold text-white">
                    Discover Breakout Listings
                  </Button>
                </Link>
                <Link href="/spy">
                  <Button variant="secondary" size="compact" className="text-xs">
                    Inspect Shop Listings
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-ink">
                <thead>
                  <tr className="border-b border-line text-ink-tertiary uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 pr-4 font-semibold">Tracked Listing</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Price</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Price Delta</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Favorites</th>
                    <th className="py-2.5 pr-4 font-semibold text-center">State</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {listings.map((l) => (
                    <tr key={l.id} className="hover:bg-[#FAFAF8]">
                      <td className="py-3 pr-4 font-medium text-ink max-w-[320px] truncate">
                        <Link
                          href={`/products/${l.listingExternalId}`}
                          className="font-bold text-ink hover:text-[#0E8F5D] transition-colors truncate block"
                        >
                          {l.title}
                        </Link>
                        <div className="text-[10px] text-ink-tertiary flex items-center gap-2">
                          <span>Listing #{l.listingExternalId}</span>
                          {l.shopName && <span>• Shop: {l.shopName}</span>}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono font-bold text-ink">
                        {l.currentPrice !== null ? `$${l.currentPrice.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono">
                        {l.priceDelta !== null && l.priceDelta !== 0 ? (
                          <span className={l.priceDelta < 0 ? "text-[#0E8F5D] font-bold" : "text-red-600 font-bold"}>
                            {l.priceDelta < 0 ? `-$${Math.abs(l.priceDelta).toFixed(2)}` : `+$${l.priceDelta.toFixed(2)}`}
                          </span>
                        ) : (
                          <span className="text-ink-tertiary">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-ink-secondary">
                        {l.numFavorers !== null ? l.numFavorers.toLocaleString() : "—"}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Badge variant={l.state === "active" ? "success" : "neutral"}>
                          {l.state || "active"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleStopListing(l.listingExternalId)}
                          title="Stop Tracking Listing"
                          className="p-1 rounded text-ink-tertiary hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Alerts & Spikes Feed */}
      {activeTab === "alerts" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h3 className="text-sm font-bold text-ink">Competitor Activity Alerts & Spikes</h3>
              <p className="text-xs text-ink-tertiary">Real-time alerts triggered by sudden sales accelerations, catalog surges, and pricing changes.</p>
            </div>
            <DataProvenanceBadge type="SELLERSALT_SCORE" />
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Bell className="h-8 w-8 text-ink-tertiary mx-auto opacity-50" />
              <div className="text-xs text-ink-secondary">No alert events detected in recent snapshots.</div>
              <p className="text-[11px] text-ink-tertiary">Alerts trigger when daily sales exceed 300% baseline or major catalog shifts occur.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.map((a) => (
                <div key={a.id} className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    {a.severity === "CRITICAL" ? (
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                    ) : (
                      <Zap className="h-4 w-4 text-amber-600 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-bold text-ink flex items-center gap-2">
                        <span>{a.targetTitle}</span>
                        <Badge variant={a.severity === "CRITICAL" ? "danger" : "warning"}>
                          {a.eventType.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-ink-secondary leading-relaxed">{a.message}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-ink-tertiary whitespace-nowrap">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Historical Growth Drawer / Dialog */}
      {selectedShopHistory && (
        <Dialog
          open={Boolean(selectedShopHistory)}
          onClose={() => setSelectedShopHistory(null)}
          title={`Longitudinal Intelligence — ${selectedShopHistory.shopName}`}
          size="lg"
        >
          <div className="space-y-5 text-xs p-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line">
                <span className="text-[10px] uppercase font-bold text-ink-tertiary">7-Day Sales Delta</span>
                <div className="text-xl font-bold font-mono text-[#0E8F5D] mt-1">
                  +{selectedShopHistory.deltas.salesDelta7d ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line">
                <span className="text-[10px] uppercase font-bold text-ink-tertiary">Est. Daily Velocity</span>
                <div className="text-xl font-bold font-mono text-ink mt-1">
                  ~{selectedShopHistory.velocity.estDailySales}/day
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line">
                <span className="text-[10px] uppercase font-bold text-ink-tertiary">Catalog Listings</span>
                <div className="text-xl font-bold font-mono text-ink mt-1">
                  {selectedShopHistory.snapshots[selectedShopHistory.snapshots.length - 1]?.activeListings ?? "—"}
                </div>
              </div>
            </div>

            {/* Sales Trajectory Graph */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-bold text-ink">
                <span>Lifetime Sales Trajectory</span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>
              {selectedShopHistory.snapshots.length >= 2 ? (
                <div className="border border-line rounded-xl p-3 bg-white">
                  <LineChart
                    data={selectedShopHistory.snapshots.map((s: any) => ({
                      date: new Date(s.capturedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                      sales: s.totalSales ?? 0,
                    }))}
                    xKey="date"
                    series={[{ key: "sales", label: "Lifetime Sales", colorIndex: 0 }]}
                    height={200}
                    valueFormatter={(v) => `${Number(v).toLocaleString()} sales`}
                    accessibleSummary="Line chart plotting lifetime sales progression over captured daily snapshots."
                  />
                </div>
              ) : (
                <div className="p-8 text-center bg-[#FAFAF8] border border-line rounded-xl text-ink-tertiary">
                  Awaiting 2nd periodic snapshot to plot growth curve.
                </div>
              )}
            </div>

            {/* Snapshot Log Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-ink">Captured Snapshot Records</h4>
              <div className="max-h-40 overflow-y-auto border border-line rounded-lg">
                <table className="w-full text-left text-[11px] text-ink">
                  <thead className="bg-[#FAFAF8] border-b border-line text-ink-tertiary">
                    <tr>
                      <th className="p-2">Timestamp</th>
                      <th className="p-2 text-right">Total Sales</th>
                      <th className="p-2 text-right">Active Listings</th>
                      <th className="p-2 text-right">Reviews</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {selectedShopHistory.snapshots.map((s: any) => (
                      <tr key={s.id}>
                        <td className="p-2 font-mono">{new Date(s.capturedAt).toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold text-ink">{s.totalSales ?? "—"}</td>
                        <td className="p-2 text-right font-mono">{s.activeListings}</td>
                        <td className="p-2 text-right font-mono">{s.reviewCount}</td>
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
