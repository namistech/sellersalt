"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FolderTree,
  Search,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Bookmark,
  Check,
  ChevronRight,
  Compass,
  AlertTriangle,
  Layers,
  Tag,
  ShieldCheck,
  SlidersHorizontal,
  DollarSign,
  TrendingUp,
  Store,
  ShoppingBag,
  Plus,
  Zap,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Button,
  Badge,
  IntelligenceCard,
  Input,
  ViewSwitch,
  HowItWorksGuide,
  HowItWorksToggle,
  SafeImage,
  CountrySelector,
  MarketplaceSelector,
  type ViewMode,
} from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import {
  BarChart,
  HorizontalBarChart,
  SeasonalityChart,
  RankingVisualizer,
  DistributionHistogram,
} from "@/components/data/charts";
import {
  searchCategoryTaxonomy,
  fetchCategoryDetail,
  addCategoryToPlanner,
} from "@/services/category-hunting-client";
import { addProductToPlanner } from "@/services/product-hunting-client";
import type { EtsyRawTaxonomyNode, FlattenedTaxonomyNode } from "@/connectors/etsy/taxonomy";
import type { CategoryIntelligenceProfile } from "@/types/category-hunting";
import type { ProductHuntingResult } from "@/types/product-hunting";
import { useResearchState } from "@/lib/research-persistence";

interface CategoryHuntingClientProps {
  initialRoots: EtsyRawTaxonomyNode[];
  initialTaxonomyId?: number;
}

export function CategoryHuntingClient({
  initialRoots,
  initialTaxonomyId,
}: CategoryHuntingClientProps) {
  const [roots] = useState<EtsyRawTaxonomyNode[]>(initialRoots);
  const [selectedTaxonomyId, setSelectedTaxonomyId] = useResearchState<number | null>(
    "cat_selected_id",
    initialTaxonomyId || (initialRoots[0]?.id ?? null)
  );
  const [searchQuery, setSearchQuery] = useResearchState<string>("cat_search_query", "");
  const [searchResults, setSearchResults] = useState<FlattenedTaxonomyNode[]>([]);
  const [profile, setProfile] = useState<CategoryIntelligenceProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Planner states
  const [savingPlannerCategory, setSavingPlannerCategory] = useState(false);
  const [savedPlannerCategory, setSavedPlannerCategory] = useState(false);
  const [savingPlannerListingId, setSavingPlannerListingId] = useState<string | null>(null);
  const [savedPlannerListingIds, setSavedPlannerListingIds] = useState<Record<string, boolean>>({});

  // Search debouncer
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchCategoryTaxonomy(searchQuery.trim());
        setSearchResults(res.results || []);
      } catch (err: any) {
        console.error("Category search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load category profile when selected taxonomy ID changes
  useEffect(() => {
    if (!selectedTaxonomyId) return;

    let isMounted = true;
    async function loadDetail() {
      setIsLoadingProfile(true);
      setError(null);
      setSavedPlannerCategory(false);

      try {
        const res = await fetchCategoryDetail(selectedTaxonomyId!);
        if (isMounted) {
          setProfile(res.profile);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load category intelligence.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedTaxonomyId]);

  async function handleAddCategoryToPlanner() {
    if (!profile) return;
    setSavingPlannerCategory(true);
    try {
      await addCategoryToPlanner(profile);
      setSavedPlannerCategory(true);
    } catch (err: any) {
      alert(err.message || "Failed to add category to planner");
    } finally {
      setSavingPlannerCategory(false);
    }
  }

  async function handleAddProductToPlanner(product: ProductHuntingResult) {
    setSavingPlannerListingId(product.id);
    try {
      await addProductToPlanner(product);
      setSavedPlannerListingIds((prev) => ({ ...prev, [product.id]: true }));
    } catch (err: any) {
      alert(err.message || "Failed to add product to planner");
    } finally {
      setSavingPlannerListingId(null);
    }
  }

  const [selectedMarket, setSelectedMarket] = useResearchState<string>("cat_selected_market", "US");

  // Simulated Seasonality Pattern for the Category
  const categorySeasonality = [
    { month: "Jan", index: 92 },
    { month: "Feb", index: 98 },
    { month: "Mar", index: 104 },
    { month: "Apr", index: 108 },
    { month: "May", index: 114 },
    { month: "Jun", index: 102 },
    { month: "Jul", index: 95 },
    { month: "Aug", index: 106 },
    { month: "Sep", index: 115 },
    { month: "Oct", index: 132, isPeak: true },
    { month: "Nov", index: 175, isPeak: true },
    { month: "Dec", index: 165, isPeak: true },
  ];

  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* ==================================================================== */}
      {/* 1. SEARCH / FILTER CONTROLS (AT TOP OF PAGE) */}
      {/* ==================================================================== */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#0E8F5D] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <FolderTree className="h-4 w-4" />
              </div>
              <Heading as="h1" size="h2">
                Category Hunting &amp; Taxonomy Exploration
              </Heading>
            </div>
            <Text size="body-sm" color="secondary" className="mt-1">
              Search any buyer category or navigate sub-branches to evaluate market entry feasibility.
            </Text>
          </div>

          <div className="flex items-center gap-2.5">
            <CountrySelector size="sm" />
            <HowItWorksToggle isOpen={showGuide} onToggle={() => setShowGuide(!showGuide)} />
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>
        </div>

        {/* Multi-Marketplace Selector */}
        <MarketplaceSelector className="w-fit" />

      {/* Expandable Guide */}
      <HowItWorksGuide
        isOpen={showGuide}
        onToggle={() => setShowGuide(!showGuide)}
        title="How Category Hunting Works"
        description="Explore Etsy's official buyer taxonomy hierarchy to uncover sub-niches with high transaction velocity and low incumbent competition."
        steps={[
          {
            title: "1. Select Category or Sub-Niche",
            description: "Search or navigate child branches from top-level taxonomy roots down to specific leaf sub-niches.",
            badge: "Taxonomy Tree",
          },
          {
            title: "2. Market Entry Feasibility",
            description: "Review saturation indices, median pricing brackets, and average store review barriers.",
            badge: "Entry Verdict",
          },
          {
            title: "3. Breakout Listings & Tags",
            description: "Inspect winning products, dominant competitor stores, and extracted keyword patterns.",
            badge: "Product Intelligence",
          },
        ]}
      />

        {/* Top Search Input & Root Quick Chips */}
        <div className="space-y-3 pt-1">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary" />
            <input
              type="text"
              placeholder="Search category taxonomy (e.g. 'Handmade Jewelry', 'Digital Planners', 'Pet Supplies', 'Wedding Signage')…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-line bg-[#FAFAF8] focus:bg-white focus:border-[#0E8F5D] focus:outline-none transition-all shadow-inner-xs"
            />
            {isSearching && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-[#0E8F5D] border-t-transparent rounded-full" />
              </div>
            )}
          </div>

          {/* Autocomplete Search Dropdown */}
          {searchResults.length > 0 && (
            <div className="border border-line rounded-xl bg-white shadow-md divide-y divide-line-subtle max-h-60 overflow-y-auto z-20">
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => {
                    setSelectedTaxonomyId(res.id);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="w-full p-3 text-left hover:bg-[#FAFAF8] transition flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-xs text-ink group-hover:text-[#0E8F5D]">{res.name}</div>
                    <div className="text-[11px] text-ink-tertiary">{res.fullPath}</div>
                  </div>
                  <span className="text-[10px] font-bold text-[#0E8F5D] px-2 py-0.5 rounded bg-[#E7FAF1]">
                    Level {res.level}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Root Taxonomy Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-ink-tertiary text-[11px] font-bold uppercase shrink-0 mr-1">Roots:</span>
            {roots.slice(0, 8).map((root) => (
              <button
                key={root.id}
                type="button"
                onClick={() => setSelectedTaxonomyId(root.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedTaxonomyId === root.id
                    ? "bg-[#0E8F5D] text-white shadow-xs"
                    : "bg-surface-muted text-ink hover:bg-surface border border-line-subtle"
                }`}
              >
                {root.name}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Loading or Error State */}
      {isLoadingProfile ? (
        <Card padding="lg" className="border-line bg-white shadow-xs text-center py-20">
          <div className="animate-spin h-8 w-8 border-3 border-[#0E8F5D] border-t-transparent rounded-full mx-auto" />
          <Text size="body-sm" color="secondary" className="mt-3">
            Ingesting Etsy category taxonomy &amp; calculating market entry benchmarks…
          </Text>
        </Card>
      ) : error ? (
        <Card padding="lg" className="border-line bg-white shadow-xs text-center py-12 space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto" />
          <div className="font-bold text-sm text-ink">Unable to Load Category</div>
          <Text size="body-sm" color="secondary">{error}</Text>
        </Card>
      ) : profile ? (
        <>
          {/* Breadcrumb Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-ink-tertiary">
              {profile.breadcrumb.map((crumb, idx) => (
                <div key={crumb.id} className="flex items-center gap-1.5">
                  {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-tertiary" />}
                  <button
                    type="button"
                    onClick={() => setSelectedTaxonomyId(crumb.id)}
                    className={`hover:underline transition-colors ${
                      crumb.id === profile.taxonomyId
                        ? "font-bold text-[#0E8F5D]"
                        : "text-ink-secondary hover:text-ink font-medium"
                    }`}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/prospects?taxonomyId=${profile.taxonomyId}&categoryName=${encodeURIComponent(profile.name)}`}
                className="px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-[#FAFAF8] text-ink text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Compass className="h-3.5 w-3.5 text-[#0E8F5D]" />
                <span>Hunt Listings</span>
              </Link>
              <Button
                variant={savedPlannerCategory ? "secondary" : "primary"}
                size="compact"
                loading={savingPlannerCategory}
                disabled={savedPlannerCategory}
                onClick={handleAddCategoryToPlanner}
                className="text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
              >
                {savedPlannerCategory ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" /> Saved in Planner
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3.5 w-3.5 mr-1" /> Save Category
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* 2. MARKET ENTRY DECISION (PRIMARY LEVEL-1 ATTENTION SURFACE) */}
          {/* ==================================================================== */}
          <IntelligenceCard
            contextTheme="radar"
            badgeText="MARKET ENTRY INTELLIGENCE"
            badgeIcon={<Layers className="h-3.5 w-3.5 text-[#FBBF24]" />}
            title={`Should you enter the "${profile.name}" category?`}
            score={profile.benchmarks.opportunityScore}
            scoreMax={100}
            verdictLabel={profile.benchmarks.verdictBadge}
            verdictVariant={
              profile.benchmarks.opportunityScore >= 70
                ? "success"
                : profile.benchmarks.opportunityScore >= 45
                ? "warning"
                : "danger"
            }
            provenance="SELLERSALT_SCORE"
            description={
              profile.benchmarks.opportunityScore >= 70
                ? `This category shows favorable market dynamics with an opportunity score of ${profile.benchmarks.opportunityScore}/100 and healthy daily velocity (~${profile.benchmarks.avgDailySalesProxy.toFixed(1)} sales/day per store).`
                : profile.benchmarks.opportunityScore >= 45
                ? `This category has moderate incumbent competition (${profile.benchmarks.nicheSaturationIndex}). Entry requires a differentiated product angle and targeted long-tail SEO.`
                : `This category has heavy saturation and high incumbent review barriers (${profile.benchmarks.reviewSaturationAverage.toLocaleString()} avg reviews). Niche down into specific sub-branches before entering.`
            }
            actionLabel={savedPlannerCategory ? "Saved in Planner" : "Save Category to Planner"}
            onAction={handleAddCategoryToPlanner}
            sidePanel={
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-[#9EAA9F] uppercase tracking-wider">
                  Market Saturation &amp; Entry
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#9EAA9F]">Saturation Index:</span>
                    <span className="font-bold text-white">{profile.benchmarks.nicheSaturationIndex}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9EAA9F]">Avg Daily Velocity:</span>
                    <span className="font-bold text-[#16C784] tabular-nums">~{profile.benchmarks.avgDailySalesProxy.toFixed(1)} / day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9EAA9F]">Avg Incumbent Reviews:</span>
                    <span className="font-bold text-[#FBBF24] tabular-nums">{profile.benchmarks.reviewSaturationAverage.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9EAA9F]">Observed Median Price:</span>
                    <span className="font-bold text-white tabular-nums">${profile.benchmarks.medianPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-[#1C261F] border border-[#2A362D] space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#FBBF24]" /> What to Study:
                </div>
                <p className="text-[#9EAA9F] leading-relaxed">{profile.strategicAdvice.whatToStudy}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#1C261F] border border-[#2A362D] space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> What to Avoid:
                </div>
                <p className="text-[#9EAA9F] leading-relaxed">{profile.strategicAdvice.whatToAvoid}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#1C261F] border border-[#2A362D] space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#16C784]" /> Recommended Action:
                </div>
                <p className="text-[#9EAA9F] leading-relaxed">{profile.strategicAdvice.whatToDoNext}</p>
              </div>
            </div>
          </IntelligenceCard>

          {/* ==================================================================== */}
          {/* 3. CORE MARKET METRICS (8-KPI BENCHMARK MATRIX) */}
          {/* ==================================================================== */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Heading as="h2" size="h4">
                Core Market Metrics &amp; Benchmarks
              </Heading>
              <span className="text-xs text-ink-tertiary">Etsy category sampling &amp; metrics</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase">Sampled Supply</span>
                  <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
                </div>
                <div className="text-xl font-bold text-ink tabular-nums">
                  {profile.benchmarks.observedListingsCount} listings
                </div>
                <div className="text-[10px] text-ink-tertiary">Top ranking sample</div>
              </Card>

              <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase">Median Price</span>
                  <DataProvenanceBadge type="ESTIMATED" />
                </div>
                <div className="text-xl font-bold text-ink tabular-nums">
                  ${profile.benchmarks.medianPrice.toFixed(2)}
                </div>
                <div className="text-[10px] text-ink-tertiary">50th percentile</div>
              </Card>

              <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase">10th-90th Spread</span>
                  <DataProvenanceBadge type="ESTIMATED" />
                </div>
                <div className="text-sm font-bold text-ink pt-1 truncate tabular-nums">
                  ${profile.benchmarks.price10thPercentile.toFixed(2)} - ${profile.benchmarks.price90thPercentile.toFixed(2)}
                </div>
                <div className="text-[10px] text-ink-tertiary">${profile.benchmarks.priceDistribution.priceSpread.toFixed(2)} spread</div>
              </Card>

              <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase">Daily Velocity</span>
                  <DataProvenanceBadge type="ESTIMATED" />
                </div>
                <div className="text-xl font-bold text-[#0E8F5D] tabular-nums">
                  {profile.benchmarks.avgDailySalesProxy.toFixed(1)}/day
                </div>
                <div className="text-[10px] text-ink-tertiary">Avg across stores</div>
              </Card>

              <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase">Catalog Yield</span>
                  <DataProvenanceBadge type="ESTIMATED" />
                </div>
                <div className="text-xl font-bold text-ink tabular-nums">
                  {profile.benchmarks.catalogYieldProxy.toFixed(1)}
                </div>
                <div className="text-[10px] text-ink-tertiary">Sales / active listing</div>
              </Card>

              <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase">Avg Reviews</span>
                  <DataProvenanceBadge type="ESTIMATED" />
                </div>
                <div className="text-xl font-bold text-ink tabular-nums">
                  {profile.benchmarks.reviewSaturationAverage.toLocaleString()}
                </div>
                <div className="text-[10px] text-ink-tertiary">Incumbent density</div>
              </Card>

              <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase">Saturation</span>
                  <DataProvenanceBadge type="SELLERSALT_SCORE" />
                </div>
                <div className="text-base font-bold text-ink pt-0.5">
                  {profile.benchmarks.nicheSaturationIndex}
                </div>
                <div className="text-[10px] text-ink-tertiary">Competition barrier</div>
              </Card>

              <Card variant="feature" padding="sm" className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-ink-tertiary uppercase">Opp. Score</span>
                  <DataProvenanceBadge type="SELLERSALT_SCORE" />
                </div>
                <div className="text-2xl font-bold text-[#0E8F5D] tabular-nums">
                  {profile.benchmarks.opportunityScore}/100
                </div>
                <div className="text-[10px] text-ink-tertiary">Composite rubric</div>
              </Card>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* 4. MARKET VISUALIZATIONS (PRICING CORRIDOR, SEASONALITY & TAG PENETRATION) */}
          {/* ==================================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Price Corridor Distribution */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-ink uppercase tracking-wide">
                    Market Pricing Corridor
                  </span>
                  <p className="text-[11px] text-ink-tertiary">10th percentile, median, and 90th percentile entry brackets.</p>
                </div>
                <DataProvenanceBadge type="ESTIMATED" />
              </div>
              <HorizontalBarChart
                data={[
                  { label: "10th %ile (Budget)", value: Number(profile.benchmarks.price10thPercentile.toFixed(2)), color: "#3B82F6" },
                  { label: "Median (Sweet Spot)", value: Number(profile.benchmarks.medianPrice.toFixed(2)), color: "#0E8F5D" },
                  { label: "90th %ile (Premium)", value: Number(profile.benchmarks.price90thPercentile.toFixed(2)), color: "#8B5CF6" },
                ]}
                yAxisWidth={130}
                valueFormatter={(v) => `$${Number(v).toFixed(2)}`}
                height={140}
                accessibleSummary={`Pricing corridor for ${profile.name} spanning $${profile.benchmarks.price10thPercentile.toFixed(2)} to $${profile.benchmarks.price90thPercentile.toFixed(2)}.`}
              />
            </Card>

            {/* 2. Seasonality Demand Pattern */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-ink uppercase tracking-wide">
                    Category Seasonality Curve
                  </span>
                  <p className="text-[11px] text-ink-tertiary">12-month demand trajectory index vs baseline.</p>
                </div>
                <DataProvenanceBadge type="ESTIMATED" />
              </div>
              <SeasonalityChart data={categorySeasonality} height={140} />
            </Card>
          </div>

          {/* ==================================================================== */}
          {/* 5. SUB-NICHES & CHILD TAXONOMY NODES */}
          {/* ==================================================================== */}
          {profile.children.length > 0 && (
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                  <FolderTree className="h-3.5 w-3.5 text-[#0E8F5D]" /> Sub-Niches &amp; Child Taxonomy Nodes ({profile.children.length})
                </span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {profile.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedTaxonomyId(child.id)}
                    className="p-3 rounded-xl border border-line bg-[#FAFAF8] hover:bg-white hover:border-[#0E8F5D] hover:shadow-2xs text-left transition flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-ink group-hover:text-[#0E8F5D] truncate">
                        {child.name}
                      </div>
                      <div className="text-[10px] text-ink-tertiary">
                        {child.childCount > 0 ? `${child.childCount} sub-branches` : "Leaf node"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-tertiary group-hover:text-[#0E8F5D] transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* ==================================================================== */}
          {/* 6. TOP PRODUCTS (WINNING LISTINGS IN CATEGORY) */}
          {/* ==================================================================== */}
          {profile.productSamples && profile.productSamples.length > 0 && (
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
                <div>
                  <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-[#0E8F5D]" /> Breakout Products in Category ({profile.productSamples.length})
                  </span>
                  <p className="text-[11px] text-ink-tertiary">High-velocity listings discovered within this category.</p>
                </div>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {profile.productSamples.map((product) => (
                  <div
                    key={product.id}
                    className="p-3 rounded-xl border border-line bg-[#FAFAF8] flex flex-col justify-between space-y-2 hover:border-[#0E8F5D]/30 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2.5">
                        <SafeImage
                          src={product.listing.imageUrl}
                          alt={product.listing.title}
                          fallbackType="product"
                          className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1.5">
                            <Link
                              href={`/products/${product.id}`}
                              className="font-bold text-xs text-ink hover:text-[#0E8F5D] transition-colors line-clamp-2"
                            >
                              {product.listing.title}
                            </Link>
                            <Badge variant="success" className="text-[10px] shrink-0">
                              🔥 {product.opportunity.opportunityScore}/100
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-ink-secondary mt-1">
                            <span className="font-bold text-ink tabular-nums">${product.listing.price.toFixed(2)}</span>
                            <span className="text-[#0E8F5D] font-bold tabular-nums">~{product.signals.estDailySales.toFixed(1)} / day</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-ink-tertiary flex items-center justify-between pt-1 border-t border-line-subtle">
                        <span>Shop: <Link href={`/shops/${product.shop.shopId}`} className="text-ink hover:underline">{product.shop.shopName}</Link></span>
                        <span>{product.shop.reviewCount} reviews</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2">
                      <Link href={`/products/${product.id}`} className="flex-1">
                        <Button variant="secondary" size="compact" className="w-full text-[11px] h-7">
                          Research Product
                        </Button>
                      </Link>

                      <Button
                        variant={savedPlannerListingIds[product.id] ? "secondary" : "primary"}
                        size="compact"
                        loading={savingPlannerListingId === product.id}
                        disabled={Boolean(savedPlannerListingIds[product.id])}
                        onClick={() => handleAddProductToPlanner(product)}
                        className="text-[11px] h-7 px-2.5 bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
                      >
                        {savedPlannerListingIds[product.id] ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ==================================================================== */}
          {/* 7. TOP SHOPS (MARKET LEADER STORES) */}
          {/* ==================================================================== */}
          {profile.productSamples && profile.productSamples.length > 0 && (
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
                <div>
                  <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-[#0E8F5D]" /> Leading Competitor Shops in Category
                  </span>
                  <p className="text-[11px] text-ink-tertiary">Stores generating market volume in this niche.</p>
                </div>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from(
                  new Map(
                    profile.productSamples.map((p) => [
                      p.shop.shopId,
                      {
                        shopExternalId: p.shop.shopId,
                        shopName: p.shop.shopName,
                        totalSales: p.shop.totalSales,
                        reviewCount: p.shop.reviewCount,
                        activeListings: p.shop.activeListings,
                      },
                    ])
                  ).values()
                ).map((shop) => (
                  <div
                    key={shop.shopExternalId}
                    className="p-3 rounded-xl border border-line bg-[#FAFAF8] space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/shops/${shop.shopExternalId}`}
                          className="font-bold text-xs text-ink hover:text-[#0E8F5D] transition-colors truncate"
                        >
                          {shop.shopName}
                        </Link>
                        <Badge variant="neutral" className="text-[10px]">
                          {shop.activeListings} listings
                        </Badge>
                      </div>

                      <div className="text-[11px] text-ink-secondary flex justify-between">
                        <span>Total Sales: <strong className="text-ink tabular-nums">{shop.totalSales.toLocaleString()}</strong></span>
                        <span>Reviews: <strong className="text-ink tabular-nums">{shop.reviewCount}</strong></span>
                      </div>
                    </div>

                    <Link href={`/shops/${shop.shopExternalId}`}>
                      <Button variant="secondary" size="compact" className="w-full text-[11px] h-7">
                        Inspect Shop Dossier →
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ==================================================================== */}
          {/* 8. KEYWORDS / TAGS (DOMINANT SEARCH TAGS) */}
          {/* ==================================================================== */}
          {profile.extractedKeywords.length > 0 && (
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#0E8F5D]" /> Extracted Search Tags in Category ({profile.extractedKeywords.length})
                </span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {profile.extractedKeywords.slice(0, 12).map((item) => (
                  <div
                    key={item.tag}
                    className="p-2.5 rounded-xl border border-line bg-[#FAFAF8] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-bold text-ink truncate">{item.tag}</div>
                      <div className="text-[10px] text-ink-tertiary">
                        {item.count}x observed ({item.percentage}% of category sample)
                      </div>
                    </div>

                    <Link
                      href={`/keyword-research?q=${encodeURIComponent(item.tag)}`}
                      className="text-[10px] font-bold text-[#0E8F5D] hover:underline px-2 py-1 rounded bg-[#E7FAF1] shrink-0"
                    >
                      Audit Tag
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ==================================================================== */}
          {/* 9. SUPPORTING DATA (PROPERTIES & METHODOLOGY) */}
          {/* ==================================================================== */}
          {profile.properties.length > 0 && (
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#0E8F5D]" /> Official Etsy Category Attributes &amp; Materials ({profile.properties.length})
                </span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {profile.properties.map((prop) => (
                  <div key={prop.property_id} className="p-2.5 rounded-xl border border-line bg-[#FAFAF8] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">{prop.display_name}</span>
                      {prop.is_required && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-ink-tertiary">
                      {prop.possible_values.length > 0
                        ? `${prop.possible_values.length} allowed options`
                        : prop.supports_custom_values
                        ? "Custom values allowed"
                        : "Standard attribute"}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
