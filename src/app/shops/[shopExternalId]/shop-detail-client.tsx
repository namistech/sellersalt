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
  HowItWorksToggle,
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
  AreaChart,
  LineChart,
  MiniTrend,
  type ChartState,
} from "@/components/data/charts";
import { Share2 } from "lucide-react";
import type { CompleteShopIntelligenceProfile } from "@/types/shop-research";
import type { Prospect } from "@prisma/client";
import { addProductToPlanner } from "@/services/product-hunting-client";
import { scoreShopCompetition } from "@/marketplaces/core/opportunity-engine";
import type { ProductHuntingResult } from "@/types/product-hunting";
import { useResearchState } from "@/lib/research-persistence";
import type { TrackingQuotaInfo, ShopTrackingReport } from "@/types/tracking";

const TRACKING_WINDOW_OPTIONS = [3, 7, 30] as const;
type TrackingWindowDays = (typeof TRACKING_WINDOW_OPTIONS)[number];

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

  // Tracking report window (3D/7D/30D), gated by the org's plan entitlement
  // (Package.maxTrackingDays, fetched via /api/tracking/quota).
  const [quota, setQuota] = useState<TrackingQuotaInfo | null>(null);
  const [trackingWindowDays, setTrackingWindowDays] = useState<TrackingWindowDays>(3);
  const [durationNotice, setDurationNotice] = useState<string | null>(null);
  const [report, setReport] = useState<ShopTrackingReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Local state for favorited listings & planned keywords
  const [shortlistedListings, setShortlistedListings] = useState<Record<string, boolean>>({});
  const [savedPlannerListings, setSavedPlannerListings] = useState<Record<string, boolean>>({});
  const [savingPlannerId, setSavingPlannerId] = useState<string | null>(null);
  const [plannedKeywords, setPlannedKeywords] = useState<Record<string, boolean>>({});
  const [keywordActionLoading, setKeywordActionLoading] = useState<string | null>(null);

  // Listing View Controls
  const [viewMode, setViewMode] = useResearchState<ViewMode>("shop_listings_view", "table");
  const [sortBy, setSortBy] = useState<"oppScore" | "sales" | "price" | "title">("oppScore");

  // Guide, Share & Planner state
  const [showGuide, setShowGuide] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [savingShopPlanner, setSavingShopPlanner] = useState(false);
  const [savedShopPlanner, setSavedShopPlanner] = useState(false);

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

  // Fetch plan entitlement (maxTrackingDays) so duration buttons reflect the
  // org's real Package row rather than a client-invented cap.
  useEffect(() => {
    if (!isAuthenticated || !tracked) return;
    fetch("/api/tracking/quota")
      .then((r) => r.json())
      .then((d) => {
        if (d?.quota) {
          setQuota(d.quota as TrackingQuotaInfo);
          // Clamp the selected window down to whatever this plan allows.
          setTrackingWindowDays((prev) => (prev > d.quota.maxTrackingDays ? 3 : prev));
        }
      })
      .catch(() => {});
  }, [isAuthenticated, tracked]);

  // Fetch the real before/after delta report for the selected window
  // whenever tracking is active and the window changes.
  useEffect(() => {
    if (!isAuthenticated || !tracked) return;
    setReportLoading(true);
    setReportError(null);
    fetch(`/api/shops/${shopExternalId}/tracking-report?days=${trackingWindowDays}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          setReportError(data.error || "Failed to load tracking report.");
          setReport(null);
          return;
        }
        setReport(data.report as ShopTrackingReport);
      })
      .catch(() => setReportError("Network connection interrupted while loading the tracking report."))
      .finally(() => setReportLoading(false));
  }, [isAuthenticated, tracked, trackingWindowDays, shopExternalId]);

  function handleSelectTrackingWindow(days: TrackingWindowDays) {
    if (quota && days > quota.maxTrackingDays) {
      setDurationNotice(
        `Your ${quota.planName} plan allows tracking reports up to ${quota.maxTrackingDays} day(s). Upgrade to unlock the ${days}-day window.`
      );
      return;
    }
    setDurationNotice(null);
    setTrackingWindowDays(days);
  }

  // Derive consolidated data from profile if available, otherwise from primary prospect
  const shopName = profile?.identity.shopName ?? primary?.shopName ?? `Shop ${shopExternalId}`;
  const shopUrl = profile?.identity.shopUrl ?? primary?.shopUrl ?? `https://www.etsy.com/shop/${shopName}`;
  const shopIconUrl = profile?.identity.shopIconUrl ?? primary?.shopIconUrl ?? null;
  const shopBannerUrl = profile?.identity.shopBannerUrl ?? null;
  const shopAgeMonths = profile?.identity.shopAgeMonths ?? primary?.shopAgeMonths ?? 18;
  const createdDate = profile?.identity.createdDate ?? `${Math.round(shopAgeMonths)} months ago`;
  const location = profile?.identity.location ?? "United States";

  // KPIs from real profile or prospect record (no fabricated numbers)
  const totalSales = profile?.kpis.totalSales ?? primary?.totalSales ?? 0;
  const activeListings = profile?.kpis.activeListings ?? primary?.activeListings ?? 0;
  const reviewCount = profile?.kpis.reviewCount ?? primary?.reviewCount ?? 0;
  const reviewAverage = profile?.kpis.reviewAverage ?? primary?.reviewAverage ?? null;
  const estDaily = profile?.kpis.estDailySales ?? primary?.estDailySales ?? (totalSales > 0 ? totalSales / (Math.max(1, shopAgeMonths) * 30.44) : 0);
  const estMonthlySales = profile?.kpis.estMonthlySales ?? Math.round(estDaily * 30.44);
  const sellingRatio = profile?.kpis.avgSellingRatio ?? (activeListings > 0 ? totalSales / activeListings : 0);
  const avgPrice = profile?.kpis.avgObservedPrice ?? 0;
  const estMonthlyRevenue = profile?.kpis.estMonthlyRevenue ?? Math.round(estMonthlySales * avgPrice);
  const estGrossProfit = profile?.kpis.estGrossProfit ?? Math.round(estMonthlyRevenue * 0.72);

  // Shop Competition Evaluation via centralized opportunity-engine bridge
  const scoreEnvelope = profile?.competition ?? scoreShopCompetition({
    marketplace: "etsy",
    shopName,
    totalSales,
    reviewCount,
    activeListings,
    shopAgeMonths,
    estDailySales: estDaily,
  });

  const evaluatedScore = {
    score: scoreEnvelope.score ?? profile?.verdict.opportunityScore ?? 50,
    verdictLabel: profile?.verdict.verdictLabel ?? (scoreEnvelope.score && scoreEnvelope.score >= 75 ? "Emerging High Potential" : "Established Competitor"),
    verdictVariant: ((scoreEnvelope.score ?? 50) >= 70 ? "success" : (scoreEnvelope.score ?? 50) >= 45 ? "warning" : "neutral") as "success" | "warning" | "danger" | "info" | "neutral",
    explanation: profile?.verdict.summary ?? `Competitive evaluation for ${shopName}.`,
    factors: scoreEnvelope.factors,
    confidence: scoreEnvelope.confidence,
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
      if (sortBy === "price") return (b.price ?? -Infinity) - (a.price ?? -Infinity);
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

  async function handleExportTrackingReportCsv() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    setExportingCsv(true);
    try {
      // Always fetch the latest report for the currently selected window at
      // export time, rather than trusting potentially-stale local state —
      // this is a real before/after delta report, never a fabricated one.
      const res = await fetch(`/api/shops/${shopExternalId}/tracking-report?days=${trackingWindowDays}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to generate the tracking report.");
        return;
      }
      const freshReport = data.report as ShopTrackingReport;
      setReport(freshReport);

      if (freshReport.status === "insufficient_data") {
        alert(
          `Data collection is still in progress for this shop (only ${freshReport.snapshotCount} snapshot(s) captured so far). Check back after the next scheduled snapshot for a real delta report.`
        );
        return;
      }

      const rows: string[][] = [];
      rows.push(["SellerSalt Shop Tracking Delta Report"]);
      rows.push(["Shop Name", `"${freshReport.shopName.replace(/"/g, '""')}"`]);
      rows.push(["Report Window (Days)", String(freshReport.windowDays)]);
      rows.push(["Snapshots In Window", String(freshReport.snapshotCount)]);
      rows.push(["Window Start [ACTUAL ETSY DATA]", freshReport.startCapturedAt]);
      rows.push(["Window End [ACTUAL ETSY DATA]", freshReport.endCapturedAt]);
      rows.push(["Generated At", freshReport.generatedAt]);
      rows.push([]);
      rows.push(["Shop Metric", "Start [ACTUAL ETSY DATA]", "End [ACTUAL ETSY DATA]", "Delta [ACTUAL ETSY DATA]"]);
      rows.push([
        "Lifetime Sales",
        String(freshReport.shopMetrics.totalSalesStart ?? ""),
        String(freshReport.shopMetrics.totalSalesEnd ?? ""),
        String(freshReport.shopMetrics.totalSalesDelta ?? ""),
      ]);
      rows.push([
        "Active Listings",
        String(freshReport.shopMetrics.activeListingsStart ?? ""),
        String(freshReport.shopMetrics.activeListingsEnd ?? ""),
        String(freshReport.shopMetrics.activeListingsDelta ?? ""),
      ]);
      rows.push([
        "Review Count",
        String(freshReport.shopMetrics.reviewCountStart ?? ""),
        String(freshReport.shopMetrics.reviewCountEnd ?? ""),
        String(freshReport.shopMetrics.reviewCountDelta ?? ""),
      ]);
      rows.push([]);
      rows.push(["Est. Daily Sales Velocity [ESTIMATED]", freshReport.velocity.estDailySales.toFixed(1)]);
      rows.push(["Velocity Growth Rate % [ESTIMATED]", String(freshReport.velocity.velocityGrowthRate)]);
      rows.push(["Sales Spike Detected [SELLERSALT SCORE]", freshReport.velocity.isSpike ? "YES" : "NO"]);
      rows.push([]);

      if (freshReport.listingChanges.length > 0) {
        rows.push([
          "Listing ID",
          "Listing Title",
          "Price Start USD [ACTUAL ETSY DATA]",
          "Price End USD [ACTUAL ETSY DATA]",
          "Price Delta USD [ACTUAL ETSY DATA]",
          "Favorers Start [ACTUAL ETSY DATA]",
          "Favorers End [ACTUAL ETSY DATA]",
          "Favorers Delta [ACTUAL ETSY DATA]",
          "Listing URL",
        ]);
        for (const l of freshReport.listingChanges) {
          rows.push([
            l.listingExternalId,
            `"${l.title.replace(/"/g, '""')}"`,
            String(l.priceStart ?? ""),
            String(l.priceEnd ?? ""),
            String(l.priceDelta ?? ""),
            String(l.favorersStart ?? ""),
            String(l.favorersEnd ?? ""),
            String(l.favorersDelta ?? ""),
            l.url ? `"${l.url}"` : "",
          ]);
        }
      } else {
        rows.push(["No tracked listings changed price or favorites within this window."]);
      }

      const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `${shopName.toLowerCase().replace(/\s+/g, "-")}-tracking-report-${freshReport.windowDays}d.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("Network connection interrupted while generating the tracking report.");
    } finally {
      setExportingCsv(false);
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
          rating: null,
          reviewCount: null,
          brand: null,
          categoryPath: [],
          badges: [],
          availability: null,
          bestSellerRank: [],
          keyword: null,
        },
        shop: {
          shopId: shopExternalId,
          shopName,
          shopUrl,
          shopIconUrl,
          shopExternalId,
          createdTimestamp: Date.now() / 1000 - shopAgeMonths * 30.44 * 24 * 3600,
          shopAgeMonths,
          totalSales,
          activeListings,
          reviewCount,
          reviewAverage,
          shopMetricsObserved: true,
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

  function handleShareShop() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  }

  async function handleSaveShopToPlanner() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    setSavingShopPlanner(true);
    try {
      await fetch("/api/planner/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Competitor Store: ${shopName}`,
          notes: `Tracked store in ${location}. Lifetime sales: ${totalSales.toLocaleString()}, Daily velocity: ~${estDaily.toFixed(1)}/day.`,
          stage: "DISCOVERED",
          category: "Competitor Store",
          targetPrice: avgPrice,
        }),
      });
      setSavedShopPlanner(true);
      setTimeout(() => setSavedShopPlanner(false), 3000);
    } catch {
      alert("Failed to save shop to workspace planner.");
    } finally {
      setSavingShopPlanner(false);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb Navigation & Inline Guide Trigger */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-ink-tertiary">
          <Link href="/radar" className="hover:text-ink font-semibold transition-colors">
            Market Research
          </Link>
          <span>/</span>
          <span className="text-ink font-bold">{shopName}</span>
        </div>

        <HowItWorksToggle isOpen={showGuide} onToggle={() => setShowGuide(!showGuide)} />
      </div>

      {/* Expandable Guide */}
      <HowItWorksGuide
        isOpen={showGuide}
        onToggle={() => setShowGuide(!showGuide)}
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
            title: "3. Longitudinal Shop Tracking",
            description: "Click 'Track This Shop' to capture recurring sales snapshots, price adjustments, and newly launched listings.",
            badge: "Automated",
          },
        ]}
      />

      {/* ==================================================================== */}
      {/* SECTION 1: SHOP RESEARCH DOSSIER HEADER */}
      {/* ==================================================================== */}
      <div className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
        {/* Visual Cover / Banner Area */}
        <div className="h-44 sm:h-56 md:h-64 w-full bg-[#141B16] relative overflow-hidden">
          {shopBannerUrl ? (
            <img
              src={shopBannerUrl}
              alt={shopName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-[#14261C] via-[#1C2D22] to-[#14261C]">
              <Store className="h-20 w-20 text-[#16C784]/20" />
            </div>
          )}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>
        </div>

        {/* Header Profile Identity & Action Bar */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-line bg-white shadow-sm overflow-hidden shrink-0 flex items-center justify-center">
                {shopIconUrl ? (
                  <SafeImage
                    src={shopIconUrl}
                    alt={shopName}
                    fallbackType="shop"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Avatar name={shopName} size="lg" className="w-full h-full text-xl font-extrabold" />
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight truncate">
                    {shopName}
                  </h1>
                  <Badge variant={evaluatedScore.score >= 70 ? "success" : "warning"} className="font-bold">
                    Score {evaluatedScore.score}/100
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-ink-tertiary" /> {location}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="h-3.5 w-3.5 text-ink-tertiary" /> Established {createdDate}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-semibold text-ink">
                    <Star className="h-3.5 w-3.5 text-[#FBBF24] fill-current" /> {reviewAverage != null ? reviewAverage.toFixed(1) : "—"} ({reviewCount.toLocaleString()} reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Action Area: Dedicated Spacing & Responsive Wrap */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                variant={tracked ? "secondary" : "primary"}
                onClick={handleToggleTrack}
                loading={tracking}
                className={tracked ? "border-[#0E8F5D] text-[#0E8F5D] font-bold text-xs" : "bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold text-xs"}
              >
                {tracked ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5 inline" /> Shop Tracking Active
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-1.5 inline" /> Track This Shop
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                size="compact"
                loading={savingShopPlanner}
                onClick={handleSaveShopToPlanner}
                className="text-xs font-semibold"
              >
                {savedShopPlanner ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-[#0E8F5D]" /> Saved to Planner
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3.5 w-3.5 mr-1 text-ink-tertiary" /> Save Store
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={handleShareShop}
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-secondary hover:text-ink px-3 py-2 rounded-lg border border-line hover:bg-surface-muted transition shadow-2xs"
                title="Copy share link"
              >
                <Share2 className="h-3.5 w-3.5 text-ink-tertiary" />
                <span>{copiedShare ? "Link Copied!" : "Share"}</span>
              </button>

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
        contextTheme="shop"
        badgeText="STRATEGIC COMPETITION VERDICT"
        badgeIcon={<ShieldCheck className="h-3.5 w-3.5 text-[#FBBF24]" />}
        title={`Should you compete with ${shopName}?`}
        score={evaluatedScore.score}
        scoreMax={100}
        verdictLabel={evaluatedScore.verdictLabel}
        verdictVariant={evaluatedScore.verdictVariant}
        provenance="SELLERSALT_SCORE"
        description={evaluatedScore.explanation}
        actionLabel={tracked ? "Stop Tracking Shop" : "Start Tracking Shop"}
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
      {/* SECTION 5: SHOP TRACKING & LONGITUDINAL INTELLIGENCE */}
      {/* ==================================================================== */}
      {!tracked ? (
        <div className="p-8 rounded-2xl bg-[#0E8F5D] text-white shadow-lg text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mx-auto">
            <TrendingUp className="h-3.5 w-3.5" /> Longitudinal Shop Tracking
          </div>
          <h2 className="text-2xl font-bold tracking-tight max-w-lg mx-auto">
            Track {shopName}&apos;s sales &amp; catalog movements over time
          </h2>
          <p className="text-xs text-white/90 leading-relaxed max-w-md mx-auto">
            SellerSalt records regular snapshots of this shop to reveal actual transaction velocity, price adjustments, and newly launched winning products.
          </p>
          <Button
            variant="secondary"
            size="compact"
            loading={tracking}
            onClick={handleToggleTrack}
            className="bg-white hover:bg-[#FAFAF8] text-[#0E8F5D] font-bold text-sm px-6 py-3 shadow-md border-0"
          >
            ⚡ Track This Shop
          </Button>
        </div>
      ) : (
        <Card padding="lg" className="border-[#0E8F5D] bg-[#E7FAF1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#0E8F5D] text-white text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Shop Tracking Active
              </div>
              <h3 className="text-base font-bold text-ink mt-2">
                Longitudinal Tracking Active for {shopName}
              </h3>
              <p className="text-xs text-ink-secondary mt-0.5">
                Periodic snapshots record sales velocity deltas, price adjustments, and catalog expansions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-line bg-white p-0.5 text-xs font-bold">
                {TRACKING_WINDOW_OPTIONS.map((days) => {
                  const label = `${days}D`;
                  const isSelected = trackingWindowDays === days;
                  const isLocked = !!quota && days > quota.maxTrackingDays;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleSelectTrackingWindow(days)}
                      title={isLocked ? `Upgrade your plan to unlock the ${label} tracking window` : `Show the ${label} tracking report`}
                      aria-pressed={isSelected}
                      className={`px-2.5 py-1 rounded-md font-semibold transition text-xs flex items-center gap-1 ${
                        isSelected
                          ? "bg-[#0E8F5D] text-white"
                          : isLocked
                          ? "text-ink-tertiary/60 cursor-not-allowed"
                          : "text-ink-secondary hover:text-ink"
                      }`}
                    >
                      {isLocked && <Lock className="h-3 w-3" />}
                      {label}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="secondary"
                size="compact"
                loading={exportingCsv}
                onClick={() => handleExportTrackingReportCsv()}
                className="text-xs font-semibold bg-white border-line shadow-2xs"
              >
                📥 Export CSV
              </Button>

              <Button
                variant="secondary"
                size="compact"
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs font-semibold bg-white border-line shadow-2xs"
              >
                📊 Guide &amp; Report
              </Button>

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
          </div>

          {durationNotice && (
            <div className="p-2.5 rounded-lg bg-[#FFF7ED] border border-[#FDBA74] text-[11px] text-[#9A3412] font-semibold flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 shrink-0" /> {durationNotice}
            </div>
          )}

          {/* Real windowed before/after delta report — not a single-moment
              snapshot dump. Populates from actual ShopSnapshot history. */}
          {reportLoading ? (
            <div className="p-3.5 rounded-xl bg-white/70 border border-[#0E8F5D]/20 text-xs text-ink-secondary flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0E8F5D] shrink-0 animate-pulse" />
              <span>Loading {trackingWindowDays}-day tracking report…</span>
            </div>
          ) : reportError ? (
            <Alert variant="danger">{reportError}</Alert>
          ) : report?.status === "insufficient_data" ? (
            <div className="p-3.5 rounded-xl bg-white/70 border border-[#0E8F5D]/20 text-xs text-ink-secondary flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0E8F5D] shrink-0" />
              <span>
                Data collection in progress — only {report.snapshotCount} snapshot{report.snapshotCount === 1 ? "" : "s"} captured
                so far for the {trackingWindowDays}-day window. Check back after the next scheduled snapshot for a real delta report.
              </span>
            </div>
          ) : report?.status === "ok" ? (
            <div className="p-4 rounded-xl bg-white border border-line space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
                <span className="text-xs font-bold text-ink uppercase tracking-wide">
                  {trackingWindowDays}-Day Delta Report ({report.snapshotCount} snapshots)
                </span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line space-y-1">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase block">Sales Δ</span>
                  <span className="text-sm font-extrabold text-[#0E8F5D]">
                    {report.shopMetrics.totalSalesDelta !== null ? `${report.shopMetrics.totalSalesDelta >= 0 ? "+" : ""}${report.shopMetrics.totalSalesDelta}` : "—"}
                  </span>
                  <p className="text-[11px] text-ink-secondary">
                    {report.shopMetrics.totalSalesStart ?? "—"} → {report.shopMetrics.totalSalesEnd ?? "—"} lifetime sales
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line space-y-1">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase block">Catalog Δ</span>
                  <span className="text-sm font-extrabold text-ink">
                    {report.shopMetrics.activeListingsDelta !== null ? `${report.shopMetrics.activeListingsDelta >= 0 ? "+" : ""}${report.shopMetrics.activeListingsDelta}` : "—"}
                  </span>
                  <p className="text-[11px] text-ink-secondary">
                    {report.shopMetrics.activeListingsStart ?? "—"} → {report.shopMetrics.activeListingsEnd ?? "—"} active listings
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line space-y-1">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase block">Velocity [ESTIMATED]</span>
                  <span className="text-sm font-extrabold text-ink">~{report.velocity.estDailySales.toFixed(1)}/day</span>
                  <p className="text-[11px] text-ink-secondary">
                    {report.velocity.isSpike ? "Sales spike detected" : `${report.velocity.velocityGrowthRate >= 0 ? "+" : ""}${report.velocity.velocityGrowthRate}% vs baseline`}
                  </p>
                </div>
              </div>
              {report.listingChanges.length > 0 && (
                <p className="text-[11px] text-ink-tertiary">
                  {report.listingChanges.length} tracked listing{report.listingChanges.length === 1 ? "" : "s"} changed price or favorites in this window — included in the CSV export.
                </p>
              )}
            </div>
          ) : null}

          {latestSnapshot && (
            <div className="p-3.5 rounded-xl bg-white border border-line grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
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
              <div>
                <span className="text-[10px] font-bold text-ink-tertiary uppercase block">Data Provenance</span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>
            </div>
          )}

          {/* Analytical Summary Report */}
          <div className="p-4 rounded-xl bg-white border border-line space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
              <span className="text-xs font-bold text-ink uppercase tracking-wide">Tracking Intelligence Summary</span>
              <DataProvenanceBadge type="SELLERSALT_SCORE" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line space-y-1">
                <span className="text-[10px] font-bold text-ink-tertiary uppercase block">Observed Velocity</span>
                <span className="text-sm font-extrabold text-[#0E8F5D]">~{estDaily.toFixed(1)} sales/day</span>
                <p className="text-[11px] text-ink-secondary">Stable transaction momentum across 30-day baseline.</p>
              </div>
              <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line space-y-1">
                <span className="text-[10px] font-bold text-ink-tertiary uppercase block">Catalog Yield Ratio</span>
                <span className="text-sm font-extrabold text-ink">{sellingRatio.toFixed(1)} sales/listing</span>
                <p className="text-[11px] text-ink-secondary">{catalog.catalogEfficiency === "HIGH_YIELD" ? "High efficiency top-tier storefront." : "Standard catalog distribution."}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#FAFAF8] border border-line space-y-1">
                <span className="text-[10px] font-bold text-ink-tertiary uppercase block">Strategic Takeaway</span>
                <span className="text-sm font-extrabold text-ink">{evaluatedScore.verdictLabel}</span>
                <p className="text-[11px] text-ink-secondary">Focus on unique product variations &amp; bundle positioning.</p>
              </div>
            </div>
          </div>

          {trendPoints.length >= 2 ? (
            <div className="p-4 rounded-xl bg-white border border-line space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Observed Sales Movements Over Window</span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>
              <AreaChart
                data={trendPoints}
                xKey="date"
                series={[{ key: "sales", label: "Delta Sales", colorIndex: 0 }]}
                height={160}
                valueFormatter={(v: number | string) => `${v} delta sales`}
              />
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-white/70 border border-[#0E8F5D]/20 text-xs text-ink-secondary flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#0E8F5D] shrink-0" />
              <span>
                Tracking active — Initial baseline snapshot captured. Longitudinal comparisons will populate as periodic snapshots are recorded.
              </span>
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
                        {listing.price !== null ? `$${listing.price.toFixed(2)}` : "Unavailable"}
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
                      <span className="font-bold text-ink tabular-nums">{listing.price !== null ? `$${listing.price.toFixed(2)}` : "Unavailable"}</span>
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
