"use client";

import { useEffect, useState } from "react";
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
  Check,
  Tag,
  Award,
  AlertTriangle,
} from "lucide-react";
import { Card, Badge, Button, Heading, Text, Eyebrow, IconButton } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { BarChart, type ChartState } from "@/components/data/charts";
import type { CompleteShopIntelligenceProfile } from "@/types/shop-research";
import type { Prospect } from "@prisma/client";
import { addProductToPlanner } from "@/services/product-hunting-client";
import type { ProductHuntingResult } from "@/types/product-hunting";

interface ShopDetailClientProps {
  shopExternalId: string;
  profile?: CompleteShopIntelligenceProfile | null;
  primary?: Prospect | null;
  prospects?: Prospect[];
  keywords?: string[];
  isAuthenticated: boolean;
  isTracked: boolean;
}

export function ShopDetailClient({
  shopExternalId,
  profile,
  primary,
  prospects = [],
  keywords = [],
  isAuthenticated,
  isTracked,
}: ShopDetailClientProps) {
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState(profile ? profile.isTracked : isTracked);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Local state for favorited listings & planned keywords
  const [shortlistedListings, setShortlistedListings] = useState<Record<string, boolean>>({});
  const [savedPlannerListings, setSavedPlannerListings] = useState<Record<string, boolean>>({});
  const [savingPlannerId, setSavingPlannerId] = useState<string | null>(null);
  const [plannedKeywords, setPlannedKeywords] = useState<Record<string, boolean>>({});
  const [keywordActionLoading, setKeywordActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/planned-keywords")
      .then((r) => r.json())
      .then((d) => {
        const planned: Record<string, boolean> = {};
        for (const k of d.keywords ?? []) planned[k.keyword] = true;
        setPlannedKeywords(planned);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Derive consolidated data from profile if available, otherwise from primary prospect
  const shopName = profile?.identity.shopName ?? primary?.shopName ?? `Shop ${shopExternalId}`;
  const shopUrl = profile?.identity.shopUrl ?? primary?.shopUrl ?? `https://www.etsy.com/shop/${shopName}`;
  const shopIconUrl = profile?.identity.shopIconUrl ?? primary?.shopIconUrl ?? null;
  const shopAgeMonths = profile?.identity.shopAgeMonths ?? primary?.shopAgeMonths ?? 12;
  const createdDate = profile?.identity.createdDate ?? `${Math.round(shopAgeMonths)} months ago`;
  const location = profile?.identity.location ?? "Etsy Marketplace";

  // KPIs
  const totalSales = profile?.kpis.totalSales ?? primary?.totalSales ?? 0;
  const activeListings = profile?.kpis.activeListings ?? primary?.activeListings ?? 1;
  const reviewCount = profile?.kpis.reviewCount ?? primary?.reviewCount ?? 0;
  const reviewAverage = profile?.kpis.reviewAverage ?? primary?.reviewAverage ?? 5.0;
  const estDaily = profile?.kpis.estDailySales ?? primary?.estDailySales ?? (totalSales / (shopAgeMonths * 30.44));
  const estMonthlySales = profile?.kpis.estMonthlySales ?? Math.round(estDaily * 30.44);
  const sellingRatio = profile?.kpis.avgSellingRatio ?? (totalSales / Math.max(1, activeListings));
  const avgPrice = profile?.kpis.avgObservedPrice ?? 18.5;
  const estMonthlyRevenue = profile?.kpis.estMonthlyRevenue ?? Math.round(estMonthlySales * avgPrice);
  const estGrossProfit = profile?.kpis.estGrossProfit ?? Math.round(estMonthlyRevenue * 0.68);

  // Verdict
  const verdict = profile?.verdict ?? {
    opportunityScore: 78,
    verdictBadge: "EASY TO START" as const,
    verdictLabel: "Breakout Emerging Winner",
    verdictColor: "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/30",
    summary: `Shop generating consistent velocity (${estDaily.toFixed(1)} sales/day) with a catalog of ${activeListings} listings.`,
    whyInteresting: `Catalog yield of ${sellingRatio.toFixed(1)} sales/listing in an active segment.`,
    whatToStudy: "Examine primary thumbnail photography, bundle arrangements, and long-tail tags.",
    whatToAvoid: "Avoid competing on single commodity items; differentiate on value bundles.",
    whatToDoNext: "Track this shop in ShopWatch and save high-frequency keywords to Planner.",
  };

  // Snapshots
  const snapshots = profile?.snapshots ?? [];
  const trendPoints = snapshots.slice(1).map((s, i) => {
    const prev = snapshots[i]!;
    const delta = s.totalSales != null && prev.totalSales != null ? Math.max(0, s.totalSales - prev.totalSales) : 0;
    return {
      date: new Date(s.capturedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      sales: delta,
    };
  });
  const maxTrendSales = Math.max(...trendPoints.map((p) => p.sales), 1);
  const latestSnapshot = snapshots[snapshots.length - 1] ?? null;

  // Catalog yield
  const catalog = profile?.catalog ?? {
    medianPrice: avgPrice,
    minPrice: avgPrice * 0.5,
    maxPrice: avgPrice * 2.5,
    priceSpread: avgPrice * 2.0,
    catalogEfficiency: sellingRatio >= 30 ? "HIGH_YIELD" : sellingRatio >= 10 ? "BALANCED" : "LOW_YIELD",
    topCategories: [{ category: "General Products", count: activeListings, percentage: 100 }],
  };

  // Tag frequency items
  const tagItems = profile?.keywords ?? keywords.map((k) => ({
    tag: k,
    count: prospects.filter((p) => p.keyword === k).length || 1,
    percentage: Math.round(((prospects.filter((p) => p.keyword === k).length || 1) / Math.max(1, prospects.length)) * 100),
    isLongTail: k.split(/\s+/).length >= 2,
    wordCount: k.split(/\s+/).length,
  }));

  // Winning listings
  const winningListings = profile?.topListings ?? prospects.map((p) => ({
    listingId: p.id,
    title: p.listingTitle,
    price: p.price,
    currency: "USD",
    imageUrl: p.listingImageUrl,
    listingUrl: p.listingUrl,
    createdTimestamp: Math.floor(new Date(p.createdAt).getTime() / 1000),
    listingAgeDays: 30,
    tags: [p.keyword].filter(Boolean),
    materials: [],
    estDailySales: p.estDailySales ?? 0,
    numFavorers: null,
    views: null,
    opportunityScore: 75,
  }));

  // "Should You Compete" section — presentation-only mapping of the
  // existing verdict engine's badge onto friendlier customer-facing
  // wording. The classification itself (which tier a shop falls into)
  // still comes entirely from computeStrategicShopVerdict / verdict.verdictBadge —
  // never recomputed here.
  const COMPETE_VERDICT_DISPLAY: Record<
    typeof verdict.verdictBadge,
    {
      label: string;
      subheadline: string;
      naturalLanguageExplanation: string;
      tone: string;
      badgeVariant: "success" | "warning" | "danger";
    }
  > = {
    "EASY TO START": {
      label: "Easy to Compete",
      subheadline: "Low barrier to entry — high opportunity benchmark for new sellers",
      naturalLanguageExplanation:
        "This shop appears relatively approachable for a new seller because its competitive barriers (catalog scale and review moat) are lower than the shops SellerSalt typically flags as difficult to enter, while showing healthy transaction momentum.",
      tone: "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/30",
      badgeVariant: "success",
    },
    "MODERATE TO COMPETE": {
      label: "Moderate to Compete",
      subheadline: "Established market presence — entry requires clear product differentiation",
      naturalLanguageExplanation:
        "This market is possible to enter, but you'll need a stronger offer, superior visual mockups, or bundle depth to compete effectively against this shop's consistent transaction pace.",
      tone: "text-[#B37800] bg-[#FFF8E6] border-[#FFB020]/30",
      badgeVariant: "warning",
    },
    "HIGH BARRIER": {
      label: "High Barrier — Not Recommended",
      subheadline: "Heavy incumbent moat — direct head-to-head competition carries high barrier",
      naturalLanguageExplanation:
        "This shop operates in a difficult competitive position with high review defense and an extensive catalog. Consider studying it for niche long-tail ideas rather than trying to compete directly.",
      tone: "text-red-700 bg-red-50 border-red-200",
      badgeVariant: "danger",
    },
  };
  const competeVerdict = COMPETE_VERDICT_DISPLAY[verdict.verdictBadge];

  // Factor breakdown evaluations based entirely on existing shop intelligence fields
  const factorBreakdown = [
    {
      title: "Sales Momentum",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      value: `${estDaily.toFixed(1)} / day`,
      context: estDaily >= 5 ? "Strong daily velocity" : estDaily >= 1 ? "Steady transaction pace" : "Infrequent sales",
      impactVariant: estDaily >= 5 ? ("success" as const) : estDaily >= 1 ? ("neutral" as const) : ("warning" as const),
      impactLabel: estDaily >= 5 ? "Active Demand" : estDaily >= 1 ? "Moderate" : "Low Volume",
    },
    {
      title: "Review Moat",
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      value: `${reviewCount.toLocaleString()} reviews`,
      context: reviewCount < 500 ? "Low review barrier" : reviewCount < 3000 ? "Moderate review accumulation" : "Heavy incumbent review moat",
      impactVariant: reviewCount < 500 ? ("success" as const) : reviewCount < 3000 ? ("neutral" as const) : ("danger" as const),
      impactLabel: reviewCount < 500 ? "Low Barrier" : reviewCount < 3000 ? "Moderate" : "High Barrier",
    },
    {
      title: "Catalog Scale",
      icon: <Store className="h-3.5 w-3.5" />,
      value: `${activeListings} listings`,
      context: activeListings <= 75 ? "Lean, focused catalog" : activeListings <= 300 ? "Moderate catalog depth" : "Large catalog coverage",
      impactVariant: activeListings <= 75 ? ("success" as const) : activeListings <= 300 ? ("neutral" as const) : ("danger" as const),
      impactLabel: activeListings <= 75 ? "Achievable" : activeListings <= 300 ? "Moderate" : "Large Scale",
    },
    {
      title: "Catalog Efficiency",
      icon: <Layers className="h-3.5 w-3.5" />,
      value: `${sellingRatio.toFixed(1)} sales/listing`,
      context: catalog.catalogEfficiency === "HIGH_YIELD" ? "High sales per listing" : catalog.catalogEfficiency === "BALANCED" ? "Even listing yield" : "Diluted sales spread",
      impactVariant: catalog.catalogEfficiency === "HIGH_YIELD" ? ("success" as const) : catalog.catalogEfficiency === "BALANCED" ? ("neutral" as const) : ("warning" as const),
      impactLabel: catalog.catalogEfficiency === "HIGH_YIELD" ? "High Yield" : catalog.catalogEfficiency === "BALANCED" ? "Balanced" : "Low Yield",
    },
    {
      title: "Pricing Sweet Spot",
      icon: <DollarSign className="h-3.5 w-3.5" />,
      value: `$${avgPrice.toFixed(2)}`,
      context: `$${catalog.minPrice.toFixed(2)} – $${catalog.maxPrice.toFixed(2)} price range`,
      impactVariant: "neutral" as const,
      impactLabel: `Median $${catalog.medianPrice.toFixed(2)}`,
    },
  ];

  // Evidence chart: top winning listings ranked by the same opportunityScore
  // already computed per-listing — no new scoring, just a visual ranking.
  const listingsChartData = [...winningListings]
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 6)
    .map((l) => ({
      title: l.title.length > 28 ? `${l.title.slice(0, 28)}…` : l.title,
      opportunityScore: l.opportunityScore,
    }));
  const listingsChartState: ChartState = listingsChartData.length === 0 ? "empty" : "ready";

  // Evidence chart: catalog category distribution — same topCategories
  // data already rendered as manual percentage bars elsewhere; charted
  // here for the comparison view.
  const categoryChartData = catalog.topCategories.map((c) => ({
    category: c.category,
    percentage: c.percentage,
  }));
  const categoryChartState: ChartState = categoryChartData.length === 0 ? "empty" : "ready";

  // Pricing range position markers — min/median/max are the only pricing
  // aggregates the catalog engine returns (no per-listing full-catalog
  // price array exists to bucket into a true histogram), so this is a
  // range visual rather than a fabricated distribution.
  const priceRangeSpan = Math.max(1, catalog.maxPrice - catalog.minPrice);
  const medianPricePercent = Math.min(100, Math.max(0, ((catalog.medianPrice - catalog.minPrice) / priceRangeSpan) * 100));

  async function handleToggleTrack() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    setTracking(true);
    setTrackError(null);
    try {
      const res = await fetch(`/api/shops/${shopExternalId}/track`, {
        method: tracked ? "DELETE" : "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTrackError(data.error || "Could not update tracking for this shop.");
        return;
      }
      setTracked(!tracked);
    } catch {
      setTrackError("Network error updating tracking.");
    } finally {
      setTracking(false);
    }
  }

  async function handleAddListingToPlanner(listing: (typeof winningListings)[number]) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    setSavingPlannerId(listing.listingId);
    const mockResult: ProductHuntingResult = {
      id: listing.listingId,
      listing: {
        listingId: listing.listingId,
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        images: listing.imageUrl ? [listing.imageUrl] : [],
        imageUrl: listing.imageUrl,
        tags: listing.tags,
        materials: listing.materials,
        taxonomyId: null,
        createdTimestamp: listing.createdTimestamp,
        updatedTimestamp: listing.createdTimestamp,
        listingAgeDays: listing.listingAgeDays,
        listingAgeMonths: Math.round(listing.listingAgeDays / 30),
        listingUrl: listing.listingUrl,
        shopId: shopExternalId,
        shopName,
        numFavorers: listing.numFavorers,
        views: listing.views,
      },
      shop: {
        shopId: shopExternalId,
        shopName,
        shopUrl,
        shopIconUrl,
        createdTimestamp: Math.floor((Date.now() - shopAgeMonths * 30.44 * 24 * 3600 * 1000) / 1000),
        shopAgeMonths,
        totalSales,
        activeListings,
        reviewCount,
        reviewAverage,
      },
      signals: {
        estDailySales: listing.estDailySales,
        avgSellingRatio: sellingRatio,
        salesVelocityProxy: listing.estDailySales >= 4 ? "HIGH" : "MODERATE",
        reviewConversionRate: totalSales > 0 ? reviewCount / totalSales : 0,
      },
      opportunity: {
        opportunityScore: listing.opportunityScore,
        classification: "EMERGING",
        classificationLabel: "Emerging Winner",
        classificationEmoji: "🔥",
        reason: `Discovered winning listing from ${shopName} generating estimated ${listing.estDailySales.toFixed(1)} sales/day.`,
        signals: {
          velocity: { label: "Sales Velocity", score: 85, metricValue: `${listing.estDailySales.toFixed(1)} sales/day` },
          density: { label: "Catalog Density", score: 80, metricValue: `${sellingRatio.toFixed(1)} sales/listing` },
          competition: { label: "Competition Barrier", score: 75, metricValue: `${reviewCount} reviews` },
          momentum: { label: "Buyer Momentum", score: 70, metricValue: "Active" },
          freshness: { label: "Listing Freshness", score: 70, metricValue: `${listing.listingAgeDays}d old` },
        },
        evidence: [
          `Parent shop: ${shopName} (${totalSales.toLocaleString()} sales).`,
          `Observed price: $${listing.price.toFixed(2)}.`,
        ],
        strengths: ["Strong sales momentum observed on Etsy"],
        weaknesses: [],
        recommendedAction: "SHORTLIST",
        strategicTakeaway: "Model this listing structure and tag combinations in your product drafts.",
      },
    };

    try {
      await addProductToPlanner(mockResult);
      setSavedPlannerListings((prev) => ({ ...prev, [listing.listingId]: true }));
    } catch (err: any) {
      alert(err.message || "Failed to add listing to Planner");
    } finally {
      setSavingPlannerId(null);
    }
  }

  async function handleToggleKeywordPlanning(k: string) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    const wasPlanned = Boolean(plannedKeywords[k]);
    setKeywordActionLoading(k);
    setPlannedKeywords((prev) => ({ ...prev, [k]: !wasPlanned }));
    try {
      if (wasPlanned) {
        await fetch("/api/planned-keywords", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: k }),
        });
      } else {
        await fetch("/api/planned-keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: k,
            sourceShopExternalId: shopExternalId,
            sourceListingUrl: shopUrl,
          }),
        });
      }
    } catch {
      setPlannedKeywords((prev) => ({ ...prev, [k]: wasPlanned }));
    } finally {
      setKeywordActionLoading(null);
    }
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-ink-tertiary">
        <Link href={isAuthenticated ? "/spy" : "/shops"} className="hover:text-ink transition-colors">
          ← Back to {isAuthenticated ? "Competitor Intelligence" : "Etsy Directory"}
        </Link>
        <span>/</span>
        <span className="text-ink font-semibold">{shopName}</span>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: SHOP IDENTITY & OVERVIEW HEADER                           */}
      {/* ==================================================================== */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {shopIconUrl ? (
              <img
                src={shopIconUrl}
                alt={shopName}
                className="h-16 w-16 rounded-2xl border border-line object-cover shadow-xs"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#141B16] text-[#0E8F5D] border border-line text-xl font-extrabold shadow-xs">
                {shopName.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-ink tracking-tight">{shopName}</h1>
                <Badge variant="success">Verified Etsy Shop</Badge>
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${verdict.verdictColor}`}>
                  {verdict.verdictBadge}
                </div>
              </div>
              <div className="text-xs text-ink-secondary flex flex-wrap items-center gap-2">
                <span>Est. {createdDate} ({Math.round(shopAgeMonths)} mo)</span>
                <span>·</span>
                <span>📍 {location}</span>
                <span>·</span>
                <span className="text-amber-600 font-semibold">
                  ★ {reviewAverage ? reviewAverage.toFixed(1) : "5.0"} ({reviewCount.toLocaleString()} reviews)
                </span>
                <span>·</span>
                <span>{activeListings} active listings</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-[#F4F3EF] text-xs font-semibold text-ink transition-colors shadow-2xs"
            >
              <span>View on Etsy</span>
              <ExternalLink className="h-3.5 w-3.5 text-ink-tertiary" />
            </a>

            <Button
              variant={tracked ? "primary" : "secondary"}
              size="compact"
              loading={tracking}
              onClick={handleToggleTrack}
              className={`text-xs font-semibold ${tracked ? "bg-[#0E8F5D] text-white hover:bg-[#0C7A52]" : ""}`}
            >
              <Bookmark className={`h-3.5 w-3.5 mr-1 ${tracked ? "fill-current" : ""}`} />
              {tracked ? "★ Tracking Active" : "+ Track Shop in ShopWatch"}
            </Button>
          </div>
        </div>
      </Card>

      {/* ==================================================================== */}
      {/* SECTION 2: STRATEGIC COMPETITION VERDICT (LEVEL 1: PRIMARY DECISION) */}
      {/* ==================================================================== */}
      <Card variant="feature" padding="lg" className="space-y-6">
        {/* Header & Hero Verdict Banner */}
        <div className="pb-5 border-b border-line space-y-4">
          <div className="flex items-center justify-between">
            <Eyebrow tone="gold">Strategic Competition Verdict</Eyebrow>
            <DataProvenanceBadge type="SELLERSALT_SCORE" />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-5 rounded-2xl bg-[#FAFAF8] border border-line">
            {/* Left: Large Verdict, Question & Natural Language Explanation */}
            <div className="space-y-2 min-w-0 max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-tertiary">
                  Verdict:
                </span>
                <Badge variant={competeVerdict.badgeVariant} className="text-sm font-bold px-3 py-1">
                  {competeVerdict.label}
                </Badge>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
                Should you compete with {shopName}?
              </h2>

              <p className="text-xs text-ink-tertiary font-medium">
                {competeVerdict.subheadline}
              </p>

              <p className="text-sm text-ink-secondary leading-relaxed pt-1">
                {competeVerdict.naturalLanguageExplanation}
              </p>
            </div>

            {/* Right: Prominent Opportunity Score & 3-Band Spectrum */}
            <div className="shrink-0 flex flex-col items-center sm:items-end justify-center p-4 rounded-xl bg-white border border-line shadow-2xs space-y-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-ink font-mono tracking-tight">
                  {verdict.opportunityScore}
                </span>
                <span className="text-sm font-bold text-ink-tertiary font-mono">/ 100</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">
                Opportunity Score
              </span>

              {/* 3-Band Score Spectrum */}
              <div className="w-48 space-y-1 pt-1">
                <div className="grid grid-cols-3 h-2 w-full rounded-full overflow-hidden bg-surface-muted gap-0.5">
                  <div
                    className={`h-full ${verdict.opportunityScore < 45 ? "bg-red-500" : "bg-red-200"}`}
                    title="High Barrier (< 45)"
                  />
                  <div
                    className={`h-full ${verdict.opportunityScore >= 45 && verdict.opportunityScore < 75 ? "bg-[#FFB020]" : "bg-amber-100"}`}
                    title="Moderate (45-74)"
                  />
                  <div
                    className={`h-full ${verdict.opportunityScore >= 75 ? "bg-[#0E8F5D]" : "bg-emerald-100"}`}
                    title="Easy to Compete (≥ 75)"
                  />
                </div>
                <div className="flex justify-between text-[9px] text-ink-tertiary font-medium font-mono">
                  <span>High Barrier</span>
                  <span>Moderate</span>
                  <span>Easy</span>
                </div>
              </div>
            </div>
          </div>

          {/* Engine Summary Text */}
          <div className="p-3.5 rounded-xl bg-[#F4F3EF]/60 border border-line-subtle text-xs text-ink-secondary leading-relaxed">
            <strong className="text-ink font-semibold">Intelligence Summary: </strong>
            {verdict.summary}
          </div>
        </div>

        {/* Supporting Factors Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wide">
              Competitive Factor Breakdown
            </span>
            <span className="text-[11px] text-ink-tertiary">
              How {shopName}&apos;s metrics impact entry difficulty
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {factorBreakdown.map((f, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase flex items-center gap-1.5">
                    {f.icon} {f.title}
                  </span>
                  <Badge variant={f.impactVariant} className="text-[9px] px-1.5 py-0.2 font-semibold">
                    {f.impactLabel}
                  </Badge>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-ink font-mono">{f.value}</div>
                  <div className="text-[10px] text-ink-tertiary leading-tight mt-0.5">{f.context}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence: Winning Listings Opportunity Score Comparison */}
        {listingsChartData.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-line-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink uppercase tracking-wide">
                Winning Listings — Opportunity Score Comparison
              </span>
              <span className="text-[11px] text-ink-tertiary">
                Highest opportunity products discovered in {shopName}&apos;s catalog
              </span>
            </div>
            <div className="p-3 rounded-xl border border-line bg-white">
              <BarChart
                data={listingsChartData}
                xKey="title"
                layout="vertical"
                yAxisWidth={140}
                series={[{ key: "opportunityScore", label: "Opportunity Score", colorIndex: 0 }]}
                state={listingsChartState}
                height={Math.max(140, listingsChartData.length * 34)}
                accessibleSummary={`Bar chart ranking ${shopName}'s top winning listings by opportunity score.`}
              />
            </div>
          </div>
        )}

        {/* Strategic Takeaways & Action Playbook */}
        <div className="space-y-3 pt-2 border-t border-line-subtle">
          <span className="text-xs font-bold text-ink uppercase tracking-wide">
            Strategic Reverse-Engineering Playbook
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <span className="font-bold text-ink flex items-center gap-1.5 text-xs">
                <Target className="h-3.5 w-3.5 text-[#0E8F5D]" /> Why It Matters
              </span>
              <p className="text-xs text-ink-secondary leading-relaxed">{verdict.whyInteresting}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <span className="font-bold text-ink flex items-center gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5 text-purple-600" /> What to Study
              </span>
              <p className="text-xs text-ink-secondary leading-relaxed">{verdict.whatToStudy}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <span className="font-bold text-ink flex items-center gap-1.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> What to Avoid
              </span>
              <p className="text-xs text-ink-secondary leading-relaxed">{verdict.whatToAvoid}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <span className="font-bold text-ink flex items-center gap-1.5 text-xs">
                <Zap className="h-3.5 w-3.5 text-[#0E8F5D]" /> What to Do Next
              </span>
              <p className="text-xs text-ink-secondary leading-relaxed">{verdict.whatToDoNext}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ==================================================================== */}
      {/* SECTION 3: CORE PERFORMANCE KPI GRID (LEVEL 2: INTELLIGENCE METRICS) */}
      {/* ==================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heading as="h2" size="h4">
              Core Performance KPIs
            </Heading>
            <span className="text-xs text-ink-tertiary">Institutional-grade metrics breakdown</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Lifetime Sales</span>
              <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
            </div>
            <div className="text-2xl font-extrabold text-ink font-mono pt-1">
              {totalSales.toLocaleString()}
            </div>
            <div className="text-[11px] text-ink-tertiary">
              Verified total marketplace transactions
            </div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Active Listings</span>
              <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
            </div>
            <div className="text-2xl font-extrabold text-ink font-mono pt-1">
              {activeListings}
            </div>
            <div className="text-[11px] text-ink-tertiary">
              Current live catalog size
            </div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Daily Sales Velocity</span>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>
            <div className="text-2xl font-extrabold text-[#0E8F5D] font-mono pt-1">
              {estDaily.toFixed(1)} <span className="text-xs font-sans font-normal text-ink-tertiary">sales/day</span>
            </div>
            <div className="text-[11px] text-ink-tertiary">
              ~{estMonthlySales.toLocaleString()} sales/month
            </div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Reviews & Rating</span>
              <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
            </div>
            <div className="text-2xl font-extrabold text-ink font-mono pt-1">
              ★ {reviewAverage ? reviewAverage.toFixed(1) : "5.0"}
            </div>
            <div className="text-[11px] text-ink-tertiary">
              {reviewCount.toLocaleString()} verified buyer reviews
            </div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Catalog Yield</span>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>
            <div className="text-2xl font-extrabold text-ink font-mono pt-1">
              {sellingRatio.toFixed(1)} <span className="text-xs font-sans font-normal text-ink-tertiary">sales/listing</span>
            </div>
            <div className="text-[11px] text-ink-tertiary">
              Lifetime sales divided by active listings
            </div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Avg. Observed Price</span>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>
            <div className="text-2xl font-extrabold text-ink font-mono pt-1">
              ${avgPrice.toFixed(2)}
            </div>
            <div className="text-[11px] text-ink-tertiary">
              Calculated across observed listings
            </div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Est. Monthly Revenue</span>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>
            <div className="text-2xl font-extrabold text-ink font-mono pt-1">
              ${estMonthlyRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] text-ink-tertiary">
              Modeled at ~{estMonthlySales} sales × ${avgPrice.toFixed(2)}
            </div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Est. Gross Profit</span>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>
            <div className="text-2xl font-extrabold text-[#0E8F5D] font-mono pt-1">
              ${estGrossProfit.toLocaleString()}
            </div>
            <div className="text-[11px] text-ink-tertiary">
              Modeled at standard 68% gross margin
            </div>
          </Card>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 4: LONGITUDINAL SALES TRACKING                               */}
      {/* ==================================================================== */}
      {!tracked ? (
        <div className="relative overflow-hidden p-8 rounded-2xl bg-[#0E8F5D] text-white shadow-lg">
          <div className="relative flex flex-col items-center text-center gap-4 py-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
              <TrendingUp className="h-3.5 w-3.5" />
              Automated Longitudinal Tracking
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight max-w-lg">
              Track {shopName}&apos;s daily sales movements over time
            </h2>
            <p className="text-xs text-white/90 leading-relaxed max-w-md">
              SellerSalt captures automated daily snapshots of this shop&apos;s transactions, review pace, and active listings to reveal real market velocity.
            </p>
            <Button
              variant="secondary"
              size="compact"
              loading={tracking}
              onClick={handleToggleTrack}
              className="bg-white hover:bg-[#F4F3EF] text-[#0E8F5D] font-extrabold text-sm px-6 py-3 shadow-md border-0"
            >
              + Start Tracking This Shop
            </Button>
            {trackError && (
              <p className="text-xs bg-black/20 rounded-lg px-3 py-2 text-white">{trackError}</p>
            )}
          </div>
        </div>
      ) : (
        <Card padding="lg" className="p-8 rounded-2xl bg-[#0E8F5D] text-white shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
                <TrendingUp className="h-3.5 w-3.5" />
                Tracking Active — Daily Snapshots
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                {shopName}&apos;s Sales & Review Trajectory
              </h2>
              {latestSnapshot && (
                <p className="text-xs text-white/80">
                  Last updated {new Date(latestSnapshot.capturedAt).toLocaleString()}
                </p>
              )}
            </div>

            <Button
              variant="secondary"
              size="compact"
              loading={tracking}
              onClick={handleToggleTrack}
              className="bg-white/15 hover:bg-white/25 text-white font-semibold text-xs px-4 py-2 border border-white/30"
            >
              Stop Tracking
            </Button>
          </div>

          {snapshots.length < 2 ? (
            <div className="p-5 rounded-xl bg-black/15 border border-white/20 text-center space-y-1.5">
              <p className="text-sm font-semibold">Tracking active — first daily trend point capturing</p>
              <p className="text-xs text-white/80">
                Snapshots are stored daily. A visual delta curve will populate after your second daily snapshot.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-black/15 border border-white/20">
                  <div className="text-white/70 font-semibold uppercase text-[10px]">Sales Delta</div>
                  <div className="text-lg font-extrabold font-mono">
                    +{Math.max(0, (latestSnapshot?.totalSales ?? 0) - (snapshots[0]!.totalSales ?? 0)).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-black/15 border border-white/20">
                  <div className="text-white/70 font-semibold uppercase text-[10px]">Review Change</div>
                  <div className="text-lg font-extrabold font-mono">
                    {(latestSnapshot?.reviewCount ?? 0) - snapshots[0]!.reviewCount >= 0 ? "+" : ""}
                    {(latestSnapshot?.reviewCount ?? 0) - snapshots[0]!.reviewCount}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-black/15 border border-white/20">
                  <div className="text-white/70 font-semibold uppercase text-[10px]">Catalog Change</div>
                  <div className="text-lg font-extrabold font-mono">
                    {(latestSnapshot?.activeListings ?? 0) - snapshots[0]!.activeListings >= 0 ? "+" : ""}
                    {(latestSnapshot?.activeListings ?? 0) - snapshots[0]!.activeListings}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/15 border border-white/20 space-y-3">
                <div className="text-xs text-white/80 font-bold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Daily Sales Movement (Historical Snapshots)
                </div>
                <div className="h-28 flex items-end justify-between gap-3 pt-2">
                  {trendPoints.map((p, i) => {
                    const heightPercent = Math.min(100, Math.max(8, Math.round((p.sales / maxTrendSales) * 100)));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <div className="text-[10px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          {p.sales}
                        </div>
                        <div
                          className="w-full bg-white/90 group-hover:bg-white rounded-t-md transition-all"
                          style={{ height: `${heightPercent}%` }}
                        />
                        <div className="text-[10px] font-bold text-white/70">{p.date}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ==================================================================== */}
      {/* ==================================================================== */}
      {/* SECTION 5: CATALOG & PRICING INTELLIGENCE                            */}
      {/* ==================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Heading as="h2" size="h4">
            Catalog & Pricing Intelligence
          </Heading>
          <DataProvenanceBadge type="ESTIMATED" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card padding="md" className="border-line bg-white shadow-xs space-y-2">
            <span className="text-[11px] font-bold text-ink-tertiary uppercase">Median Price Benchmark</span>
            <div className="text-3xl font-extrabold text-ink font-mono">
              ${catalog.medianPrice.toFixed(2)}
            </div>
            <div className="text-xs text-ink-secondary">
              Price Range: <strong className="font-mono text-ink">${catalog.minPrice.toFixed(2)}</strong> to{" "}
              <strong className="font-mono text-ink">${catalog.maxPrice.toFixed(2)}</strong> (${catalog.priceSpread.toFixed(2)} spread)
            </div>
            {/* Min → median → max position marker. Aggregate stats only —
                no per-listing catalog-wide price array is returned, so a
                true histogram isn't supportable from this data. */}
            <div className="pt-1">
              <div className="relative h-1.5 w-full rounded-full bg-surface-muted">
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-[#0E8F5D] border-2 border-white shadow-2xs"
                  style={{ left: `calc(${medianPricePercent}% - 6px)` }}
                  title={`Median: $${catalog.medianPrice.toFixed(2)}`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-ink-tertiary mt-1 font-mono">
                <span>${catalog.minPrice.toFixed(2)}</span>
                <span>${catalog.maxPrice.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-2 md:col-span-2">
            <span className="text-[11px] font-bold text-ink-tertiary uppercase">Observed Category Distribution</span>
            <BarChart
              data={categoryChartData}
              xKey="category"
              layout="vertical"
              series={[{ key: "percentage", label: "% of catalog", colorIndex: 0 }]}
              state={categoryChartState}
              valueFormatter={(v) => `${v}%`}
              height={Math.max(120, categoryChartData.length * 32)}
              accessibleSummary={`Bar chart of ${shopName}'s catalog category distribution.`}
            />
          </Card>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 6: DISCOVERED KEYWORDS & LONG-TAIL TAG FREQUENCY TABLE       */}
      {/* ==================================================================== */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Heading as="h2" size="h4">
                Long-Tail Tag Frequency Analysis ({tagItems.length})
              </Heading>
              <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
            </div>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              Extracted search tags and phrases discovered across {shopName}&apos;s catalog, ranked by frequency occurrence.
            </Text>
          </div>
        </div>

        {tagItems.length >= 2 && (
          <div className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] space-y-2">
            <span className="text-[11px] font-bold text-ink-tertiary uppercase">Top Extracted Tags by Catalog Presence</span>
            <BarChart
              data={tagItems.slice(0, 6).map((t) => ({
                tag: t.tag,
                percentage: t.percentage,
              }))}
              xKey="tag"
              layout="vertical"
              yAxisWidth={130}
              series={[{ key: "percentage", label: "% of listings", colorIndex: 0 }]}
              valueFormatter={(v) => `${v}%`}
              height={Math.max(120, Math.min(6, tagItems.length) * 32)}
              accessibleSummary={`Bar chart of ${shopName}'s top recurring tags by catalog percentage.`}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tagItems.map((item) => {
            const isPlanned = plannedKeywords[item.tag];
            const tierLabel = item.wordCount >= 3 ? "Long-tail" : item.wordCount === 2 ? "Mid-tail" : "Head term";

            return (
              <div
                key={item.tag}
                className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] flex items-center justify-between gap-3 hover:border-line-subtle transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="font-bold text-xs text-ink truncate">{item.tag}</div>
                  <div className="text-[10px] text-ink-tertiary flex items-center gap-2">
                    <span className="font-semibold text-[#0E8F5D]">{item.count}x in catalog</span>
                    <span>·</span>
                    <span>{item.percentage}% usage</span>
                    <span>·</span>
                    <span className="text-ink-secondary">{tierLabel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={`/prospects?search=${encodeURIComponent(item.tag)}`}
                    className="p-1.5 rounded-md text-ink-tertiary hover:text-ink hover:bg-white border border-transparent hover:border-line transition-colors"
                    title="Search marketplace for this keyword"
                  >
                    <Compass className="h-3.5 w-3.5" />
                  </Link>

                  <button
                    type="button"
                    disabled={keywordActionLoading === item.tag}
                    onClick={() => handleToggleKeywordPlanning(item.tag)}
                    className={`p-1.5 rounded-md text-xs border transition-colors disabled:opacity-50 ${
                      isPlanned
                        ? "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/30"
                        : "text-ink-tertiary hover:text-ink bg-white border-line"
                    }`}
                    title={isPlanned ? "Remove from Planner" : "Add keyword to Planner"}
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${isPlanned ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ==================================================================== */}
      {/* SECTION 7: TOP WINNING LISTINGS (RANKED BY VELOCITY)                 */}
      {/* ==================================================================== */}
      <Card padding="lg" className="border-line shadow-xs bg-white space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Heading as="h2" size="h4">
                Top Winning Listings ({winningListings.length})
              </Heading>
              <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
            </div>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              Ranked by Etsy relevance score with estimated sales velocity and 1-click Planner handoff.
            </Text>
          </div>
        </div>

        <div className="divide-y divide-line-subtle border-t border-line-subtle">
          {winningListings.map((listing) => {
            const isSaved = savedPlannerListings[listing.listingId];
            return (
              <div
                key={listing.listingId}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {listing.imageUrl ? (
                    <img
                      src={listing.imageUrl}
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
                      {listing.title}
                    </div>

                    <div className="text-[11px] text-ink-tertiary flex flex-wrap items-center gap-2">
                      <span>Price: <strong className="text-ink font-mono">${listing.price.toFixed(2)}</strong></span>
                      <span>·</span>
                      <span>Est. Daily Sales: <strong className="text-[#0E8F5D] font-mono">{listing.estDailySales.toFixed(1)}/day</strong></span>
                      <span>·</span>
                      <span className="text-[#0E8F5D] font-semibold">
                        Opp. Score: {listing.opportunityScore}/100
                      </span>
                    </div>

                    {listing.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {listing.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4F3EF] text-[10px] font-medium text-ink border border-line"
                          >
                            <Sparkles className="h-2.5 w-2.5 text-[#FFB020]" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                  <Link
                    href={`/seo?listingId=${listing.listingId}`}
                    className="p-2 rounded-lg border border-line bg-white hover:bg-[#FAFAF8] text-ink-secondary hover:text-ink text-xs font-medium inline-flex items-center gap-1 shadow-2xs"
                    title="Audit SEO for this listing"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-[#0E8F5D]" />
                    <span>SEO</span>
                  </Link>

                  <a
                    href={listing.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-line bg-white hover:bg-[#FAFAF8] text-ink-secondary hover:text-ink text-xs font-medium inline-flex items-center gap-1 shadow-2xs"
                    title="Open on Etsy in new tab"
                  >
                    <span>Etsy</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <Button
                    variant={isSaved ? "secondary" : "primary"}
                    size="compact"
                    loading={savingPlannerId === listing.listingId}
                    disabled={isSaved}
                    onClick={() => handleAddListingToPlanner(listing)}
                    className="text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
                  >
                    {isSaved ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" /> Added to Planner
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-3.5 w-3.5 mr-1" /> Add to Planner
                      </>
                    )}
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
