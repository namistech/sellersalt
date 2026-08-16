"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  Flame,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Store,
  Clock,
  Bookmark,
  Check,
  Scale,
  X,
  AlertCircle,
  Zap,
} from "lucide-react";
import type {
  ProductHuntingResult,
  ProductHuntingSearchResponse,
  ProductComparisonSummary,
} from "@/types/product-hunting";
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  Heading,
  Text,
  Eyebrow,
  Alert,
} from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import {
  searchMarketplaceProducts,
  compareMarketplaceProducts,
  addProductToPlanner,
} from "@/services/product-hunting-client";
import { ProductResearchDrawer } from "@/components/intelligence/ProductResearchDrawer";
import { ProductComparisonModal } from "@/components/intelligence/ProductComparisonModal";

export function LiveSearchTab() {
  const [keyword, setKeyword] = useState("digital planner");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortOn, setSortOn] = useState<"score" | "created" | "price">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResponse, setSearchResponse] = useState<ProductHuntingSearchResponse | null>(null);

  // Selection & Modal States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeDrawerProduct, setActiveDrawerProduct] = useState<ProductHuntingResult | null>(null);
  const [comparisonSummary, setComparisonSummary] = useState<ProductComparisonSummary | null>(null);
  const [comparing, setComparing] = useState(false);

  // Planner local state
  const [savedPlannerMap, setSavedPlannerMap] = useState<Record<string, boolean>>({});
  const [savingPlannerId, setSavingPlannerId] = useState<string | null>(null);

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    setSelectedIds(new Set());

    try {
      const res = await searchMarketplaceProducts({
        keywords: keyword.trim(),
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sortOn,
        sortOrder,
        limit: 25,
      });
      setSearchResponse(res);
    } catch (err: any) {
      setError(err.message || "Failed to search Etsy marketplace. Please check your connector credentials.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelectProduct(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 4) {
          alert("You can compare up to 4 products simultaneously.");
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  }

  async function handleOpenComparison() {
    if (!searchResponse || selectedIds.size < 2) return;
    const selectedItems = searchResponse.results.filter((r) => selectedIds.has(r.id));
    setComparing(true);
    try {
      const summary = await compareMarketplaceProducts(selectedItems);
      setComparisonSummary(summary);
    } catch (err: any) {
      alert(err.message || "Failed to compare products");
    } finally {
      setComparing(false);
    }
  }

  async function handleQuickAddToPlanner(product: ProductHuntingResult) {
    setSavingPlannerId(product.id);
    try {
      await addProductToPlanner(product);
      setSavedPlannerMap((prev) => ({ ...prev, [product.id]: true }));
    } catch (err: any) {
      alert(err.message || "Failed to add to Planner");
    } finally {
      setSavingPlannerId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Header & Filter Controls */}
      <Card padding="md" className="border-line bg-white shadow-xs space-y-4">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-tertiary" />
              <Input
                placeholder="Search Etsy products or niches (e.g. digital planner, leather wallet, svg bundle)..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold px-5 text-white shrink-0"
            >
              Search Marketplace
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-line-subtle text-xs">
            <div>
              <label className="block text-[11px] font-medium text-ink-tertiary mb-1">Min Price ($)</label>
              <Input
                type="number"
                placeholder="Min $"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-tertiary mb-1">Max Price ($)</label>
              <Input
                type="number"
                placeholder="Max $"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-tertiary mb-1">Sort Metric</label>
              <Select
                value={sortOn}
                onChange={(e) => setSortOn(e.target.value as any)}
                options={[
                  { value: "score", label: "Opportunity Radar Score" },
                  { value: "created", label: "Listing Creation Date" },
                  { value: "price", label: "Product Price" },
                ]}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-tertiary mb-1">Order</label>
              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                options={[
                  { value: "desc", label: "Descending (High to Low)" },
                  { value: "asc", label: "Ascending (Low to High)" },
                ]}
              />
            </div>
          </div>
        </form>

        {/* Quick Keyword Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-ink-tertiary text-[11px] font-medium">Quick ideas:</span>
          {["digital planner", "crochet pattern", "leather keychain", "minimalist jewelry", "svg bundle"].map(
            (q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setKeyword(q);
                }}
                className="px-2 py-0.5 rounded bg-[#F4F3EF] hover:bg-[#E7FAF1] hover:text-[#0E8F5D] text-ink text-[11px] transition-colors border border-line-subtle"
              >
                {q}
              </button>
            )
          )}
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" title="Etsy Search Failed">
          {error}
        </Alert>
      )}

      {/* Results Header & Level 1 Decision Banner */}
      {searchResponse && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heading as="h2" size="h4">
                Marketplace Results ({searchResponse.results.length})
              </Heading>
              <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              <span className="text-xs text-ink-tertiary">
                in {searchResponse.executionDurationMs}ms (8 req/s queue & Redis cache)
              </span>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-secondary">
                  {selectedIds.size} product{selectedIds.size > 1 ? "s" : ""} selected
                </span>
                <Button
                  variant="primary"
                  size="compact"
                  loading={comparing}
                  disabled={selectedIds.size < 2}
                  onClick={handleOpenComparison}
                  className="bg-[#0E8F5D] text-xs font-semibold"
                >
                  <Scale className="h-3.5 w-3.5 mr-1" /> Compare Selected
                </Button>
              </div>
            )}
          </div>

          {/* LEVEL 1: TOP BREAKOUT OPPORTUNITY (PRIMARY DECISION SURFACE) */}
          {(() => {
            if (searchResponse.results.length === 0) return null;
            const topItem = [...searchResponse.results].sort(
              (a, b) => b.opportunity.opportunityScore - a.opportunity.opportunityScore
            )[0];
            if (!topItem) return null;

            const isSaved = savedPlannerMap[topItem.id] || topItem.isSavedToPlanner;

            return (
              <Card variant="feature" padding="lg" className="space-y-4 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#FFB020]" /> Top Ranked Opportunity in Sample
                  </span>
                  <DataProvenanceBadge type="SELLERSALT_SCORE" />
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-4 rounded-2xl bg-[#FAFAF8] border border-line">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {topItem.listing.imageUrl ? (
                      <img
                        src={topItem.listing.imageUrl}
                        alt=""
                        className="h-20 w-20 rounded-xl object-cover border border-line shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-surface-muted border border-line flex items-center justify-center text-xs font-bold text-ink-tertiary shrink-0">
                        ETSY
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7FAF1] text-[#0E8F5D] border border-[#16C784]/30">
                          #{1} Opportunity
                        </span>
                        <span className="text-xs text-ink-tertiary">
                          Shop: <strong className="text-ink">{topItem.shop.shopName}</strong>
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-ink truncate max-w-xl">
                        {topItem.listing.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
                        <span>Price: <strong className="font-mono text-ink">${topItem.listing.price.toFixed(2)}</strong></span>
                        <span>·</span>
                        <span>Velocity: <strong className="text-[#0E8F5D] font-mono">~{topItem.signals.estDailySales.toFixed(1)} sales/day</strong></span>
                        <span>·</span>
                        <span>Moat: <strong className="text-ink">{topItem.shop.reviewCount.toLocaleString()} reviews</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-[#0E8F5D] font-mono leading-none">
                        {topItem.opportunity.opportunityScore}
                        <span className="text-xs text-ink-tertiary font-sans font-normal">/100</span>
                      </div>
                      <span className="text-[10px] font-semibold text-ink-tertiary">Opportunity Score</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => setActiveDrawerProduct(topItem)}
                        className="text-xs font-medium"
                      >
                        Inspect Radar
                      </Button>

                      <Button
                        variant={isSaved ? "secondary" : "primary"}
                        size="compact"
                        loading={savingPlannerId === topItem.id}
                        disabled={isSaved}
                        onClick={() => handleQuickAddToPlanner(topItem)}
                        className="text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
                      >
                        {isSaved ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" /> Added
                          </>
                        ) : (
                          <>
                            <Bookmark className="h-3.5 w-3.5 mr-1" /> Add to Planner
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Results Grid / Table */}
      {loading ? (
        <Card padding="lg" className="border-line text-center py-16 bg-white space-y-3">
          <div className="animate-spin h-8 w-8 border-3 border-[#0E8F5D] border-t-transparent rounded-full mx-auto" />
          <div className="font-semibold text-sm text-ink">Searching Etsy Marketplace...</div>
          <Text size="body-sm" color="secondary">
            Ingesting live active listings, enriching shop intelligence, and scoring Opportunity Radar factors.
          </Text>
        </Card>
      ) : !searchResponse ? (
        <Card padding="lg" className="border-line text-center py-16 bg-white space-y-3">
          <Search className="h-10 w-10 text-ink-tertiary mx-auto" />
          <Heading as="h3" size="h4">
            Live Etsy Product Hunting
          </Heading>
          <p className="text-xs text-ink-secondary max-w-md mx-auto">
            Search active Etsy listings with official query filters. Every result is enriched with shop lifetime sales, review counts, velocity proxies, and 5-factor Opportunity Radar scores.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              onClick={() => handleSearch()}
              className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold text-white"
            >
              Search "digital planner" →
            </Button>
          </div>
        </Card>
      ) : searchResponse.results.length === 0 ? (
        <Card padding="lg" className="border-line text-center py-12 bg-white">
          <AlertCircle className="h-8 w-8 text-ink-tertiary mx-auto mb-2" />
          <div className="text-sm font-semibold text-ink">No marketplace products found</div>
          <p className="text-xs text-ink-secondary mt-1">
            Try adjusting your keyword query or expanding the price range filters.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(() => {
            // Visual-only: the single highest-scoring result gets the
            // "feature" treatment regardless of current sort/display
            // order, so the top finding stays visually distinct even
            // when sorted by price or recency.
            const topItemId = searchResponse.results.reduce<string | null>((bestId, r) => {
              if (!bestId) return r.id;
              const best = searchResponse.results.find((x) => x.id === bestId);
              return best && r.opportunity.opportunityScore > best.opportunity.opportunityScore ? r.id : bestId;
            }, null);

            return searchResponse.results.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isSaved = savedPlannerMap[item.id] || item.isSavedToPlanner;
            const isTopFinding = item.id === topItemId;

            return (
              <Card
                key={item.id}
                variant={isTopFinding ? "feature" : "default"}
                padding="md"
                className={`shadow-xs flex flex-col justify-between transition-all bg-white hover:border-[#0E8F5D] ${
                  isSelected ? "ring-2 ring-[#0E8F5D] border-[#0E8F5D]" : ""
                }`}
              >
                <div className="space-y-3">
                  {/* Image & Radar Score Header */}
                  <div className="relative">
                    {item.listing.imageUrl ? (
                      <img
                        src={item.listing.imageUrl}
                        alt={item.listing.title}
                        className="h-44 w-full rounded-lg object-cover border border-line"
                      />
                    ) : (
                      <div className="h-44 w-full rounded-lg bg-surface-muted border border-line flex items-center justify-center text-xs font-bold text-ink-tertiary">
                        ETSY LISTING
                      </div>
                    )}

                    {/* Checkbox for Comparison */}
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs p-1 rounded-md shadow-xs border border-line flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectProduct(item.id)}
                        className="h-4 w-4 rounded text-[#0E8F5D] focus:ring-[#0E8F5D]"
                        aria-label={`Select ${item.listing.title} for comparison`}
                      />
                    </div>

                    {/* Radar Badge */}
                    <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs px-2 py-1 rounded-md shadow-xs border border-line flex items-center gap-1">
                      <span className="text-xs font-mono font-bold text-[#0E8F5D]">
                        {item.opportunity.opportunityScore}
                      </span>
                      <span className="text-[10px] text-ink-tertiary">/100</span>
                    </div>
                  </div>

                  {isTopFinding && (
                    <Eyebrow tone="accent" className="flex items-center gap-1">
                      <Flame className="h-3 w-3" aria-hidden /> Top Match
                    </Eyebrow>
                  )}

                  {/* Title & Price */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveDrawerProduct(item)}
                      className="font-bold text-xs text-ink hover:text-[#0E8F5D] text-left line-clamp-2 transition-colors"
                    >
                      {item.listing.title}
                    </button>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-base font-bold text-ink">
                        ${item.listing.price.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-ink-tertiary truncate">
                        {item.shop.shopName}
                      </span>
                    </div>
                  </div>

                  {/* Opportunity & Signals Summary */}
                  <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-[#FAFAF8] border border-line-subtle text-xs">
                    <div>
                      <div className="text-[10px] text-ink-tertiary">Est. Velocity</div>
                      <div className="font-bold font-mono text-[#0E8F5D]">
                        {item.signals.estDailySales.toFixed(1)} <span className="text-[10px] font-normal text-ink-tertiary">sales/day</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-ink-tertiary">Shop Reviews</div>
                      <div className="font-bold font-mono text-ink">
                        {item.shop.reviewCount} <span className="text-[10px] font-normal text-ink-tertiary">({item.shop.activeListings} listings)</span>
                      </div>
                    </div>
                  </div>

                  {/* Classification Pill */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="inline-flex items-center gap-1 font-semibold text-ink text-[11px]">
                      <span>{item.opportunity.classificationEmoji}</span>
                      <span>{item.opportunity.classificationLabel}</span>
                    </span>
                    <span className="text-[10px] text-ink-tertiary">
                      Age: {item.listing.listingAgeDays}d
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 mt-3 border-t border-line-subtle flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => setActiveDrawerProduct(item)}
                    className="text-xs h-7 px-2.5"
                  >
                    Inspect Radar →
                  </Button>

                  <Button
                    variant={isSaved ? "secondary" : "primary"}
                    size="compact"
                    loading={savingPlannerId === item.id}
                    disabled={isSaved}
                    onClick={() => handleQuickAddToPlanner(item)}
                    className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs h-7 px-2.5 text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
                  >
                    {isSaved ? (
                      <>
                        <Check className="h-3 w-3 mr-1" /> In Planner
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-3 w-3 mr-1" /> Add to Planner
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
            });
          })()}
        </div>
      )}

      {/* Floating Comparison Bar */}
      {selectedIds.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#141B16] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 border border-line-subtle animate-in slide-in-from-bottom duration-200">
          <div className="text-xs font-semibold">
            {selectedIds.size} products selected for comparison
          </div>
          <Button
            variant="primary"
            size="compact"
            loading={comparing}
            onClick={handleOpenComparison}
            className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold text-white"
          >
            <Scale className="h-3.5 w-3.5 mr-1" /> Compare Now
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-ink-tertiary hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {/* Research Drawer */}
      <ProductResearchDrawer
        product={activeDrawerProduct}
        open={!!activeDrawerProduct}
        onClose={() => setActiveDrawerProduct(null)}
        onPlannerAdded={(prod) => {
          setSavedPlannerMap((prev) => ({ ...prev, [prod.id]: true }));
        }}
      />

      {/* Comparison Modal */}
      {comparisonSummary && (
        <ProductComparisonModal
          products={comparisonSummary.items}
          comparison={comparisonSummary}
          open={!!comparisonSummary}
          onClose={() => setComparisonSummary(null)}
        />
      )}
    </div>
  );
}
