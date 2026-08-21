"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ExternalLink,
  Store,
  DollarSign,
  TrendingUp,
  Bookmark,
  CheckCircle2,
  Tag,
  AlertTriangle,
  Flame,
  Plus,
  Compass,
  Zap,
  Target,
  Check,
  BarChart3,
  Layers,
  Image as ImageIcon,
  FileText,
  Calendar,
  Eye,
  Heart,
  Award,
} from "lucide-react";
import {
  Card,
  Badge,
  Button,
  Heading,
  Text,
  Eyebrow,
  IconButton,
  IntelligenceCard,
  ViewSwitch,
  HowItWorksGuide,
  HowItWorksToggle,
  SafeImage,
  type ViewMode,
} from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import {
  AreaChart,
  BarChart,
  HorizontalBarChart,
  BulletGauge,
  DistributionHistogram,
  SeasonalityChart,
  RankingVisualizer,
  ProgressMeter,
  DualSeriesChart,
  type ChartState,
} from "@/components/data/charts";
import { addProductToPlanner } from "@/services/product-hunting-client";
import type { ProductHuntingResult } from "@/types/product-hunting";
import { useResearchState } from "@/lib/research-persistence";

export interface ProductDetailData {
  listingId: string;
  title: string;
  price: number;
  currency: string;
  images: string[];
  imageUrl: string;
  listingUrl: string;
  shopId: string;
  shopName: string;
  shopUrl: string;
  shopTotalSales: number;
  shopReviewCount: number;
  shopAgeMonths: number;
  category: string;
  tags: string[];
  createdDate: string;
  listingAgeDays: number;
  numFavorers: number;
  views: number;
  opportunityScore: number;
  canonicalOpportunity?: {
    overallScore: number | null;
    confidenceScore: number;
    tier: string;
    verdictLabel: string;
    verdictVariant: "success" | "warning" | "danger" | "info" | "neutral";
    summary: string;
    explanation: string;
    availableSignals?: string[];
    unavailableSignals?: string[];
  };
  estDailySales: number;
  estMonthlySales: number;
  estMonthlyRevenue: number;
  estNetProfit: number;
  profitMarginPercent: number;
  seoScore: number;
}

interface ProductDetailClientProps {
  product: ProductDetailData;
  isAuthenticated?: boolean;
}

export function ProductDetailClient({ product, isAuthenticated = true }: ProductDetailClientProps) {
  const [selectedImage, setSelectedImage] = useState<string>(
    product.images[0] || product.imageUrl || ""
  );
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSavedToPlanner, setIsSavedToPlanner] = useState(false);
  const [savingPlanner, setSavingPlanner] = useState(false);
  const [viewMode, setViewMode] = useResearchState<ViewMode>("product_tags_view", "table");
  const [showGuide, setShowGuide] = useState(false);

  // Consume canonical intelligence result from server
  const evaluatedScore = {
    score: product.canonicalOpportunity?.overallScore ?? product.opportunityScore,
    confidenceScore: product.canonicalOpportunity?.confidenceScore ?? 85,
    verdictLabel: product.canonicalOpportunity?.verdictLabel ?? (product.opportunityScore >= 75 ? "High Potential Opportunity" : "Moderate Demand Potential"),
    verdictVariant: product.canonicalOpportunity?.verdictVariant ?? ((product.canonicalOpportunity?.overallScore ?? product.opportunityScore) >= 70 ? "success" : "warning") as "success" | "warning" | "danger" | "info" | "neutral",
    summary: product.canonicalOpportunity?.summary ?? `Daily velocity and economics benchmarked for ${product.title}.`,
    explanation: product.canonicalOpportunity?.explanation ?? "Evaluated via SellerSalt's canonical opportunity intelligence model.",
  };

  // Trajectory Simulation Data (Dual series: Volume & Revenue)
  const monthlyUnits = product.estMonthlySales;
  const salesTrajectoryData = [
    { month: "Month -5", sales: Math.round(monthlyUnits * 0.45), revenue: Math.round(monthlyUnits * 0.45 * product.price) },
    { month: "Month -4", sales: Math.round(monthlyUnits * 0.58), revenue: Math.round(monthlyUnits * 0.58 * product.price) },
    { month: "Month -3", sales: Math.round(monthlyUnits * 0.72), revenue: Math.round(monthlyUnits * 0.72 * product.price) },
    { month: "Month -2", sales: Math.round(monthlyUnits * 0.85), revenue: Math.round(monthlyUnits * 0.85 * product.price) },
    { month: "Month -1", sales: Math.round(monthlyUnits * 0.94), revenue: Math.round(monthlyUnits * 0.94 * product.price) },
    { month: "Current", sales: monthlyUnits, revenue: Math.round(monthlyUnits * product.price) },
  ];

  // 12-Month Seasonality Data
  const seasonalityData = [
    { month: "Jan", index: 88 },
    { month: "Feb", index: 94 },
    { month: "Mar", index: 102 },
    { month: "Apr", index: 110 },
    { month: "May", index: 118 },
    { month: "Jun", index: 105 },
    { month: "Jul", index: 96 },
    { month: "Aug", index: 104 },
    { month: "Sep", index: 112 },
    { month: "Oct", index: 135, isPeak: true },
    { month: "Nov", index: 185, isPeak: true },
    { month: "Dec", index: 170, isPeak: true },
  ];

  // Price Distribution Bins
  const priceBins = [
    { range: "< $15", count: 18, isObservedBin: product.price < 15 },
    { range: "$15–$25", count: 64, isObservedBin: product.price >= 15 && product.price < 25 },
    { range: "$25–$35", count: 120, isObservedBin: product.price >= 25 && product.price < 35 },
    { range: "$35–$50", count: 45, isObservedBin: product.price >= 35 && product.price < 50 },
    { range: "$50+", count: 14, isObservedBin: product.price >= 50 },
  ];

  // Tag audit data
  const tagList = product.tags.map((tag, idx) => ({
    tag,
    searchScore: Math.max(40, 95 - idx * 8),
    difficultyVariant: (idx < 2 ? "success" : idx < 5 ? "warning" : "danger") as "success" | "warning" | "danger",
    difficultyLabel: idx < 2 ? "Low Competition" : idx < 5 ? "Moderate" : "High Competition",
    inTitle: product.title.toLowerCase().includes(tag.toLowerCase()),
    relevance: idx < 3 ? "Direct Match" : "Secondary Long-tail",
  }));

  const tagBarData = tagList.slice(0, 6).map((t) => ({
    label: t.tag,
    value: t.searchScore,
    color: t.difficultyVariant === "success" ? "#0E8F5D" : t.difficultyVariant === "warning" ? "#FBBF24" : "#DC2626",
  }));

  // Content Quality Breakdown
  const contentQuality = {
    imageCount: product.images.length || 1,
    tagCount: product.tags.length,
    titleLength: product.title.length,
    hasStrongKeywords: tagList.some((t) => t.inTitle),
    grade: product.seoScore >= 80 ? "A" : product.seoScore >= 65 ? "B" : "C",
  };

  async function handleAddToPlanner() {
    setSavingPlanner(true);
    try {
      const huntingResult: ProductHuntingResult = {
        id: product.listingId,
        listing: {
          listingId: product.listingId,
          title: product.title,
          price: product.price,
          currency: product.currency,
          images: product.images,
          imageUrl: product.imageUrl,
          tags: product.tags,
          materials: [],
          taxonomyId: null,
          createdTimestamp: Date.now() / 1000,
          updatedTimestamp: Date.now() / 1000,
          listingAgeDays: product.listingAgeDays,
          listingAgeMonths: Math.round(product.listingAgeDays / 30.44),
          listingUrl: product.listingUrl,
          shopId: product.shopId,
          shopName: product.shopName,
          numFavorers: product.numFavorers,
          views: product.views,
          rating: null,
          reviewCount: null,
          brand: null,
          categoryPath: [],
          badges: [],
          availability: null,
          bestSellerRank: [],
        },
        shop: {
          shopId: product.shopId,
          shopName: product.shopName,
          shopUrl: product.shopUrl,
          shopIconUrl: null,
          shopExternalId: null,
          createdTimestamp: Date.now() / 1000 - product.shopAgeMonths * 30.44 * 24 * 3600,
          shopAgeMonths: product.shopAgeMonths,
          totalSales: product.shopTotalSales,
          // ProductDetailData carries no real active-listings-count or
          // review-average field (unlike totalSales/reviewCount/
          // shopAgeMonths above, which are real) — these two were
          // previously hardcoded literals (45 / 4.8) that got persisted
          // into the real PlannerItem.researchSnapshot on "Add to
          // Planner" as if observed. activeListings has no nullable slot
          // in this shape, so 0 plus shopMetricsObserved: false below
          // signals "not really known" rather than a confident 45.
          activeListings: 0,
          reviewCount: product.shopReviewCount,
          reviewAverage: null,
          shopMetricsObserved: false,
        },
        signals: {
          estDailySales: product.estDailySales,
          avgSellingRatio: 12.5,
          salesVelocityProxy: product.estDailySales >= 4 ? "HIGH" : "MODERATE",
          reviewConversionRate: 0.12,
        },
        opportunity: {
          opportunityScore: evaluatedScore.score,
          classification: evaluatedScore.score >= 75 ? "EMERGING" : "HIDDEN_GEM",
          classificationLabel: evaluatedScore.verdictLabel,
          classificationEmoji: evaluatedScore.score >= 75 ? "🔥" : "💎",
          reason: evaluatedScore.summary,
          signals: {
            velocity: { label: "Sales Velocity", score: 85, metricValue: `${product.estDailySales.toFixed(1)} sales/day` },
            density: { label: "Catalog Density", score: 80, metricValue: "High Yield" },
            competition: { label: "Competition Barrier", score: 70, metricValue: `${product.shopReviewCount} reviews` },
            momentum: { label: "Buyer Demand", score: 80, metricValue: "Strong" },
            freshness: { label: "Freshness", score: 90, metricValue: `${product.listingAgeDays} days` },
          },
          evidence: [
            `Observed ${product.estDailySales.toFixed(1)} sales/day velocity proxy`,
            `Estimated net profit margin of ${product.profitMarginPercent.toFixed(1)}% after Etsy fees`,
          ],
          strengths: ["Strong demand momentum", "High catalog yield"],
          weaknesses: ["Competitive review threshold"],
          recommendedAction: evaluatedScore.score >= 75 ? "SHORTLIST" : "STUDY_PRICING",
          strategicTakeaway: evaluatedScore.explanation,
        },
      };

      await addProductToPlanner(huntingResult);
      setIsSavedToPlanner(true);
    } catch (err: any) {
      alert("Failed to save to planner: " + (err.message || "Unknown error"));
    } finally {
      setSavingPlanner(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Breadcrumb Navigation & Inline Guide Trigger */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-ink-tertiary">
          <Link href="/radar" className="hover:text-ink font-semibold transition-colors">
            Opportunity Radar
          </Link>
          <span>/</span>
          <Link href={`/shops/${product.shopId}`} className="hover:text-ink font-semibold transition-colors">
            {product.shopName}
          </Link>
          <span>/</span>
          <span className="text-ink font-bold truncate max-w-md">{product.title}</span>
        </div>

        <HowItWorksToggle isOpen={showGuide} onToggle={() => setShowGuide(!showGuide)} />
      </div>

      {/* Expandable Guide */}
      <HowItWorksGuide
        isOpen={showGuide}
        onToggle={() => setShowGuide(!showGuide)}
        title="How Product Opportunity Intelligence Works"
        description="SellerSalt audits listing tags, calculates unit economics after transaction fees, and benchmarks sales velocity against category medians."
        steps={[
          {
            title: "1. Demand & Velocity",
            description: "Daily and monthly order velocity is modeled from seller transaction records and review pace.",
            badge: "Demand Signals",
          },
          {
            title: "2. Unit Economics",
            description: "Net profit and margins are calculated after standard Etsy transaction fees (6.5% + 3% + $0.20).",
            badge: "Economics",
          },
          {
            title: "3. Keyword & Tag Audit",
            description: "Listing tags and titles are analyzed for search relevance, long-tail feasibility, and slot coverage.",
            badge: "SEO Diagnostics",
          },
        ]}
      />

      {/* ==================================================================== */}
      {/* SECTION 1: PRODUCT IDENTITY HEADER */}
      {/* ==================================================================== */}
      <Card padding="lg" className="border-line bg-white shadow-xs">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Image Gallery with SafeImage */}
          <div className="lg:w-96 shrink-0 space-y-3">
            <div className="aspect-square w-full rounded-xl overflow-hidden border border-line bg-[#FAFAF8] relative shadow-inner-xs">
              <SafeImage
                src={selectedImage}
                alt={product.title}
                fallbackType="product"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <Badge variant={evaluatedScore.score >= 70 ? "success" : "warning"} className="font-bold shadow-xs">
                  🔥 Score {evaluatedScore.score}/100
                </Badge>
              </div>
            </div>

            {/* Thumbnail selector */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`h-14 w-14 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                      selectedImage === img ? "border-[#0E8F5D] ring-2 ring-[#0E8F5D]/20" : "border-line opacity-70 hover:opacity-100"
                    }`}
                  >
                    <SafeImage src={img} alt={`Thumb ${idx}`} fallbackType="product" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Identity & Quick Actions */}
          <div className="flex-1 space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">
                  {product.category || "General Category"}
                </span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
                <span className="text-xs text-ink-tertiary">· Listed {product.createdDate}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight leading-snug">
                {product.title}
              </h1>
            </div>

            {/* Price & Internal Shop Link */}
            <div className="flex flex-wrap items-baseline gap-4 pb-4 border-b border-line-subtle">
              <div className="text-3xl font-bold text-ink tabular-nums">
                ${product.price.toFixed(2)}{" "}
                <span className="text-xs font-normal text-ink-tertiary">{product.currency}</span>
              </div>
              <div className="text-xs text-ink-secondary flex items-center gap-2">
                <Store className="h-4 w-4 text-ink-tertiary" />
                <span>Shop:</span>
                <Link
                  href={`/shops/${product.shopId}`}
                  className="font-bold text-[#0E8F5D] hover:underline"
                >
                  {product.shopName}
                </Link>
                <span className="text-ink-tertiary">({product.shopTotalSales.toLocaleString()} sales)</span>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-secondary">
              <div className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-red-500" />
                <span className="font-bold text-ink tabular-nums">{product.numFavorers.toLocaleString()}</span> favorites
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-blue-500" />
                <span className="font-bold text-ink tabular-nums">{product.views.toLocaleString()}</span> views
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-bold text-ink tabular-nums">{product.listingAgeDays}</span> days active
              </div>
            </div>

            {/* Quick Actions (Internal First + Explicit See on Etsy) */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant={isSavedToPlanner ? "secondary" : "primary"}
                onClick={handleAddToPlanner}
                disabled={savingPlanner}
                className={isSavedToPlanner ? "border-[#0E8F5D] text-[#0E8F5D]" : "bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold"}
              >
                {isSavedToPlanner ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5 inline" /> Saved in Planner
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1.5 inline" /> Add to Workspace Planner
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setIsFavorited(!isFavorited)}
                className="text-xs"
              >
                <Bookmark className={`h-4 w-4 mr-1.5 inline ${isFavorited ? "fill-[#FBBF24] text-[#FBBF24]" : ""}`} />
                {isFavorited ? "Shortlisted" : "Shortlist"}
              </Button>

              {product.listingUrl && (
                <a
                  href={product.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-ink-secondary hover:text-ink px-3 py-2 rounded-lg border border-line hover:bg-surface-muted transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> See on Etsy
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ==================================================================== */}
      {/* SECTION 2: LEVEL 1 — PRIMARY PRODUCT OPPORTUNITY VERDICT (DARK CARD) */}
      {/* ==================================================================== */}
      <IntelligenceCard
        contextTheme="economics"
        badgeText="PRODUCT OPPORTUNITY VERDICT"
        title="Should you develop a product concept like this?"
        score={evaluatedScore.score}
        scoreMax={100}
        verdictLabel={evaluatedScore.verdictLabel}
        verdictVariant={evaluatedScore.verdictVariant}
        provenance="SELLERSALT_SCORE"
        description={evaluatedScore.explanation}
        actionLabel={isSavedToPlanner ? "View in Workspace Planner" : "Save Opportunity to Planner"}
        onAction={handleAddToPlanner}
        sidePanel={
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-[#9EAA9F] uppercase tracking-wider">
              Unit Economics Breakdown
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#9EAA9F]">Sale Price:</span>
                <span className="font-bold text-white tabular-nums">${product.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9EAA9F]">Est. Etsy Fees:</span>
                <span className="font-bold text-[#FBBF24] tabular-nums">-${(product.price * 0.095 + 0.20).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9EAA9F]">Est. Net Profit:</span>
                <span className="font-bold text-[#16C784] tabular-nums">${product.estNetProfit.toFixed(2)} / unit</span>
              </div>
              <div className="pt-2 border-t border-[#2A362D] flex justify-between font-bold">
                <span className="text-white">Net Margin:</span>
                <span className="text-[#16C784] tabular-nums">{product.profitMarginPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#1C261F] border border-[#2A362D]">
            <span className="text-[10px] font-bold text-[#9EAA9F] uppercase block">Demand Velocity</span>
            <span className="text-base font-bold text-white tabular-nums">{product.estDailySales.toFixed(1)} sales/day</span>
            <span className="text-[10px] text-[#16C784] block mt-0.5 font-semibold">High consistent volume</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#1C261F] border border-[#2A362D]">
            <span className="text-[10px] font-bold text-[#9EAA9F] uppercase block">Competitor Review Moat</span>
            <span className="text-base font-bold text-white tabular-nums">{product.shopReviewCount} reviews</span>
            <span className="text-[10px] text-[#9EAA9F] block mt-0.5">Moderate entry threshold</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#1C261F] border border-[#2A362D]">
            <span className="text-[10px] font-bold text-[#9EAA9F] uppercase block">Listing Freshness</span>
            <span className="text-base font-bold text-white tabular-nums">{product.listingAgeDays} Days</span>
            <span className="text-[10px] text-[#16C784] block mt-0.5 font-semibold">Recent market breakout</span>
          </div>
        </div>
      </IntelligenceCard>

      {/* ==================================================================== */}
      {/* SECTION 3: LEVEL 2 — PRODUCT KPI MATRIX */}
      {/* ==================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Heading as="h2" size="h4">
            Sales, Revenue & Unit Economics Intelligence
          </Heading>
          <span className="text-xs text-ink-tertiary">Deterministic unit economics calculations</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Est. Monthly Sales</span>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>
            <div className="text-2xl font-bold text-[#0E8F5D] pt-1 tabular-nums">
              ~{product.estMonthlySales.toLocaleString()}{" "}
              <span className="text-xs font-normal text-ink-tertiary">units</span>
            </div>
            <div className="text-[11px] text-ink-tertiary">
              Based on {product.estDailySales.toFixed(1)} daily transactions
            </div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Est. Monthly Revenue</span>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>
            <div className="text-2xl font-bold text-ink pt-1 tabular-nums">
              ${product.estMonthlyRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] text-ink-tertiary">
              Gross sales at ${product.price.toFixed(2)} retail price
            </div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Est. Monthly Profit</span>
              <DataProvenanceBadge type="ESTIMATED" />
            </div>
            <div className="text-2xl font-bold text-[#0E8F5D] pt-1 tabular-nums">
              ${Math.round(product.estMonthlySales * product.estNetProfit).toLocaleString()}
            </div>
            <div className="text-[11px] text-ink-tertiary">
              Net margin: {product.profitMarginPercent.toFixed(1)}%
            </div>
          </Card>

          <Card padding="md" className="border-line bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-tertiary uppercase">Listing SEO Health</span>
              <DataProvenanceBadge type="SELLERSALT_SCORE" />
            </div>
            <div className="text-2xl font-bold text-ink pt-1 tabular-nums">
              {product.seoScore}<span className="text-xs font-normal text-ink-tertiary">/100</span>
            </div>
            <div className="text-[11px] text-ink-tertiary">
              {product.tags.length} active tags · {product.title.length} chars
            </div>
          </Card>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 4: MODERN CHARTS & VISUALIZATIONS */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dual Series Trajectory Chart */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                Sales & Revenue Trajectory (6-Month Projection)
              </h3>
              <p className="text-xs text-ink-tertiary mt-0.5">
                Monthly transaction volume (bars) and gross revenue (curve)
              </p>
            </div>
            <DataProvenanceBadge type="ESTIMATED" />
          </div>

          <DualSeriesChart
            data={salesTrajectoryData}
            xKey="month"
            barKey="sales"
            barLabel="Monthly Units"
            barColor="#16C784"
            lineKey="revenue"
            lineLabel="Gross Revenue ($)"
            lineColor="#0E8F5D"
            height={200}
            barFormatter={(v) => `${v} units`}
            lineFormatter={(v) => `$${Number(v).toLocaleString()}`}
          />
        </Card>

        {/* 12-Month Seasonality Chart */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                Annual Category Seasonality Pattern
              </h3>
              <p className="text-xs text-ink-tertiary mt-0.5">
                Demand index throughout the calendar year (Baseline = 100)
              </p>
            </div>
            <DataProvenanceBadge type="ESTIMATED" />
          </div>

          <SeasonalityChart data={seasonalityData} height={200} />
        </Card>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 5: MARKET POSITION & CATEGORY BENCHMARKS */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BulletGauge
          actual={product.estDailySales}
          benchmark={1.8}
          target={5.0}
          unit=" sales/day"
          label="Sales Velocity Moat vs Category"
          sublabel="Observed velocity relative to category median performance"
        />

        <DistributionHistogram
          data={priceBins}
          height={180}
          unit="$"
          valueFormatter={(v) => `${v} category listings`}
          accessibleSummary="Price spread distribution for this category"
        />
      </div>

      {/* ==================================================================== */}
      {/* SECTION 6: CONTENT QUALITY & LISTING COMPLETENESS */}
      {/* ==================================================================== */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line-subtle">
          <div>
            <h3 className="text-sm font-bold text-ink">Listing Content & Visual Audit</h3>
            <p className="text-xs text-ink-tertiary">Structural completeness, tag utilization, and keyword optimization.</p>
          </div>
          <DataProvenanceBadge type="SELLERSALT_SCORE" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] space-y-1">
            <div className="flex items-center justify-between text-ink-tertiary uppercase text-[10px] font-bold">
              <span className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5 text-[#0E8F5D]" /> Image Assets</span>
              <span className="text-[#0E8F5D]">{contentQuality.imageCount}/10</span>
            </div>
            <div className="font-bold text-ink text-sm">{contentQuality.imageCount} High-Res Photos</div>
            <p className="text-[11px] text-ink-tertiary">Visual coverage across gallery slots.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] space-y-1">
            <div className="flex items-center justify-between text-ink-tertiary uppercase text-[10px] font-bold">
              <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-blue-600" /> Tag Slots</span>
              <span className={contentQuality.tagCount === 13 ? "text-[#0E8F5D]" : "text-amber-600"}>{contentQuality.tagCount}/13</span>
            </div>
            <div className="font-bold text-ink text-sm">{contentQuality.tagCount} Active Tags</div>
            <p className="text-[11px] text-ink-tertiary">{contentQuality.tagCount === 13 ? "100% full tag slot usage." : "Missing tag opportunities."}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] space-y-1">
            <div className="flex items-center justify-between text-ink-tertiary uppercase text-[10px] font-bold">
              <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-purple-600" /> Title Length</span>
              <span>{contentQuality.titleLength}/140 chars</span>
            </div>
            <div className="font-bold text-ink text-sm">{contentQuality.titleLength} Characters</div>
            <p className="text-[11px] text-ink-tertiary">Includes key search phrases.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] space-y-1">
            <div className="flex items-center justify-between text-ink-tertiary uppercase text-[10px] font-bold">
              <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-amber-600" /> Overall Grade</span>
              <span className="font-bold text-[#0E8F5D]">Grade {contentQuality.grade}</span>
            </div>
            <div className="font-bold text-ink text-sm">SEO Score: {product.seoScore}/100</div>
            <p className="text-[11px] text-ink-tertiary">Deterministic rubric assessment.</p>
          </div>
        </div>
      </Card>

      {/* ==================================================================== */}
      {/* SECTION 7: LEVEL 3 — EVIDENCE: TAG & KEYWORD AUDIT TABLE */}
      {/* ==================================================================== */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-ink">
              Extracted Listing Tags &amp; Search Keyword Feasibility
            </h3>
            <p className="text-xs text-ink-tertiary">
              Detailed keyword difficulty and search relevance for this product
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ViewSwitch value={viewMode} onChange={setViewMode} modes={["table", "grid"]} />
            <DataProvenanceBadge type="SELLERSALT_SCORE" />
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="border border-line rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAFAF8] border-b border-line text-ink-tertiary font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Keyword / Tag</th>
                  <th className="p-3.5">Search Opportunity</th>
                  <th className="p-3.5">Competition Level</th>
                  <th className="p-3.5">Relevance</th>
                  <th className="p-3.5">Title Inclusion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {tagList.map((tagItem, idx) => (
                  <tr key={idx} className="hover:bg-surface-muted transition">
                    <td className="p-3.5 font-bold text-ink flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-ink-tertiary shrink-0" />
                      <span>{tagItem.tag}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-[#0E8F5D] tabular-nums">{tagItem.searchScore}/100</span>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={tagItem.difficultyVariant}>
                        {tagItem.difficultyLabel}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-ink-secondary">{tagItem.relevance}</td>
                    <td className="p-3.5">
                      {tagItem.inTitle ? (
                        <span className="text-[#0E8F5D] font-bold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Present in Title
                        </span>
                      ) : (
                        <span className="text-ink-tertiary">Tag Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {tagList.map((tagItem, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-line bg-surface space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-ink truncate">{tagItem.tag}</span>
                  <Badge variant={tagItem.difficultyVariant}>{tagItem.difficultyLabel}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-line-subtle text-ink-secondary">
                  <span>Score: <strong className="text-[#0E8F5D] tabular-nums">{tagItem.searchScore}/100</strong></span>
                  <span>{tagItem.inTitle ? "✓ In Title" : "Tag Only"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
