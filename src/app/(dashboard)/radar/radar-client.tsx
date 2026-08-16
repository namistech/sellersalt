"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  ExternalLink,
  Eye,
  Flame,
  Plus,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap,
  Bookmark,
  Check,
} from "lucide-react";
import type { OpportunityRadarData, OpportunityItem, OpportunityType } from "@/services/opportunities";
import type { ProductHuntingResult } from "@/types/product-hunting";
import {
  Badge,
  Button,
  Card,
  DataText,
  Heading,
  Input,
  Select,
  Text,
  IconButton,
  IntelligenceCard,
  ViewSwitch,
  SafeImage,
  type ViewMode,
} from "@/components/ui";
import { EmptyState, Table, type Column } from "@/components/data";
import { fetchConnectors, type ConnectorSummary } from "@/services/connectors";
import { createSearchConfig, type CreateSearchConfigInput } from "@/services/searchConfigs";
import { updateProspect } from "@/services/prospects";
import { addProductToPlanner } from "@/services/product-hunting-client";
import { ProductResearchDrawer } from "@/components/intelligence/ProductResearchDrawer";
import { NewSearchDrawer } from "../new-search-drawer";
import { useResearchState } from "@/lib/research-persistence";

interface RadarClientProps {
  initialData: OpportunityRadarData;
  searchConfigId?: string;
  selectedType?: string;
  minScore?: number;
  initialQuery?: string;
}

export function RadarClient({
  initialData,
  searchConfigId,
  selectedType = "ALL",
  minScore = 0,
  initialQuery = "",
}: RadarClientProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);

  // Research persistence states
  const [searchQuery, setSearchQuery] = useResearchState<string>("radar_query", initialQuery);
  const [typeFilter, setTypeFilter] = useResearchState<string>("radar_type", selectedType);
  const [configFilter, setConfigFilter] = useResearchState<string>("radar_config", searchConfigId || "ALL");
  const [scoreFilter, setScoreFilter] = useResearchState<number>("radar_min_score", minScore);
  const [sortBy, setSortBy] = useResearchState<string>("radar_sort", "score");
  const [viewMode, setViewMode] = useResearchState<ViewMode>("radar_view_mode", "table");

  // Local state for optimistic updates
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(initialData.allOpportunities);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Planner & Research Drawer states
  const [activeDrawerProduct, setActiveDrawerProduct] = useState<ProductHuntingResult | null>(null);
  const [savedPlannerMap, setSavedPlannerMap] = useState<Record<string, boolean>>({});
  const [savingPlannerId, setSavingPlannerId] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectors().then(setConnectors).catch(() => {});
  }, []);

  function toProductHuntingResult(opp: OpportunityItem): ProductHuntingResult {
    return {
      id: opp.prospectId,
      listing: {
        listingId: opp.prospectId,
        title: opp.listingTitle,
        price: opp.price,
        currency: "USD",
        images: opp.listingImageUrl ? [opp.listingImageUrl] : [],
        imageUrl: opp.listingImageUrl,
        tags: [opp.keyword],
        materials: [],
        taxonomyId: null,
        createdTimestamp: Math.floor(new Date(opp.discoveredAt).getTime() / 1000),
        updatedTimestamp: Math.floor(new Date(opp.discoveredAt).getTime() / 1000),
        listingAgeDays: Math.max(1, Math.round((Date.now() - new Date(opp.discoveredAt).getTime()) / (24 * 3600 * 1000))),
        listingAgeMonths: opp.shopAgeMonths,
        listingUrl: opp.listingUrl,
        shopId: opp.shopExternalId,
        shopName: opp.shopName,
        numFavorers: opp.numFavorers,
        views: null,
      },
      shop: {
        shopId: opp.shopExternalId,
        shopName: opp.shopName,
        shopUrl: opp.shopUrl,
        shopIconUrl: opp.shopIconUrl,
        createdTimestamp: Math.floor((Date.now() - opp.shopAgeMonths * 30.44 * 24 * 3600 * 1000) / 1000),
        shopAgeMonths: opp.shopAgeMonths,
        totalSales: opp.totalSales,
        activeListings: opp.activeListings,
        reviewCount: opp.reviewCount,
        reviewAverage: opp.reviewAverage,
      },
      signals: {
        estDailySales: opp.estDailySales,
        avgSellingRatio: opp.avgSellingRatio,
        salesVelocityProxy: opp.estDailySales >= 8 ? "HIGH" : opp.estDailySales >= 3 ? "MODERATE" : "EMERGING",
        reviewConversionRate: opp.totalSales > 0 ? opp.reviewCount / opp.totalSales : 0,
      },
      opportunity: {
        opportunityScore: opp.score,
        classification: opp.type,
        classificationLabel: opp.typeLabel,
        classificationEmoji: opp.typeEmoji,
        reason: opp.reason,
        signals: opp.signals,
        evidence: [
          `Estimated velocity: ${opp.estDailySales.toFixed(1)} sales/day.`,
          `Catalog density: ${opp.avgSellingRatio.toFixed(1)} sales/listing.`,
          `Competition barrier: ${opp.reviewCount} reviews.`,
        ],
        strengths: ["Strong market momentum observed on Etsy"],
        weaknesses: [],
        recommendedAction: opp.score >= 80 ? "SHORTLIST" : "STUDY_PRICING",
        strategicTakeaway: opp.reason,
      },
    };
  }

  async function handleQuickAddToPlanner(opp: OpportunityItem) {
    setSavingPlannerId(opp.id);
    const prod = toProductHuntingResult(opp);
    try {
      await addProductToPlanner(prod);
      setSavedPlannerMap((prev) => ({ ...prev, [opp.id]: true }));
    } catch (err: any) {
      alert(err.message || "Failed to add to Planner");
    } finally {
      setSavingPlannerId(null);
    }
  }

  async function handleCreateSearch(input: CreateSearchConfigInput) {
    await createSearchConfig(input);
    setDrawerOpen(false);
    router.refresh();
  }

  // Filter & sort
  const filteredOpportunities = opportunities.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        item.shopName.toLowerCase().includes(q) ||
        item.listingTitle.toLowerCase().includes(q) ||
        item.keyword.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
    if (configFilter !== "ALL" && item.searchConfigId !== configFilter) return false;
    if (scoreFilter > 0 && item.score < scoreFilter) return false;
    return true;
  });

  filteredOpportunities.sort((a, b) => {
    switch (sortBy) {
      case "score":
        return b.score - a.score;
      case "velocity":
        return b.estDailySales - a.estDailySales;
      case "density":
        return b.avgSellingRatio - a.avgSellingRatio;
      case "freshness":
        return new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime();
      case "sales":
        return b.totalSales - a.totalSales;
      default:
        return b.score - a.score;
    }
  });

  async function handleToggleFavorite(item: OpportunityItem) {
    setActionLoadingId(item.id);
    const nextVal = !item.isFavorite;

    setOpportunities((prev) =>
      prev.map((o) => (o.id === item.id ? { ...o, isFavorite: nextVal } : o))
    );

    try {
      await updateProspect(item.prospectId, { isFavorite: nextVal });
    } catch {
      // Rollback
      setOpportunities((prev) =>
        prev.map((o) => (o.id === item.id ? { ...o, isFavorite: !nextVal } : o))
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleToggleShortlist(item: OpportunityItem) {
    setActionLoadingId(item.id);
    const nextStatus = item.status === "SHORTLISTED" ? "PENDING_REVIEW" : "SHORTLISTED";

    setOpportunities((prev) =>
      prev.map((o) =>
        o.id === item.id
          ? {
              ...o,
              status: nextStatus,
              isShortlisted: nextStatus === "SHORTLISTED",
            }
          : o
      )
    );

    try {
      await updateProspect(item.prospectId, { status: nextStatus });
    } catch {
      // Rollback
      setOpportunities((prev) =>
        prev.map((o) => (o.id === item.id ? { ...o, status: item.status, isShortlisted: item.isShortlisted } : o))
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  function renderTypeBadge(type: OpportunityType) {
    switch (type) {
      case "EMERGING":
        return (
          <Badge variant="warning" className="font-semibold text-warn-strong bg-warn-subtle border border-warn/30">
            🔥 Emerging Winner
          </Badge>
        );
      case "HIDDEN_GEM":
        return (
          <Badge variant="neutral" className="font-semibold text-amber-800 bg-amber-50 border border-amber-300">
            💎 Hidden Gem
          </Badge>
        );
      case "COMPETITION_RISING":
        return (
          <Badge variant="neutral" className="font-medium text-ink-secondary bg-surface-muted border border-line">
            ⚠️ Crowded Niche
          </Badge>
        );
      case "GROWING":
      default:
        return (
          <Badge variant="success" className="font-semibold text-brand-primary bg-brand-primary-subtle border border-brand-primary/20">
            📈 Consistent Growth
          </Badge>
        );
    }
  }

  const columns: Column<OpportunityItem>[] = [
    {
      key: "opportunity",
      header: "Opportunity / Product",
      render: (row) => (
        <div className="flex items-start gap-3 max-w-sm">
          <SafeImage
            src={row.listingImageUrl}
            alt={row.listingTitle || row.shopName}
            fallbackType="product"
            className="h-10 w-10 shrink-0 rounded-md border border-line object-cover"
          />
          <div className="min-w-0">
            <Link
              href={`/shops/${row.shopExternalId}`}
              className="font-medium text-ink hover:text-brand-primary line-clamp-1 text-sm transition-colors"
            >
              {row.listingTitle || row.shopName}
            </Link>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-tertiary">
              <span className="font-medium text-ink-secondary">{row.shopName}</span>
              <span>·</span>
              <span>${row.price.toFixed(2)}</span>
              <span>·</span>
              <span>{row.keyword}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Classification",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          {renderTypeBadge(row.type)}
          <span className="text-[11px] text-ink-tertiary line-clamp-1 max-w-[200px]">
            {row.reason}
          </span>
        </div>
      ),
    },
    {
      key: "score",
      header: "Score",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg font-mono text-sm font-bold shadow-xs ${
              row.score >= 80
                ? "bg-brand-primary-subtle text-brand-primary border border-brand-primary/30"
                : row.score >= 65
                ? "bg-surface-muted text-ink border border-line"
                : "bg-surface text-ink-tertiary border border-line-subtle"
            }`}
          >
            {row.score}
          </div>
          <div className="text-[11px] text-ink-tertiary">
            <div>{row.score >= 80 ? "High Signal" : row.score >= 65 ? "Moderate" : "Low"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "velocity",
      header: "Daily Sales",
      render: (row) => (
        <div>
          <div className="font-mono text-sm font-medium text-ink">
            {row.estDailySales.toFixed(1)}/day
          </div>
          <div className="text-[11px] text-ink-tertiary">
            {row.totalSales.toLocaleString()} total
          </div>
        </div>
      ),
    },
    {
      key: "density",
      header: "Sales/Listing",
      render: (row) => (
        <div>
          <div className="font-mono text-sm font-medium text-ink">
            {row.avgSellingRatio.toFixed(1)}x
          </div>
          <div className="text-[11px] text-ink-tertiary">
            {row.activeListings} listings
          </div>
        </div>
      ),
    },
    {
      key: "competition",
      header: "Competition",
      render: (row) => (
        <div>
          <div className="text-xs font-medium text-ink">
            {row.reviewCount} reviews
          </div>
          <div className="text-[11px] text-ink-tertiary">
            {Math.round(row.shopAgeMonths)} mos old
          </div>
        </div>
      ),
    },
    {
      key: "freshness",
      header: "Discovered",
      render: (row) => (
        <div className="text-xs text-ink-tertiary">
          {row.signals.freshness.metricValue}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => {
        const isSaved = savedPlannerMap[row.id] || row.status === "SHORTLISTED";
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <IconButton
              icon={<Star className={`h-4 w-4 ${row.isFavorite ? "fill-amber-400 text-amber-400" : "text-ink-tertiary"}`} />}
              aria-label={row.isFavorite ? "Unfavorite" : "Favorite"}
              variant="tertiary"
              size="compact"
              onClick={() => handleToggleFavorite(row)}
              disabled={actionLoadingId === row.id}
            />

            <Button
              variant={isSaved ? "secondary" : "primary"}
              size="compact"
              loading={savingPlannerId === row.id}
              disabled={isSaved}
              onClick={() => handleQuickAddToPlanner(row)}
              className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs h-7 px-2.5 text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
            >
              {isSaved ? (
                <>
                  <Check className="h-3 w-3 mr-1" /> Saved
                </>
              ) : (
                <>
                  <Bookmark className="h-3 w-3 mr-1" /> Planner
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              size="compact"
              onClick={() => setActiveDrawerProduct(toProductHuntingResult(row))}
              className="text-xs h-7 px-2.5"
            >
              Inspect Radar →
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* ---------------------------------------------------------------- */}
      {/* PAGE HEADER                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line-subtle pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary-subtle text-brand-primary">
              <Flame className="h-4 w-4" />
            </span>
            <Heading as="h1" size="h2" className="tracking-tight">
              Opportunity Radar
            </Heading>
            <Badge variant="success" className="font-semibold text-brand-primary bg-brand-primary-subtle border border-brand-primary/20">
              Live Intelligence
            </Badge>
          </div>
          <Text size="body-md" color="secondary" className="mt-1 max-w-2xl">
            Real-time decision layer detecting high-velocity Etsy niches, lean catalogs, and hidden demand before they become crowded.
          </Text>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="default"
            onClick={() => router.push("/spy")}
            className="gap-1.5 shadow-xs"
          >
            <Eye className="h-4 w-4" />
            Spy on Shop
          </Button>
          <Button
            variant="primary"
            size="default"
            onClick={() => setDrawerOpen(true)}
            className="gap-1.5 shadow-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            New Search Stream
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* ROW 1: RADAR PULSE METRICS                                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md" className="border-line shadow-xs">
          <div className="flex items-start justify-between">
            <Text size="label-sm" color="tertiary" className="font-medium">
              High-Potential Discoveries
            </Text>
            <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-primary-subtle text-brand-primary text-xs font-bold">
              ★
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <DataText size="data-lg" className="font-bold text-ink">
              {initialData.pulse.highPotentialCount}
            </DataText>
            <span className="text-xs text-ink-tertiary">
              of {initialData.pulse.totalOpportunities} analyzed
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
            <Text size="meta" color="secondary">
              Score ≥ 75 prime opportunities
            </Text>
          </div>
        </Card>

        <Card padding="md" className="border-line shadow-xs">
          <div className="flex items-start justify-between">
            <Text size="label-sm" color="tertiary" className="font-medium">
              Emerging Winners
            </Text>
            <span className="text-sm">🔥</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <DataText size="data-lg" className="font-bold text-warn-strong">
              {initialData.pulse.emergingCount}
            </DataText>
            <span className="text-xs text-ink-tertiary">rapid velocity</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-warn" />
            <Text size="meta" color="secondary">
              Young shops (&lt;18 mos) scaling fast
            </Text>
          </div>
        </Card>

        <Card padding="md" className="border-line shadow-xs">
          <div className="flex items-start justify-between">
            <Text size="label-sm" color="tertiary" className="font-medium">
              Hidden Gems
            </Text>
            <span className="text-sm">💎</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <DataText size="data-lg" className="font-bold text-amber-700">
              {initialData.pulse.hiddenGemCount}
            </DataText>
            <span className="text-xs text-ink-tertiary">lean catalogs</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <Text size="meta" color="secondary">
              High sales/listing with low competition
            </Text>
          </div>
        </Card>

        <Card padding="md" className="border-line shadow-xs">
          <div className="flex items-start justify-between">
            <Text size="label-sm" color="tertiary" className="font-medium">
              Average Radar Score
            </Text>
            <Compass className="h-4 w-4 text-ink-tertiary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <DataText size="data-lg" className="font-bold text-ink">
              {initialData.pulse.averageScore}
              <span className="text-sm font-normal text-ink-tertiary">/100</span>
            </DataText>
            <Badge variant="neutral" className="font-mono text-xs">
              {initialData.pulse.topNiches.length} Active Niches
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
            <Text size="meta" color="secondary">
              Calculated across 5 deterministic signals
            </Text>
          </div>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* ROW 2: SPOTLIGHT OPPORTUNITIES (TOP 3 CARDS)                     */}
      {/* ---------------------------------------------------------------- */}
      {initialData.spotlightOpportunities.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-primary" />
                <Heading as="h2" size="h4">
                  Top Priority Opportunities
                </Heading>
              </div>
              <Text size="body-sm" color="secondary" className="mt-0.5">
                Highest-conviction signals answering why each opportunity is promising and what to do next.
              </Text>
            </div>
            <Badge variant="neutral" className="text-xs text-ink-tertiary">
              Ranked by composite velocity & efficiency
            </Badge>
          </div>

          {/* Level 1: Dominant #1 Breakout Opportunity Card */}
          {initialData.spotlightOpportunities[0] && (() => {
            const top = initialData.spotlightOpportunities[0];
            const isTopSaved = savedPlannerMap[top.id] || top.status === "SHORTLISTED";
            return (
              <IntelligenceCard
                badgeText="TOP BREAKOUT OPPORTUNITY"
                badgeIcon={<Flame className="h-3.5 w-3.5 text-[#FFB020]" />}
                title={top.listingTitle || top.shopName}
                score={top.score}
                scoreMax={100}
                verdictLabel="High Opportunity Breakout"
                verdictVariant="success"
                provenance="SELLERSALT_SCORE"
                description={`Discovered in ${top.keyword} with an estimated ${top.estDailySales.toFixed(1)} daily transactions (~$${(top.estDailySales * 30.44 * top.price).toFixed(0)}/mo) and lean catalog yield of ${top.avgSellingRatio.toFixed(1)} sales/listing.`}
                actionLabel={isTopSaved ? "Saved in Planner" : "+ Add to Workspace Planner"}
                onAction={() => handleQuickAddToPlanner(top)}
                secondaryAction={
                  <Link href={`/products/${top.prospectId}`}>
                    <Button variant="secondary" size="compact" className="text-xs bg-[#1C261F] text-white border-[#2A362D] hover:bg-[#2A362D]">
                      Inspect Product Details →
                    </Button>
                  </Link>
                }
                sidePanel={
                  <div className="space-y-3">
                    <div className="text-[11px] font-bold text-[#9EAA9F] uppercase tracking-wider">
                      Breakout Metrics
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#9EAA9F]">Observed Price:</span>
                        <span className="font-mono font-bold text-white">${top.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9EAA9F]">Daily Sales Velocity:</span>
                        <span className="font-mono font-bold text-[#16C784]">{top.estDailySales.toFixed(1)} / day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9EAA9F]">Catalog Yield:</span>
                        <span className="font-mono font-bold text-white">{top.avgSellingRatio.toFixed(1)}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9EAA9F]">Review Threshold:</span>
                        <span className="font-mono font-bold text-[#F59E0B]">{top.reviewCount} reviews</span>
                      </div>
                    </div>
                  </div>
                }
              >
                <div className="flex items-center gap-4 text-xs text-[#9EAA9F]">
                  <span>Store: <Link href={`/shops/${top.shopExternalId}`} className="text-[#16C784] font-bold hover:underline">{top.shopName}</Link></span>
                  <span>·</span>
                  <span>Target Niche: <strong className="text-white">{top.keyword}</strong></span>
                  <span>·</span>
                  <span>Discovered: {top.signals.freshness.metricValue}</span>
                </div>
              </IntelligenceCard>
            );
          })()}

          {/* Supporting Spotlight Opportunities Grid */}
          {initialData.spotlightOpportunities.length > 1 && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {initialData.spotlightOpportunities.slice(1).map((opp) => (
                <Card
                  key={opp.id}
                  padding="md"
                  className="relative flex flex-col justify-between border-line shadow-xs hover:border-line-strong hover:shadow-sm transition-all bg-surface"
                >
                  <div>
                    {/* Top Badge Row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {renderTypeBadge(opp.type)}
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-brand-primary bg-brand-primary-subtle px-2 py-0.5 rounded border border-brand-primary/30">
                          Score {opp.score}
                        </span>
                      </div>
                    </div>

                    {/* 1. WHAT: Opportunity details */}
                    <div className="flex items-start gap-3">
                      <SafeImage
                        src={opp.listingImageUrl}
                        alt={opp.listingTitle || opp.shopName}
                        fallbackType="product"
                        className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/products/${opp.prospectId}`}
                          className="font-semibold text-sm text-ink hover:text-brand-primary line-clamp-2 transition-colors"
                        >
                          {opp.listingTitle || opp.shopName}
                        </Link>
                        <div className="mt-1 flex items-center gap-2 text-xs text-ink-tertiary">
                          <Link href={`/shops/${opp.shopExternalId}`} className="font-medium text-ink-secondary hover:underline">
                            {opp.shopName}
                          </Link>
                          <span>·</span>
                          <span className="font-semibold text-ink">${opp.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                  {/* 2. WHY: Deterministic explanation */}
                  <div className="mt-3.5 rounded-lg bg-surface-muted p-2.5 border border-line-subtle">
                    <Text size="body-sm" color="primary" className="text-xs leading-relaxed italic">
                      "{opp.reason}"
                    </Text>
                  </div>

                  {/* 3 & 4. EVIDENCE: 5-Signal Radar Chips */}
                  <div className="mt-3.5 space-y-1.5 border-t border-line-subtle pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-tertiary flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-brand-primary" /> Velocity
                      </span>
                      <span className="font-mono font-medium text-ink">
                        {opp.signals.velocity.metricValue}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-tertiary flex items-center gap-1">
                        <Target className="h-3.5 w-3.5 text-amber-500" /> Sales Density
                      </span>
                      <span className="font-mono font-medium text-ink">
                        {opp.signals.density.metricValue}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-tertiary flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-info" /> Competition
                      </span>
                      <span className="font-mono font-medium text-ink">
                        {opp.signals.competition.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-tertiary">Freshness</span>
                      <span className="text-ink-secondary">{opp.signals.freshness.metricValue}</span>
                    </div>
                  </div>
                </div>

                {/* 5. WHAT NEXT: Action triggers */}
                <div className="mt-5 flex items-center gap-2 border-t border-line-subtle pt-3.5">
                  <Button
                    variant="primary"
                    size="compact"
                    onClick={() => setActiveDrawerProduct(toProductHuntingResult(opp))}
                    className="flex-1 text-xs font-semibold shadow-xs bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
                  >
                    Inspect Radar →
                  </Button>

                  <Button
                    variant={savedPlannerMap[opp.id] || opp.isShortlisted ? "secondary" : "primary"}
                    size="compact"
                    loading={savingPlannerId === opp.id}
                    disabled={savedPlannerMap[opp.id] || opp.isShortlisted}
                    onClick={() => handleQuickAddToPlanner(opp)}
                    className="text-xs px-2.5 bg-[#0E8F5D] text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
                  >
                    {savedPlannerMap[opp.id] || opp.isShortlisted ? (
                      <>
                        <Check className="h-3 w-3 mr-1" /> Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-3 w-3 mr-1" /> Planner
                      </>
                    )}
                  </Button>

                  <IconButton
                    icon={<Star className={`h-4 w-4 ${opp.isFavorite ? "fill-amber-400 text-amber-400" : "text-ink-tertiary"}`} />}
                    aria-label="Save to favorites"
                    variant="secondary"
                    size="compact"
                    onClick={() => handleToggleFavorite(opp)}
                    disabled={actionLoadingId === opp.id}
                  />
                </div>
              </Card>
            ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* ROW 3: INTELLIGENCE CONTROLS & FILTER BAR                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Heading as="h2" size="h4">
              All Opportunity Discoveries
            </Heading>
            <Text size="body-sm" color="secondary">
              Showing {filteredOpportunities.length} of {opportunities.length} detected opportunities
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Type Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "ALL", label: "All Opportunities" },
                { key: "EMERGING", label: "🔥 Emerging" },
                { key: "HIDDEN_GEM", label: "💎 Hidden Gems" },
                { key: "GROWING", label: "📈 Growing" },
                { key: "COMPETITION_RISING", label: "⚠️ Crowded" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTypeFilter(tab.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    typeFilter === tab.key
                      ? "bg-brand-primary text-white shadow-xs"
                      : "bg-surface-muted text-ink-secondary hover:bg-line-subtle hover:text-ink border border-line-subtle"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <ViewSwitch value={viewMode} onChange={setViewMode} modes={["table", "grid"]} />
          </div>
        </div>

        {/* Filter Toolbar Card */}
        <Card padding="md" className="border-line bg-surface shadow-xs space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* 1. Keyword search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-tertiary" />
              <Input
                placeholder="Search shop, title, or niche..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* 2. Search Config Stream */}
            <Select
              value={configFilter}
              onChange={(e) => setConfigFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Search Streams" },
                ...initialData.searchConfigs.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />

            {/* 3. Min Score */}
            <Select
              value={String(scoreFilter)}
              onChange={(e) => setScoreFilter(Number(e.target.value))}
              options={[
                { value: "0", label: "Any Opportunity Score" },
                { value: "60", label: "Score ≥ 60 (Promising)" },
                { value: "75", label: "Score ≥ 75 (High Signal)" },
                { value: "85", label: "Score ≥ 85 (Elite Tier)" },
              ]}
            />

            {/* 4. Sort By */}
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: "score", label: "Sort by Opportunity Score" },
                { value: "velocity", label: "Sort by Daily Velocity" },
                { value: "density", label: "Sort by Sales/Listing Density" },
                { value: "freshness", label: "Sort by Recency" },
                { value: "sales", label: "Sort by Total Sales" },
              ]}
            />

            {/* 5. Reset Filters */}
            {searchQuery || typeFilter !== "ALL" || configFilter !== "ALL" || scoreFilter > 0 ? (
              <Button
                variant="secondary"
                size="default"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("ALL");
                  setConfigFilter("ALL");
                  setScoreFilter(0);
                }}
                className="text-xs"
              >
                Reset Filters
              </Button>
            ) : (
              <div className="flex items-center text-xs text-ink-tertiary px-2">
                Deterministic Model Active
              </div>
            )}
          </div>
        </Card>

        {/* -------------------------------------------------------------- */}
        {/* ROW 4: OPPORTUNITIES DATA TABLE OR EMPTY STATE                 */}
        {/* -------------------------------------------------------------- */}
        {filteredOpportunities.length === 0 ? (
          <Card padding="lg" className="border-line">
            <EmptyState
              title={
                opportunities.length === 0
                  ? "No Opportunity Signals Detected Yet"
                  : "No opportunities match your selected filters"
              }
              description={
                opportunities.length === 0
                  ? "Opportunity Radar analyzes Etsy search results in real time. Launch a search stream to uncover winning products, high-velocity shops, and untapped niches."
                  : "Try clearing your filters or lowering the minimum score threshold to see more opportunities."
              }
              action={
                opportunities.length === 0 ? (
                  <Button
                    variant="primary"
                    onClick={() => setDrawerOpen(true)}
                    className="font-semibold shadow-sm gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Create First Search Stream
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("ALL");
                      setConfigFilter("ALL");
                      setScoreFilter(0);
                    }}
                  >
                    Reset Filters
                  </Button>
                )
              }
            />
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOpportunities.map((opp) => (
              <Card
                key={opp.id}
                padding="md"
                className="border-line bg-surface shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    {renderTypeBadge(opp.type)}
                    <span className="font-mono text-xs font-bold text-[#0E8F5D] bg-[#E7FAF1] px-2 py-0.5 rounded border border-[#16C784]/20 tabular-nums">
                      Score {opp.score}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <SafeImage
                      src={opp.listingImageUrl}
                      alt={opp.listingTitle || opp.shopName}
                      fallbackType="product"
                      className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${opp.prospectId}`}
                        className="font-bold text-xs text-ink hover:text-[#0E8F5D] line-clamp-2 transition-colors"
                      >
                        {opp.listingTitle || opp.shopName}
                      </Link>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-tertiary">
                        <Link href={`/shops/${opp.shopExternalId}`} className="text-ink-secondary hover:underline">
                          {opp.shopName}
                        </Link>
                        <span>·</span>
                        <span className="font-mono font-semibold text-ink">${opp.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-ink-secondary line-clamp-2 italic bg-surface-muted p-2 rounded-md border border-line-subtle">
                    "{opp.reason}"
                  </p>
                </div>

                <div className="pt-2 border-t border-line-subtle flex items-center justify-between gap-2">
                  <Link href={`/products/${opp.prospectId}`} className="flex-1">
                    <Button variant="secondary" size="compact" className="w-full text-xs font-semibold">
                      Inspect →
                    </Button>
                  </Link>

                  <Button
                    variant={savedPlannerMap[opp.id] || opp.isShortlisted ? "secondary" : "primary"}
                    size="compact"
                    loading={savingPlannerId === opp.id}
                    disabled={savedPlannerMap[opp.id] || opp.isShortlisted}
                    onClick={() => handleQuickAddToPlanner(opp)}
                    className="text-xs bg-[#0E8F5D] text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
                  >
                    {savedPlannerMap[opp.id] || opp.isShortlisted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Bookmark className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Table<OpportunityItem>
            columns={columns}
            rows={filteredOpportunities}
            getRowId={(row) => row.id}
            aria-label="Opportunity Discoveries Table"
          />
        )}
      </div>

      {/* New Search Drawer */}
      <NewSearchDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        connectors={connectors}
        onSubmit={handleCreateSearch}
      />

      {/* Product Research Drawer */}
      <ProductResearchDrawer
        product={activeDrawerProduct}
        open={!!activeDrawerProduct}
        onClose={() => setActiveDrawerProduct(null)}
        onPlannerAdded={(prod) => {
          setSavedPlannerMap((prev) => ({ ...prev, [prod.id]: true }));
        }}
      />
    </div>
  );
}
