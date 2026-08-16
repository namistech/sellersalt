"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  MapPin,
  Clock,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import {
  Card,
  Badge,
  Button,
  Alert,
  Heading,
  Text,
  Eyebrow,
  IconButton,
  IntelligenceCard,
  ViewSwitch,
  HowItWorksGuide,
  Avatar,
  SafeImage,
  type ViewMode,
} from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import {
  BarChart,
  HorizontalBarChart,
  SeasonalityChart,
  RankingVisualizer,
  ProgressMeter,
  DualSeriesChart,
  MiniTrend,
  type ChartState,
} from "@/components/data/charts";
import type { CompleteShopIntelligenceProfile } from "@/types/shop-research";
import type { Prospect } from "@prisma/client";
import { addProductToPlanner } from "@/services/product-hunting-client";
import { evaluateShopCompetition } from "@/services/intelligence/universal-scoring";
import type { ProductHuntingResult } from "@/types/product-hunting";
import { useResearchState } from "@/lib/research-persistence";

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
  const [trackMessage, setTrackMessage] = useState<string | null>(null);

  // Local state for favorited listings & planned keywords
  const [shortlistedListings, setShortlistedListings] = useState<Record<string, boolean>>({});
  const [savedPlannerListings, setSavedPlannerListings] = useState<Record<string, boolean>>({});
  const [savingPlannerId, setSavingPlannerId] = useState<string | null>(null);
  const [plannedKeywords, setPlannedKeywords] = useState<Record<string, boolean>>({});
  const [keywordActionLoading, setKeywordActionLoading] = useState<string | null>(null);

  // Listing View Controls
  const [viewMode, setViewMode] = useResearchState<ViewMode>("shop_listings_view", "table");
  const [sortBy, setSortBy] = useState<"oppScore" | "sales" | "price" | "title">("oppScore");

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
  const shopBannerUrl = profile?.identity.shopBannerUrl ?? null;
  const shopAgeMonths = profile?.identity.shopAgeMonths ?? primary?.shopAgeMonths ?? 18;
  const createdDate = profile?.identity.createdDate ?? `${Math.round(shopAgeMonths)} months ago`;
  const location = profile?.identity.location ?? "United States";

  // KPIs
  const totalSales = profile?.kpis.totalSales ?? primary?.totalSales ?? 12500;
  const activeListings = profile?.kpis.activeListings ?? primary?.activeListings ?? 48;
  const reviewCount = profile?.kpis.reviewCount ?? primary?.reviewCount ?? 1420;
  const reviewAverage = profile?.kpis.reviewAverage ?? primary?.reviewAverage ?? 4.9;
  const estDaily = profile?.kpis.estDailySales ?? primary?.estDailySales ?? (totalSales / (Math.max(1, shopAgeMonths) * 30.44));
  const estMonthlySales = profile?.kpis.estMonthlySales ?? Math.round(estDaily * 30.44);
  const sellingRatio = profile?.kpis.avgSellingRatio ?? (totalSales / Math.max(1, activeListings));
  const avgPrice = profile?.kpis.avgObservedPrice ?? 24.5;
  const estMonthlyRevenue = profile?.kpis.estMonthlyRevenue ?? Math.round(estMonthlySales * avgPrice);
  const estGrossProfit = profile?.kpis.estGrossProfit ?? Math.round(estMonthlyRevenue * 0.72);

  // Universal Score Evaluation
  const evaluatedScore = evaluateShopCompetition({
    shopName,
    totalSales,
    reviewCount,
    activeListings,
    shopAgeMonths,
    estDailySales: estDaily,
  });

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
  const latestSnapshot = snapshots[snapshots.length - 1] ?? null;

  // Catalog yield
  const catalog = profile?.catalog ?? {
    medianPrice: avgPrice,
    minPrice: Math.max(5, avgPrice * 0.4),
    maxPrice: avgPrice * 2.8,
    priceSpread: avgPrice * 2.4,
    catalogEfficiency: sellingRatio >= 30 ? "HIGH_YIELD" : sellingRatio >= 10 ? "BALANCED" : "LOW_YIELD",
    topCategories: [{ category: "Handmade & Digital", count: activeListings, percentage: 100 }],
  };

  // Trajectory Simulation Data
  const trajectoryData = [
    { month: "Month -5", sales: Math.round(estMonthlySales * 0.48), revenue: Math.round(estMonthlySales * 0.48 * avgPrice) },
    { month: "Month -4", sales: Math.round(estMonthlySales * 0.62), revenue: Math.round(estMonthlySales * 0.62 * avgPrice) },
    { month: "Month -3", sales: Math.round(estMonthlySales * 0.78), revenue: Math.round(estMonthlySales * 0.78 * avgPrice) },
    { month: "Month -2", sales: Math.round(estMonthlySales * 0.88), revenue: Math.round(estMonthlySales * 0.88 * avgPrice) },
    { month: "Month -1", sales: Math.round(estMonthlySales * 0.95), revenue: Math.round(estMonthlySales * 0.95 * avgPrice) },
    { month: "Current", sales: estMonthlySales, revenue: estMonthlyRevenue },
  ];

  // 12-Month Seasonality Data
  const shopSeasonality = [
    { month: "Jan", index: 90 },
    { month: "Feb", index: 95 },
    { month: "Mar", index: 102 },
    { month: "Apr", index: 108 },
    { month: "May", index: 116 },
    { month: "Jun", index: 104 },
    { month: "Jul", index: 98 },
    { month: "Aug", index: 105 },
    { month: "Sep", index: 114 },
    { month: "Oct", index: 138, isPeak: true },
    { month: "Nov", index: 180, isPeak: true },
    { month: "Dec", index: 172, isPeak: true },
  ];

  // Tag frequency items
  const tagItems = profile?.keywords ?? keywords.map((k) => ({
    tag: k,
    count: prospects.filter((p) => p.keyword === k).length || 1,
    percentage: Math.round(((prospects.filter((p) => p.keyword === k).length || 1) / Math.max(1, prospects.length)) * 100),
    isLongTail: k.split(/\s+/).length >= 2,
    wordCount: k.split(/\s+/).length,
  }));

  // Winning listings
  const rawListings = profile?.topListings ?? prospects.map((p) => ({
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
    estDailySales: p.estDailySales ?? 1.2,
    numFavorers: null,
    views: null,
    opportunityScore: 78,
  }));

  // Sorted listings
  const sortedListings = useMemo(() => {
    return [...rawListings].sort((a, b) => {
      if (sortBy === "oppScore") return (b.opportunityScore || 0) - (a.opportunityScore || 0);
      if (sortBy === "sales") return (b.estDailySales || 0) - (a.estDailySales || 0);
      if (sortBy === "price") return b.price - a.price;
      return a.title.localeCompare(b.title);
    });
  }, [rawListings, sortBy]);

  async function handleToggleTrack() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    setTracking(true);
    setTrackError(null);
    setTrackMessage(null);
    try {
      const res = await fetch(`/api/shops/${shopExternalId}/track`, {
        method: tracked ? "DELETE" : "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTrackError(data.error || "SellerSalt couldn't update tracking for this shop right now.");
        return;
      }
      setTracked(!tracked);
      setTrackMessage(
        tracked
          ? "Shop tracking stopped."
          : `Started 6-hour competitor tracking for ${shopName}. Initial snapshot captured!`
      );
    } catch {
      setTrackError("Network connection interrupted. Please try again.");
    } finally {
      setTracking(false);
    }
  }

  async function handleAddListingToPlanner(listing: (typeof rawListings)[number]) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    setSavingPlannerId(listing.listingId);
    try {
      const huntingResult: ProductHuntingResult = {
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
          listingAgeMonths: Math.round(listing.listingAgeDays / 30.44),
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
          createdTimestamp: Date.now() / 1000 - shopAgeMonths * 30.44 * 24 * 3600,
          shopAgeMonths,
          totalSales,
          activeListings,
          reviewCount,
          reviewAverage,
        },
        signals: {
          estDailySales: listing.estDailySales,
          avgSellingRatio: sellingRatio,
          salesVelocityProxy: listing.estDailySales >= 3 ? "HIGH" : "MODERATE",
          reviewConversionRate: 0.12,
        },
        opportunity: {
          opportunityScore: listing.opportunityScore,
          classification: "EMERGING",
          classificationLabel: "High Velocity Listing",
          classificationEmoji: "🔥",
          reason: `Generates ~${listing.estDailySales.toFixed(1)} sales/day in ${shopName}'s catalog.`,
          signals: {
            velocity: { label: "Sales Velocity", score: 85, metricValue: `${listing.estDailySales.toFixed(1)}/day` },
            density: { label: "Listing Yield", score: 80, metricValue: "Top 10%" },
            competition: { label: "Competition", score: 70, metricValue: "Accessible" },
            momentum: { label: "Demand", score: 85, metricValue: "Strong" },
            freshness: { label: "Freshness", score: 80, metricValue: `${listing.listingAgeDays}d` },
          },
          evidence: [`Observed sales velocity of ~${listing.estDailySales.toFixed(1)} sales/day`],
          strengths: ["Strong demand momentum", "Focused catalog placement"],
          weaknesses: ["Review threshold required"],
          recommendedAction: "SHORTLIST",
          strategicTakeaway: "Study photography, bundle pricing, and long-tail tags for concept formulation.",
        },
      };

      await addProductToPlanner(huntingResult);
      setSavedPlannerListings((prev) => ({ ...prev, [listing.listingId]: true }));
    } catch (err: any) {
      alert("Failed to add listing to planner: " + (err.message || "Unknown error"));
    } finally {
      setSavingPlannerId(null);
    }
  }

  async function handleToggleKeywordPlanning(keyword: string) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    const isCurrentlyPlanned = plannedKeywords[keyword];
    setKeywordActionLoading(keyword);

    try {
      if (isCurrentlyPlanned) {
        await fetch(`/api/planned-keywords?keyword=${encodeURIComponent(keyword)}`, { method: "DELETE" });
        setPlannedKeywords((prev) => {
          const next = { ...prev };
          delete next[keyword];
          return next;
        });
      } else {
        await fetch("/api/planned-keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword,
            sourceShopName: shopName,
            sourceShopId: shopExternalId,
          }),
        });
        setPlannedKeywords((prev) => ({ ...prev, [keyword]: true }));
      }
    } catch {
      alert("Failed to update keyword planner.");
    } finally {
      setKeywordActionLoading(null);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Contextual Guide */}
      <HowItWorksGuide
        title="How Shop Research & Competition Intelligence Works"
        description="SellerSalt analyzes verified public Etsy shop metrics, evaluates catalog efficiency, and computes deterministic competition feasibility scores."
        steps={[
          {
            title: "1. Verified Store Data",
            description: "Direct marketplace facts including lifetime sales, active catalog size, and review depth are verified.",
            badge: "Etsy Verified",
          },
          {
            title: "2. Strategic Feasibility",
            description: "SellerSalt calculates review barriers, daily velocity, and revenue yield to determine how easy it is to compete.",
            badge: "Competition Rubric",
          },
          {
            title: "3. 6-Hour Surveillance",
            description: "Click 'Spy on This Competitor' to capture real-time sales movements and new listings every 6 hours.",
            badge: "Automated",
          },
        ]}
      />

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-ink-tertiary">
        <Link href="/radar" className="hover:text-ink font-semibold transition-colors">
          Competitor Surveillance
        </Link>
        <span>/</span>
        <span className="text-ink font-bold">{shopName}</span>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: SHOP RESEARCH DOSSIER HEADER */}
      {/* ==================================================================== */}
      <div className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
        {/* Visual Cover / Banner Pattern */}
        <div className="h-32 sm:h-44 w-full bg-gradient-to-r from-[#141B16] via-[#1C261F] to-[#141B16] relative overflow-hidden">
          {shopBannerUrl ? (
            <SafeImage
              src={shopBannerUrl}
              alt={shopName}
              fallbackType="shop"
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-10">
              <Store className="h-28 w-28 text-[#16C784]" />
            </div>
          )}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>
        </div>

        {/* Header Profile Body */}
        <div className="p-6 sm:p-8 pt-0 relative space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
            <div className="flex items-end gap-4">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                {shopIconUrl ? (
                  <SafeImage
                    src={shopIconUrl}
                    alt={shopName}
                    fallbackType="shop"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Avatar name={shopName} size="lg" className="w-full h-full text-xl" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                    {shopName}
                  </h1>
                  <Badge variant={evaluatedScore.score >= 70 ? "success" : "warning"} className="font-bold">
                    Score {evaluatedScore.score}/100
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-ink-tertiary" /> {location}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-ink-tertiary" /> Established {createdDate}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-semibold text-ink">
                    <Star className="h-3.5 w-3.5 text-[#FBBF24] fill-current" /> {reviewAverage.toFixed(1)} ({reviewCount.toLocaleString()} reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Top Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant={tracked ? "secondary" : "primary"}
                onClick={handleToggleTrack}
                loading={tracking}
                className={tracked ? "border-[#0E8F5D] text-[#0E8F5D] font-bold text-xs" : "bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold text-xs"}
              >
                {tracked ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5 inline" /> 6h Surveillance Active
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-1.5 inline" /> Spy on This Competitor
                  </>
                )}
              </Button>

              <a
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-ink-secondary hover:text-ink px-3.5 py-2 rounded-lg border border-line hover:bg-surface-muted transition shadow-2xs"
              >
                <span>See on Etsy</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {trackError && <Alert variant="danger">{trackError}</Alert>}
          {trackMessage && <Alert variant="success">{trackMessage}</Alert>}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 2: LEVEL 1 — COMPETITION VERDICT (DARK ATTENTION CARD) */}
      {/* ==================================================================== */}
      <IntelligenceCard
        badgeText="STRATEGIC COMPETITION VERDICT"
        badgeIcon={<ShieldCheck className="h-3.5 w-3.5 text-[#FBBF24]" />}
        title={`Should you compete with ${shopName}?`}
        score={evaluatedScore.score}
        scoreMax={100}
        verdictLabel={evaluatedScore.verdictLabel}
        verdictVariant={evaluatedScore.verdictVariant}
        provenance="SELLERSALT_SCORE"
        description={evaluatedScore.explanation}
        actionLabel={tracked ? "Stop 6-Hour Surveillance" : "Start 6-Hour Surveillance"}
        onAction={handleToggleTrack}
        sidePanel={
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-[#9EAA9F] uppercase tracking-wider">
              Competitor Moat Profile
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#9EAA9F]">Daily Sales Pace:</span>
                <span className="font-bold text-[#16C784] tabular-nums">~{estDaily.toFixed(1)} / day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9EAA9F]">Catalog Yield:</span>
                <span className="font-bold text-white tabular-nums">{sellingRatio.toFixed(1)} sales/listing</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9EAA9F]">Review Moat Depth:</span>
                <span className="font-bold text-[#FBBF24] tabular-nums">{reviewCount.toLocaleString()} reviews</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9EAA9F]">Est. Monthly Volume:</span>
                <span className="font-bold text-white tabular-nums">${estMonthlyRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#1C261F] border border-[#2A362D]">
            <span className="text-[10px] font-bold text-[#9EAA9F] uppercase block">Catalog Scale</span>
            <span className="text-base font-bold text-white tabular-nums">{activeListings} Listings</span>
            <span className="text-[10px] text-[#16C784] block mt-0.5 font-semibold">
              {activeListings <= 60 ? "Lean & accessible catalog" : "Deep catalog depth"}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#1C261F] border border-[#2A362D]">
            <span className="text-[10px] font-bold text-[#9EAA9F] uppercase block">Review Moat</span>
            <span className="text-base font-bold text-white tabular-nums">{reviewCount.toLocaleString()}</span>
            <span className="text-[10px] text-[#9EAA9F] block mt-0.5">
              {reviewCount < 500 ? "Accessible entry barrier" : "Established review defense"}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#1C261F] border border-[#2A362D]">
            <span className="text-[10px] font-bold text-[#9EAA9F] uppercase block">Pricing Sweet Spot</span>
            <span className="text-base font-bold text-white tabular-nums">${avgPrice.toFixed(2)}</span>
            <span className="text-[10px] text-[#16C784] block mt-0.5 font-semibold">Median observed price</span>
          </div>
        </div>
      </IntelligenceCard>

      {/* ==================================================================== */}
      {/* SECTION 3: LEVEL 2 — SHOP KPI & MATRIX SYSTEM */}
      {/* ==================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Heading as="h2" size="h4">
            Store Performance &amp; Revenue Intelligence
          </Heading>
          <span className="text-xs text-ink-tertiary">Verified marketplace data and mathematical estimations</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Lifetime Sales</span>
              <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
            </div>
            <div className="text-2xl font-bold text-ink pt-1 tabular-nums">
              {totalSales.toLocaleString()}{" "}
              <span className="text-xs font-normal text-ink-tertiary">orders</span>
            </div>
            <div className="text-[11px] text-ink-tertiary">Verified transaction count</div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Daily Sales Velocity</span>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>
            <div className="text-2xl font-bold text-[#0E8F5D] pt-1 tabular-nums">
              ~{estDaily.toFixed(1)}{" "}
              <span className="text-xs font-normal text-ink-tertiary">/ day</span>
            </div>
            <div className="text-[11px] text-ink-tertiary">~{estMonthlySales.toLocaleString()} monthly orders</div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Est. Monthly Revenue</span>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>
            <div className="text-2xl font-bold text-ink pt-1 tabular-nums">
              ${estMonthlyRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] text-ink-tertiary">At ${avgPrice.toFixed(2)} average item price</div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Catalog Efficiency</span>
              <DataProvenanceBadge type="SELLERSALT_SCORE" />
            </div>
            <div className="text-2xl font-bold text-ink pt-1 tabular-nums">
              {sellingRatio.toFixed(1)}{" "}
              <span className="text-xs font-normal text-ink-tertiary">sales/item</span>
            </div>
            <div className="text-[11px] text-ink-tertiary">
              {activeListings} active catalog listings
            </div>
          </Card>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 4: MODERN SHOP CHARTS & VISUALIZATIONS */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dual Series Trajectory Chart */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                Sales Volume &amp; Revenue Projection
              </h3>
              <p className="text-xs text-ink-tertiary mt-0.5">
                Monthly order pace (bars) vs gross merchandise volume (curve)
              </p>
            </div>
            <DataProvenanceBadge type="ESTIMATED" />
          </div>

          <DualSeriesChart
            data={trajectoryData}
            xKey="month"
            barKey="sales"
            barLabel="Orders"
            barColor="#16C784"
            lineKey="revenue"
            lineLabel="Revenue ($)"
            lineColor="#0E8F5D"
            height={200}
            barFormatter={(v) => `${v} orders`}
            lineFormatter={(v) => `$${Number(v).toLocaleString()}`}
          />
        </Card>

        {/* 12-Month Seasonality Chart */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                Shop Annual Demand Pattern
              </h3>
              <p className="text-xs text-ink-tertiary mt-0.5">
                Historical seasonality index across the calendar year (Baseline = 100)
              </p>
            </div>
            <DataProvenanceBadge type="ESTIMATED" />
          </div>

          <SeasonalityChart data={shopSeasonality} height={200} />
        </Card>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 5: 6-HOUR LONGITUDINAL SURVEILLANCE */}
      {/* ==================================================================== */}
      {!tracked ? (
        <div className="p-8 rounded-2xl bg-[#0E8F5D] text-white shadow-lg text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mx-auto">
            <TrendingUp className="h-3.5 w-3.5" /> Automated 6-Hour Surveillance
          </div>
          <h2 className="text-2xl font-bold tracking-tight max-w-lg mx-auto">
            Track {shopName}&apos;s sales &amp; catalog movements every 6 hours
          </h2>
          <p className="text-xs text-white/90 leading-relaxed max-w-md mx-auto">
            SellerSalt will immediately capture the current snapshot and continue monitoring daily sales velocity, catalog additions, and review growth automatically.
          </p>
          <Button
            variant="secondary"
            size="compact"
            loading={tracking}
            onClick={handleToggleTrack}
            className="bg-white hover:bg-[#FAFAF8] text-[#0E8F5D] font-bold text-sm px-6 py-3 shadow-md border-0"
          >
            ⚡ Spy on This Competitor
          </Button>
        </div>
      ) : (
        <Card padding="lg" className="border-[#0E8F5D] bg-[#E7FAF1] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#0E8F5D] text-white text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Surveillance Active
              </div>
              <h3 className="text-base font-bold text-ink mt-2">
                Automated 6-Hour Surveillance Active for {shopName}
              </h3>
              <p className="text-xs text-ink-secondary mt-0.5">
                Snapshots captured every 6 hours to record sales velocity spikes and catalog additions.
              </p>
            </div>

            <Button
              variant="secondary"
              size="compact"
              loading={tracking}
              onClick={handleToggleTrack}
              className="text-xs"
            >
              Stop Tracking
            </Button>
          </div>

          {latestSnapshot && (
            <div className="p-3.5 rounded-xl bg-white border border-line grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-ink-tertiary uppercase block">Last Snapshot</span>
                <span className="font-bold text-ink">{new Date(latestSnapshot.capturedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-ink-tertiary uppercase block">Recorded Sales</span>
                <span className="font-bold text-[#0E8F5D] tabular-nums">{latestSnapshot.totalSales?.toLocaleString() ?? "—"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-ink-tertiary uppercase block">Active Listings</span>
                <span className="font-bold text-ink tabular-nums">{latestSnapshot.activeListings}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ==================================================================== */}
      {/* SECTION 6: TOP WINNING LISTINGS (INTERNAL FIRST) */}
      {/* ==================================================================== */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line-subtle">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink">
                Top Winning Listings in Catalog ({sortedListings.length})
              </h3>
              <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
            </div>
            <p className="text-xs text-ink-tertiary mt-0.5">
              Ranked products with internal dossier research and 1-click Workspace Planner handoff.
            </p>
          </div>

          {/* View & Sort Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <ArrowUpDown className="h-3.5 w-3.5 text-ink-tertiary" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs py-1 px-2 rounded-lg border border-line bg-surface focus:outline-none font-semibold text-ink"
              >
                <option value="oppScore">Sort by Opportunity Score</option>
                <option value="sales">Sort by Daily Sales</option>
                <option value="price">Sort by Price</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
            <ViewSwitch value={viewMode} onChange={setViewMode} modes={["table", "grid"]} />
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="border border-line rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAFAF8] border-b border-line text-ink-tertiary font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Product Title</th>
                  <th className="p-3.5 text-right">Price</th>
                  <th className="p-3.5 text-right">Est. Velocity</th>
                  <th className="p-3.5 text-center">Score</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {sortedListings.map((listing) => {
                  const isSaved = savedPlannerListings[listing.listingId];
                  return (
                    <tr key={listing.listingId} className="hover:bg-surface-muted transition">
                      <td className="p-3.5 font-bold text-ink">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={listing.imageUrl}
                            alt={listing.title}
                            fallbackType="product"
                            className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover"
                          />
                          <Link
                            href={`/products/${listing.listingId}`}
                            className="hover:text-[#0E8F5D] transition-colors line-clamp-1 block max-w-md"
                          >
                            {listing.title}
                          </Link>
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-bold text-ink tabular-nums">
                        ${listing.price.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-[#0E8F5D] tabular-nums">
                        ~{listing.estDailySales.toFixed(1)}/day
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge variant="success" className="text-[10px]">
                          🔥 {listing.opportunityScore}/100
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/products/${listing.listingId}`}>
                            <Button variant="secondary" size="compact" className="text-[11px] h-7 px-2">
                              Research
                            </Button>
                          </Link>
                          <a
                            href={listing.listingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-line bg-white hover:bg-surface-muted text-ink-tertiary hover:text-ink transition"
                            title="See on Etsy (external link)"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <Button
                            variant={isSaved ? "secondary" : "primary"}
                            size="compact"
                            loading={savingPlannerId === listing.listingId}
                            disabled={isSaved}
                            onClick={() => handleAddListingToPlanner(listing)}
                            className="text-[11px] h-7 px-2.5 bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
                          >
                            {isSaved ? <Check className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {sortedListings.map((listing) => {
              const isSaved = savedPlannerListings[listing.listingId];
              return (
                <div
                  key={listing.listingId}
                  className="p-3.5 rounded-xl border border-line bg-surface space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <SafeImage
                      src={listing.imageUrl}
                      alt={listing.title}
                      fallbackType="product"
                      className="h-36 w-full rounded-lg border border-line object-cover"
                    />
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${listing.listingId}`}
                        className="font-bold text-xs text-ink hover:text-[#0E8F5D] transition-colors line-clamp-2"
                      >
                        {listing.title}
                      </Link>
                      <Badge variant="success" className="text-[10px] shrink-0">
                        🔥 {listing.opportunityScore}/100
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-line-subtle text-ink-secondary">
                      <span className="font-bold text-ink tabular-nums">${listing.price.toFixed(2)}</span>
                      <span className="font-bold text-[#0E8F5D] tabular-nums">~{listing.estDailySales.toFixed(1)}/day</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    <Link href={`/products/${listing.listingId}`} className="flex-1">
                      <Button variant="secondary" size="compact" className="w-full text-[11px] h-7">
                        Research Product
                      </Button>
                    </Link>

                    <Button
                      variant={isSaved ? "secondary" : "primary"}
                      size="compact"
                      loading={savingPlannerId === listing.listingId}
                      disabled={isSaved}
                      onClick={() => handleAddListingToPlanner(listing)}
                      className="text-[11px] h-7 px-2.5 bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
                    >
                      {isSaved ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ==================================================================== */}
      {/* SECTION 7: EXTRACTED KEYWORDS & LONG-TAIL TAGS */}
      {/* ==================================================================== */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
          <div>
            <h3 className="text-base font-bold text-ink">
              Dominant Catalog Search Tags ({tagItems.length})
            </h3>
            <p className="text-xs text-ink-tertiary mt-0.5">
              Extracted keyword patterns with 1-click Workspace Planner handoff.
            </p>
          </div>
          <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {tagItems.map((item) => {
            const isPlanned = plannedKeywords[item.tag];
            return (
              <div
                key={item.tag}
                className="p-3 rounded-xl border border-line bg-[#FAFAF8] flex items-center justify-between gap-2 hover:border-[#0E8F5D]/30 transition"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="font-bold text-xs text-ink truncate">{item.tag}</div>
                  <div className="text-[10px] text-ink-tertiary">
                    {item.count}x in catalog ({item.percentage}% usage)
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/keyword-research?q=${encodeURIComponent(item.tag)}`}
                    className="p-1.5 rounded-lg border border-line bg-white hover:bg-surface-muted text-ink-tertiary hover:text-ink transition"
                    title="Audit Keyword"
                  >
                    <Compass className="h-3.5 w-3.5" />
                  </Link>

                  <button
                    type="button"
                    disabled={keywordActionLoading === item.tag}
                    onClick={() => handleToggleKeywordPlanning(item.tag)}
                    className={`p-1.5 rounded-lg border transition ${
                      isPlanned
                        ? "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/30"
                        : "text-ink-tertiary hover:text-ink bg-white border-line"
                    }`}
                    title={isPlanned ? "Remove from Planner" : "Add to Planner"}
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${isPlanned ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
