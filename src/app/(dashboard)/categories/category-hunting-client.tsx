"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Card, Heading, Text, Button, Badge } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { BarChart } from "@/components/data/charts";
import { TaxonomyTreeBrowser } from "@/components/intelligence/TaxonomyTreeBrowser";
import {
  fetchCategoryRoots,
  searchCategoryTaxonomy,
  fetchCategoryDetail,
  addCategoryToPlanner,
} from "@/services/category-hunting-client";
import { addProductToPlanner } from "@/services/product-hunting-client";
import type { EtsyRawTaxonomyNode, FlattenedTaxonomyNode } from "@/connectors/etsy/taxonomy";
import type { CategoryIntelligenceProfile } from "@/types/category-hunting";
import type { ProductHuntingResult } from "@/types/product-hunting";

interface CategoryHuntingClientProps {
  initialRoots: EtsyRawTaxonomyNode[];
  initialTaxonomyId?: number;
}

export function CategoryHuntingClient({
  initialRoots,
  initialTaxonomyId,
}: CategoryHuntingClientProps) {
  const [roots] = useState<EtsyRawTaxonomyNode[]>(initialRoots);
  const [selectedTaxonomyId, setSelectedTaxonomyId] = useState<number | null>(
    initialTaxonomyId || (initialRoots[0]?.id ?? null)
  );
  const [searchQuery, setSearchQuery] = useState("");
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
        console.error("Search failed:", err);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#0E8F5D] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
              <FolderTree className="h-4 w-4" />
            </div>
            <Heading as="h1" size="h2">
              Category Hunting & Taxonomy Exploration
            </Heading>
          </div>
          <Text size="body-sm" color="secondary" className="mt-1">
            Navigate Etsy&apos;s official buyer taxonomy hierarchy to uncover high-velocity, low-saturation niches.
          </Text>
        </div>

        {profile && (
          <div className="flex items-center gap-2">
            <Link
              href={`/prospects?taxonomyId=${profile.taxonomyId}&categoryName=${encodeURIComponent(profile.name)}`}
              className="px-3.5 py-2 rounded-lg border border-line bg-white hover:bg-[#FAFAF8] text-ink text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Compass className="h-4 w-4 text-[#0E8F5D]" />
              <span>Hunt Products in Category</span>
            </Link>

            <Button
              variant={savedPlannerCategory ? "secondary" : "primary"}
              size="default"
              loading={savingPlannerCategory}
              disabled={savedPlannerCategory}
              onClick={handleAddCategoryToPlanner}
              className="text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
            >
              {savedPlannerCategory ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" /> Added to Planner
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-1.5" /> Add Category to Planner
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid: Sidebar Tree + Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Taxonomy Tree Browser */}
        <Card padding="md" className="lg:col-span-4 border-line bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
            <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#0E8F5D]" /> Buyer Taxonomy Tree
            </span>
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>

          <TaxonomyTreeBrowser
            roots={roots}
            selectedTaxonomyId={selectedTaxonomyId}
            onSelectCategory={(id) => setSelectedTaxonomyId(id)}
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            searchResults={searchResults}
            isLoading={isSearching}
          />
        </Card>

        {/* Right Content: Category Intelligence Profile */}
        <div className="lg:col-span-8 space-y-6">
          {isLoadingProfile ? (
            <Card padding="lg" className="border-line bg-white shadow-xs text-center py-16">
              <div className="animate-spin h-8 w-8 border-3 border-[#0E8F5D] border-t-transparent rounded-full mx-auto" />
              <Text size="body-sm" color="secondary" className="mt-3">
                Ingesting Etsy category taxonomy & calculating market benchmarks...
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
              {/* Breadcrumb Trail & Category Identity */}
              <Card padding="md" className="border-line bg-[#FAFAF8] shadow-2xs space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-tertiary">
                  {profile.breadcrumb.map((crumb, idx) => (
                    <div key={crumb.id} className="flex items-center gap-1.5">
                      {idx > 0 && <ChevronRight className="h-3 w-3 text-ink-tertiary" />}
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

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <Heading as="h2" size="h3">
                        {profile.name}
                      </Heading>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E7FAF1] text-[#0E8F5D] border border-[#16C784]/30">
                        Level {profile.level} {profile.childCount === 0 ? "· Leaf Node" : ""}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-tertiary mt-0.5">
                      Canonical Etsy Taxonomy ID: <strong className="font-mono text-ink">{profile.taxonomyId}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                          <Check className="h-3.5 w-3.5 mr-1" /> Category Saved
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-3.5 w-3.5 mr-1" /> Save to Planner
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* LEVEL 1: MARKET OPPORTUNITY & ENTRY VERDICT (PRIMARY DECISION SURFACE) */}
              <Card variant="feature" padding="lg" className="space-y-5 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">
                    Market Entry Intelligence
                  </span>
                  <DataProvenanceBadge type="SELLERSALT_SCORE" />
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-5 rounded-2xl bg-[#FAFAF8] border border-line">
                  {/* Left: Verdict Banner & Natural Language Evaluation */}
                  <div className="space-y-2 min-w-0 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-ink-tertiary">
                        Market Opportunity:
                      </span>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border ${profile.benchmarks.verdictColor}`}>
                        {profile.benchmarks.verdictBadge}
                      </div>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
                      Is {profile.name} worth entering?
                    </h2>

                    <p className="text-sm text-ink-secondary leading-relaxed pt-1">
                      {profile.benchmarks.opportunityScore >= 70
                        ? `This category shows favorable market dynamics with an opportunity score of ${profile.benchmarks.opportunityScore}/100 and healthy daily velocity (~${profile.benchmarks.avgDailySalesProxy.toFixed(1)} sales/day per store).`
                        : profile.benchmarks.opportunityScore >= 45
                        ? `This category has moderate incumbent competition (${profile.benchmarks.nicheSaturationIndex}). Entry requires a differentiated product angle and targeted long-tail SEO.`
                        : `This category has heavy saturation and high incumbent review barriers (${profile.benchmarks.reviewSaturationAverage.toLocaleString()} avg reviews). Niche down into specific sub-branches before entering.`}
                    </p>
                  </div>

                  {/* Right: Score Callout & Saturation Index */}
                  <div className="shrink-0 flex flex-col items-center sm:items-end justify-center p-4 rounded-xl bg-white border border-line shadow-2xs space-y-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-ink font-mono tracking-tight">
                        {profile.benchmarks.opportunityScore}
                      </span>
                      <span className="text-sm font-bold text-ink-tertiary font-mono">/ 100</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">
                      Category Opportunity Score
                    </span>
                    <Badge
                      variant={
                        profile.benchmarks.opportunityScore >= 70
                          ? "success"
                          : profile.benchmarks.opportunityScore >= 45
                          ? "warning"
                          : "neutral"
                      }
                      className="text-[10px]"
                    >
                      {profile.benchmarks.nicheSaturationIndex} Saturation
                    </Badge>
                  </div>
                </div>

                {/* Strategic Advice Playbook (Level 1 Guidance) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#FFB020]" /> What to Study:
                    </div>
                    <p className="text-ink-secondary leading-relaxed">{profile.strategicAdvice.whatToStudy}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> What to Avoid:
                    </div>
                    <p className="text-ink-secondary leading-relaxed">{profile.strategicAdvice.whatToAvoid}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                    <div className="font-bold text-ink flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-[#0E8F5D]" /> Recommended Action:
                    </div>
                    <p className="text-ink-secondary leading-relaxed">{profile.strategicAdvice.whatToDoNext}</p>
                  </div>
                </div>
              </Card>

              {/* LEVEL 2: 8-BENCHMARK KPI GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-tertiary uppercase">Sampled Supply</span>
                    <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
                  </div>
                  <div className="text-xl font-extrabold text-ink font-mono">
                    {profile.benchmarks.observedListingsCount} listings
                  </div>
                  <div className="text-[10px] text-ink-tertiary">Top ranking sample</div>
                </Card>

                <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-tertiary uppercase">Median Price</span>
                    <DataProvenanceBadge type="ESTIMATED" />
                  </div>
                  <div className="text-xl font-extrabold text-ink font-mono">
                    ${profile.benchmarks.medianPrice.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-ink-tertiary">50th percentile</div>
                </Card>

                <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-tertiary uppercase">10th-90th Spread</span>
                    <DataProvenanceBadge type="ESTIMATED" />
                  </div>
                  <div className="text-sm font-extrabold text-ink font-mono pt-1 truncate">
                    ${profile.benchmarks.price10thPercentile.toFixed(2)} - ${profile.benchmarks.price90thPercentile.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-ink-tertiary">${profile.benchmarks.priceDistribution.priceSpread.toFixed(2)} spread</div>
                </Card>

                <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-tertiary uppercase">Daily Velocity</span>
                    <DataProvenanceBadge type="ESTIMATED" />
                  </div>
                  <div className="text-xl font-extrabold text-[#0E8F5D] font-mono">
                    {profile.benchmarks.avgDailySalesProxy.toFixed(1)}/day
                  </div>
                  <div className="text-[10px] text-ink-tertiary">Avg across stores</div>
                </Card>

                <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-tertiary uppercase">Catalog Yield</span>
                    <DataProvenanceBadge type="ESTIMATED" />
                  </div>
                  <div className="text-xl font-extrabold text-ink font-mono">
                    {profile.benchmarks.catalogYieldProxy.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-ink-tertiary">Sales / active listing</div>
                </Card>

                <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-tertiary uppercase">Avg Reviews</span>
                    <DataProvenanceBadge type="ESTIMATED" />
                  </div>
                  <div className="text-xl font-extrabold text-ink font-mono">
                    {profile.benchmarks.reviewSaturationAverage.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-ink-tertiary">Incumbent density</div>
                </Card>

                <Card padding="sm" className="border-line bg-white shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-tertiary uppercase">Saturation</span>
                    <DataProvenanceBadge type="SELLERSALT_SCORE" />
                  </div>
                  <div className="text-base font-extrabold text-ink pt-0.5">
                    {profile.benchmarks.nicheSaturationIndex}
                  </div>
                  <div className="text-[10px] text-ink-tertiary">Competition barrier</div>
                </Card>

                <Card variant="feature" padding="sm" className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-tertiary uppercase">Opp. Score</span>
                    <DataProvenanceBadge type="SELLERSALT_SCORE" />
                  </div>
                  <div className="text-2xl font-extrabold text-[#0E8F5D] font-mono">
                    {profile.benchmarks.opportunityScore}/100
                  </div>
                  <div className="text-[10px] text-ink-tertiary">Composite rubric</div>
                </Card>
              </div>

              {/* Category Pricing & SEO Intelligence Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <BarChart
                    data={[
                      { tier: "10th %ile (Budget)", price: Number(profile.benchmarks.price10thPercentile.toFixed(2)) },
                      { tier: "Median (Sweet Spot)", price: Number(profile.benchmarks.medianPrice.toFixed(2)) },
                      { tier: "90th %ile (Premium)", price: Number(profile.benchmarks.price90thPercentile.toFixed(2)) },
                    ]}
                    xKey="tier"
                    layout="vertical"
                    yAxisWidth={130}
                    series={[{ key: "price", label: "Price ($)", colorIndex: 0 }]}
                    valueFormatter={(v) => `$${Number(v).toFixed(2)}`}
                    height={140}
                    accessibleSummary={`Pricing corridor for ${profile.name} spanning $${profile.benchmarks.price10thPercentile.toFixed(2)} to $${profile.benchmarks.price90thPercentile.toFixed(2)}.`}
                  />
                </Card>

                {/* 2. Top Extracted Tags in Category */}
                <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-ink uppercase tracking-wide">
                        Dominant Search Tags
                      </span>
                      <p className="text-[11px] text-ink-tertiary">Marketplace penetration across sampled category listings.</p>
                    </div>
                    <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
                  </div>
                  {profile.extractedKeywords.length > 0 ? (
                    <BarChart
                      data={profile.extractedKeywords.slice(0, 4).map((k) => ({
                        tag: k.tag,
                        percentage: k.percentage,
                      }))}
                      xKey="tag"
                      layout="vertical"
                      yAxisWidth={130}
                      series={[{ key: "percentage", label: "% of sample", colorIndex: 2 }]}
                      valueFormatter={(v) => `${v}%`}
                      height={140}
                      accessibleSummary={`Top extracted keywords by penetration in ${profile.name}.`}
                    />
                  ) : (
                    <div className="h-32 flex items-center justify-center text-xs text-ink-tertiary">
                      No extracted tags available for this category sample.
                    </div>
                  )}
                </Card>
              </div>

              {/* Sub-Categories & Child Leaf Nodes Grid */}
              {profile.children.length > 0 && (
                <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                      <FolderTree className="h-3.5 w-3.5 text-[#0E8F5D]" /> Sub-Niches & Child Branches ({profile.children.length})
                    </span>
                    <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {profile.children.map((child) => (
                      <div
                        key={child.id}
                        onClick={() => setSelectedTaxonomyId(child.id)}
                        className="p-2.5 rounded-xl border border-line bg-[#FAFAF8] hover:border-line-subtle hover:bg-white cursor-pointer transition-all flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-ink truncate">{child.name}</div>
                          <div className="text-[10px] text-ink-tertiary">
                            {child.childCount > 0 ? `${child.childCount} sub-branches` : "Leaf node"}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-ink-tertiary shrink-0" />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Etsy Category Properties (Attributes / Scales / Materials) */}
              {profile.properties.length > 0 && (
                <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-[#0E8F5D]" /> Etsy Taxonomy Properties ({profile.properties.length})
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

              {/* Discovered Keywords & Long-Tail Tag Frequency Table */}
              {profile.extractedKeywords.length > 0 && (
                <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-[#0E8F5D]" /> Discovered Search Tags in Category ({profile.extractedKeywords.length})
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
                            {item.count}x observed ({item.percentage}% of sample)
                          </div>
                        </div>
                        <Link
                          href={`/prospects?search=${encodeURIComponent(item.tag)}`}
                          className="p-1 rounded text-ink-tertiary hover:text-ink hover:bg-white transition-colors"
                          title="Search marketplace for this tag"
                        >
                          <Compass className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Top Product Samples in Category */}
              {profile.productSamples.length > 0 && (
                <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-[#FFB020]" /> Top Ranking Product Samples ({profile.productSamples.length})
                    </span>
                    <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
                  </div>

                  <div className="divide-y divide-line-subtle border-t border-line-subtle">
                    {profile.productSamples.slice(0, 6).map((sample) => {
                      const isSaved = Boolean(savedPlannerListingIds[sample.id]);
                      return (
                        <div
                          key={sample.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {sample.listing.imageUrl ? (
                              <img
                                src={sample.listing.imageUrl}
                                alt=""
                                className="h-12 w-12 rounded-lg border border-line object-cover shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-[#F4F3EF] border border-line flex items-center justify-center text-[10px] font-bold text-ink-tertiary shrink-0">
                                ETSY
                              </div>
                            )}

                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="font-bold text-xs text-ink truncate">{sample.listing.title}</div>
                              <div className="text-[11px] text-ink-tertiary flex items-center gap-2">
                                <span>Shop: <strong className="text-ink">{sample.shop.shopName}</strong></span>
                                <span>·</span>
                                <span>Price: <strong className="text-ink font-mono">${sample.listing.price.toFixed(2)}</strong></span>
                                <span>·</span>
                                <span className="text-[#0E8F5D] font-semibold">Opp: {sample.opportunity.opportunityScore}/100</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={sample.listing.listingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-line bg-white hover:bg-[#FAFAF8] text-ink-secondary hover:text-ink text-xs font-medium inline-flex items-center gap-1 shadow-2xs"
                            >
                              <span>Etsy</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>

                            <Button
                              variant={isSaved ? "secondary" : "primary"}
                              size="compact"
                              loading={savingPlannerListingId === sample.id}
                              disabled={isSaved}
                              onClick={() => handleAddProductToPlanner(sample)}
                              className="text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
                            >
                              {isSaved ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" /> Added
                                </>
                              ) : (
                                <>
                                  <Bookmark className="h-3 w-3 mr-1" /> Add to Planner
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card padding="lg" className="border-line bg-white shadow-xs text-center py-16 space-y-2">
              <FolderTree className="h-8 w-8 text-ink-tertiary mx-auto" />
              <div className="font-bold text-sm text-ink">Select a Category from the Taxonomy Tree</div>
              <Text size="body-sm" color="secondary">
                Click any category branch or search keywords on the left to inspect market benchmarks.
              </Text>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
