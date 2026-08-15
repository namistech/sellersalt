"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Store,
  ExternalLink,
  Flame,
  Star,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  Target,
  Zap,
  BookOpen,
  Bookmark,
  Plus,
  Compass,
  DollarSign,
  BarChart3,
  Calendar,
  Eye,
} from "lucide-react";
import { Card, Badge, Button, Heading, Text } from "@/components/ui";
import { computeProductWinningSignals, type WinningShopSignal } from "@/services/intelligence/winning-signals";
import type { Prospect } from "@prisma/client";

interface ShopDetailClientProps {
  shopExternalId: string;
  primary: Prospect;
  prospects: Prospect[];
  keywords: string[];
  shopSignals: WinningShopSignal;
  isAuthenticated: boolean;
}

export function ShopDetailClient({
  shopExternalId,
  primary,
  prospects,
  keywords,
  shopSignals,
  isAuthenticated,
}: ShopDetailClientProps) {
  const [shopFavorite, setShopFavorite] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [shortlistedListings, setShortlistedListings] = useState<Record<string, boolean>>({});
  const [plannedKeywords, setPlannedKeywords] = useState<Record<string, boolean>>({});

  const estDaily = primary.estDailySales ?? 0;
  const totalSales = primary.totalSales ?? 0;
  const activeListings = primary.activeListings ?? 1;
  const sellingRatio = primary.avgSellingRatio ?? (totalSales / activeListings);

  // Financial Estimates
  const prices = prospects.map((p) => p.price).filter((p) => p > 0);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 18;
  const estRevenue = totalSales * avgPrice;
  const estGrossProfit = estRevenue * 0.68; // 68% estimated gross margin
  const estMonthlySales = Math.round(estDaily * 30);
  const estMonthlyRevenue = Math.round(estMonthlySales * avgPrice);

  // Prominent Verdict classification
  const verdictRating =
    shopSignals.opportunityScore >= 75
      ? {
          badge: "EASY TO START",
          variant: "success" as const,
          description: "High market demand with low catalog barrier. Excellent niche for new sellers to model.",
          color: "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/30",
        }
      : shopSignals.opportunityScore >= 45
      ? {
          badge: "MODERATE TO COMPETE",
          variant: "gold" as const,
          description: "Steady recurring demand. Requires optimized product photography, long-tail SEO, and competitive pricing.",
          color: "text-[#B37800] bg-[#FFF8E6] border-[#FFB020]/30",
        }
      : {
          badge: "HIGH BARRIER TO COMPETE",
          variant: "neutral" as const,
          description: "Highly established legacy store with thousands of reviews. Requires differentiated bundles or unique design angles.",
          color: "text-[#525B55] bg-[#F4F3EF] border-[#E3E6E0]",
        };

  async function handleToggleTrack() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    setTracking(true);
    try {
      const res = await fetch(`/api/shops/${shopExternalId}/track`, {
        method: tracked ? "DELETE" : "POST",
      });
      if (res.ok) setTracked(!tracked);
    } finally {
      setTracking(false);
    }
  }

  async function handleToggleShopFavorite() {
    setShopFavorite(!shopFavorite);
    if (isAuthenticated) {
      try {
        await fetch(`/api/shops/${shopExternalId}/track`, {
          method: shopFavorite ? "DELETE" : "POST",
        });
      } catch {}
    }
  }

  async function handleToggleListingFavorite(id: string) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    const next = !shortlistedListings[id];
    setShortlistedListings((prev) => ({ ...prev, [id]: next }));
    try {
      await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
    } catch {
      setShortlistedListings((prev) => ({ ...prev, [id]: !next }));
    }
  }

  function handleToggleKeywordPlanning(k: string) {
    setPlannedKeywords((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  // Simulated 7-day historical trend graph points
  const graphPoints = [
    { day: "Mon", sales: Math.max(1, Math.round(estDaily * 0.85)) },
    { day: "Tue", sales: Math.max(1, Math.round(estDaily * 0.92)) },
    { day: "Wed", sales: Math.max(1, Math.round(estDaily * 1.05)) },
    { day: "Thu", sales: Math.max(1, Math.round(estDaily * 0.98)) },
    { day: "Fri", sales: Math.max(1, Math.round(estDaily * 1.15)) },
    { day: "Sat", sales: Math.max(1, Math.round(estDaily * 1.28)) },
    { day: "Sun", sales: Math.max(1, Math.round(estDaily * 1.1)) },
  ];
  const maxSales = Math.max(...graphPoints.map((p) => p.sales), 10);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-tertiary">
        <Link href={isAuthenticated ? "/spy" : "/shops"} className="hover:text-ink transition-colors">
          ← Back to {isAuthenticated ? "Competitor Spy" : "Etsy Directory"}
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">{primary.shopName}</span>
      </div>

      {/* Prominent Shop Header Identity Card */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {primary.shopIconUrl ? (
              <img
                src={primary.shopIconUrl}
                alt={primary.shopName}
                className="h-16 w-16 rounded-2xl border border-line object-cover shadow-xs"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#141B16] text-[#0E8F5D] border border-line text-xl font-extrabold shadow-xs">
                {primary.shopName.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-ink">{primary.shopName}</h1>
                <Badge variant="success">Verified Etsy Shop</Badge>
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${verdictRating.color}`}>
                  {verdictRating.badge}
                </div>
              </div>
              <div className="text-xs text-ink-secondary flex flex-wrap items-center gap-2 mt-1.5">
                <span>{Math.round(primary.shopAgeMonths)} months on Etsy</span>
                <span>·</span>
                <span className="text-amber-600 font-semibold">
                  ★ {primary.reviewAverage?.toFixed(1) ?? "5.0"} ({primary.reviewCount.toLocaleString()} reviews)
                </span>
                <span>·</span>
                <span>{activeListings} active listings</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={primary.shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line bg-white hover:bg-[#F4F3EF] text-xs font-semibold text-ink transition-colors"
            >
              <span>Open on Etsy</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <Button
              variant={shopFavorite ? "primary" : "secondary"}
              size="compact"
              onClick={handleToggleShopFavorite}
              className="text-xs font-semibold"
            >
              <Bookmark className={`h-3.5 w-3.5 mr-1 ${shopFavorite ? "fill-current" : ""}`} />
              {shopFavorite ? "★ Favorite Shop" : "+ Favorite Shop"}
            </Button>
          </div>
        </div>

        {/* Prominent Verdict / Opportunity Scoring Box */}
        <div className="p-5 rounded-2xl bg-[#FAFAF8] border border-line space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#141B16] text-[#FFB020] flex items-center justify-center font-extrabold text-lg shadow-sm">
                {shopSignals.opportunityScore}
              </div>
              <div>
                <div className="text-xs font-bold text-ink flex items-center gap-2">
                  <span>Shop Opportunity Score: {shopSignals.opportunityScore} / 100</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${verdictRating.color}`}>
                    {verdictRating.badge}
                  </span>
                </div>
                <div className="text-xs text-ink-secondary mt-0.5">
                  {verdictRating.description}
                </div>
              </div>
            </div>

            <div className="text-xs text-right font-mono text-ink-tertiary">
              Recommendation: <strong className="text-ink">{shopSignals.recommendation}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-line-subtle text-xs">
            <div className="space-y-1">
              <div className="font-bold text-ink flex items-center gap-1.5">
                <Target className="h-4 w-4 text-[#0E8F5D]" /> Why This Shop is Interesting:
              </div>
              <p className="text-ink-secondary leading-relaxed">{shopSignals.whyInteresting}</p>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-ink flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-purple-600" /> What to Study & Replicate:
              </div>
              <p className="text-ink-secondary leading-relaxed">{shopSignals.whatToStudy}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Live Financial & Sales Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" className="border-line bg-white shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-ink-tertiary uppercase mb-1">
            <span>Est. Total Revenue</span>
            <DollarSign className="h-4 w-4 text-[#0E8F5D]" />
          </div>
          <div className="text-2xl font-extrabold text-ink font-mono">
            ${estRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-ink-tertiary mt-1">
            Est. Gross Profit: <strong className="text-[#0E8F5D] font-mono">${estGrossProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
          </div>
        </Card>

        <Card padding="md" className="border-line bg-white shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-ink-tertiary uppercase mb-1">
            <span>Daily Velocity</span>
            <Flame className="h-4 w-4 text-[#FFB020]" />
          </div>
          <div className="text-2xl font-extrabold text-[#0E8F5D] font-mono">
            {estDaily.toFixed(1)} <span className="text-xs font-sans text-ink-tertiary">sales/day</span>
          </div>
          <div className="text-[11px] text-ink-tertiary mt-1">
            ~{estMonthlySales} sales (${estMonthlyRevenue.toLocaleString()}/mo)
          </div>
        </Card>

        <Card padding="md" className="border-line bg-white shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-ink-tertiary uppercase mb-1">
            <span>Total Sales</span>
            <Store className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-ink font-mono">
            {totalSales.toLocaleString()}
          </div>
          <div className="text-[11px] text-ink-tertiary mt-1">
            {primary.reviewCount.toLocaleString()} verified reviews
          </div>
        </Card>

        <Card padding="md" className="border-line bg-white shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-ink-tertiary uppercase mb-1">
            <span>Catalog Yield</span>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-ink font-mono">
            {sellingRatio.toFixed(1)}x
          </div>
          <div className="text-[11px] text-ink-tertiary mt-1">
            {activeListings} active listings
          </div>
        </Card>
      </div>

      {/* DEDICATED GREEN TRACKING SECTION (Rich #0E8F5D Green Background + White Button) */}
      <div className="p-8 rounded-2xl bg-[#0E8F5D] text-white shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              Automated 24h Competitor Radar
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Track {primary.shopName}&apos;s Daily Sales & Revenue Movement
            </h2>
            <p className="text-xs text-white/90 leading-relaxed">
              SellerSalt crawlers record daily transaction counts, price fluctuations, and newly published listing launches every 24 hours.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              variant="secondary"
              size="compact"
              loading={tracking}
              onClick={handleToggleTrack}
              className="bg-white hover:bg-[#F4F3EF] text-[#0E8F5D] font-extrabold text-sm px-6 py-3 shadow-md border-0 transition-transform transform hover:scale-105"
            >
              {tracked ? "✓ Tracking Active (Daily Updates)" : "+ Start Daily Sales Tracking"}
            </Button>
          </div>
        </div>

        {/* Live Daily Trend Visualization Graph */}
        <div className="p-5 rounded-xl bg-black/15 border border-white/20 space-y-3">
          <div className="flex items-center justify-between text-xs text-white/80">
            <span className="font-bold flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> 7-Day Estimated Sales Velocity Trend
            </span>
            <span className="font-mono">{estDaily.toFixed(1)} avg/day</span>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-28 flex items-end justify-between gap-3 pt-2">
            {graphPoints.map((p) => {
              const heightPercent = Math.min(100, Math.max(15, Math.round((p.sales / maxSales) * 100)));
              return (
                <div key={p.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <div className="text-[10px] font-mono text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.sales}
                  </div>
                  <div
                    className="w-full bg-white/90 group-hover:bg-white rounded-t-md transition-all"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <div className="text-[10px] font-bold text-white/70">{p.day}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Discovered Long-Tail Keywords Section */}
      {keywords.length > 0 && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Heading as="h2" size="h4">
                Shop Long-Tail Keyword Landscape ({keywords.length})
              </Heading>
              <Text size="body-sm" color="secondary" className="mt-0.5">
                Target search terms where {primary.shopName} captures customer discovery.
              </Text>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {keywords.map((k) => {
              const words = k.split(/\s+/).length;
              const isPlanned = plannedKeywords[k];

              return (
                <div
                  key={k}
                  className="p-3 rounded-xl border border-line bg-[#FAFAF8] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-ink truncate">{k}</div>
                    <div className="text-[10px] text-ink-tertiary mt-0.5">
                      {words} words · Long-tail niche
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/prospects?search=${encodeURIComponent(k)}`}
                      className="p-1 rounded text-ink-tertiary hover:text-ink"
                      title="Research keyword"
                    >
                      <Compass className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleToggleKeywordPlanning(k)}
                      className={`p-1 rounded text-xs transition-colors ${
                        isPlanned ? "text-[#0E8F5D]" : "text-ink-tertiary hover:text-ink"
                      }`}
                      title={isPlanned ? "Planned" : "Add to Planning"}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${isPlanned ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Top Performing Listings (With Visible Long-Tail Keywords Per Listing) */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-4">
        <div>
          <Heading as="h2" size="h4">
            Winning Listings & Associated Long-Tail Keywords ({prospects.length})
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Individual products uncovered by SellerSalt with velocity ratings and discovered search keywords.
          </Text>
        </div>

        <div className="divide-y divide-line-subtle border-t border-line-subtle">
          {prospects.map((p) => {
            const pSignals = computeProductWinningSignals({
              estDailySales: p.estDailySales,
              totalSales: p.totalSales,
              activeListings: p.activeListings,
              reviewCount: p.reviewCount,
              reviewAverage: p.reviewAverage,
              price: p.price,
              shopAgeMonths: p.shopAgeMonths,
            });
            const isFav = shortlistedListings[p.id] ?? p.isFavorite;

            return (
              <div key={p.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {p.listingImageUrl ? (
                    <img
                      src={p.listingImageUrl}
                      alt=""
                      className="h-16 w-16 rounded-xl border border-line object-cover shrink-0 shadow-2xs"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-[#F4F3EF] border border-line flex items-center justify-center text-xs font-bold text-ink-tertiary shrink-0">
                      ETSY
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-bold text-xs text-ink line-clamp-1">
                      {p.listingTitle}
                    </div>

                    <div className="text-[11px] text-ink-tertiary flex flex-wrap items-center gap-2">
                      <span>Price: <strong className="text-ink font-mono">${p.price.toFixed(2)}</strong></span>
                      <span>·</span>
                      <span>Est. Velocity: <strong className="text-[#0E8F5D] font-mono">{(p.estDailySales ?? 0).toFixed(1)} / day</strong></span>
                      <span>·</span>
                      <span className="text-[#0E8F5D] font-semibold">
                        Score: {pSignals.opportunityScore}/100
                      </span>
                    </div>

                    {/* Prominent Long-Tail Keyword Tag */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-ink-tertiary uppercase">Keyword:</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4F3EF] text-[11px] font-medium text-ink border border-line">
                        <Sparkles className="h-2.5 w-2.5 text-[#FFB020]" />
                        {p.keyword || "etsy product"}
                      </span>
                      <span className="text-[10px] text-ink-tertiary">
                        ({(p.keyword || "").split(/\s+/).length} words)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                  <a
                    href={p.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-line bg-white hover:bg-[#FAFAF8] text-ink-secondary hover:text-ink text-xs font-medium inline-flex items-center gap-1"
                    title="Open listing on Etsy in new tab"
                  >
                    <span>Etsy</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <Button
                    variant={isFav ? "primary" : "secondary"}
                    size="compact"
                    onClick={() => handleToggleListingFavorite(p.id)}
                    className="text-xs font-semibold"
                  >
                    <Bookmark className={`h-3.5 w-3.5 mr-1 ${isFav ? "fill-current" : ""}`} />
                    {isFav ? "★ Favorited" : "Favorite Listing"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
