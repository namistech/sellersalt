"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  ExternalLink,
  Store,
  Flame,
  Zap,
  Target,
  TrendingUp,
  Clock,
  Sparkles,
  Bookmark,
  Check,
  Tag,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import type { ProductHuntingResult } from "@/types/product-hunting";
import { Button, Badge, Card, Heading, Text, Tooltip } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { addProductToPlanner } from "@/services/product-hunting-client";

export interface ProductResearchDrawerProps {
  product: ProductHuntingResult | null;
  open: boolean;
  onClose: () => void;
  onPlannerAdded?: (product: ProductHuntingResult, plannerItemId: string) => void;
}

export function ProductResearchDrawer({
  product,
  open,
  onClose,
  onPlannerAdded,
}: ProductResearchDrawerProps) {
  const [savingToPlanner, setSavingToPlanner] = useState(false);
  const [plannerSuccess, setPlannerSuccess] = useState<string | null>(null);

  if (!open || !product) return null;

  const { listing, shop, signals, opportunity } = product;

  async function handleAddToPlanner() {
    if (!product) return;
    setSavingToPlanner(true);
    setPlannerSuccess(null);
    try {
      const res = await addProductToPlanner(product);
      setPlannerSuccess(res.isExisting ? "Already in Planner" : "Added to Planner!");
      if (onPlannerAdded && res.item?.id) {
        onPlannerAdded(product, res.item.id);
      }
      setTimeout(() => setPlannerSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to add to Planner");
    } finally {
      setSavingToPlanner(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/40 backdrop-blur-xs flex justify-end transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col overflow-hidden border-l border-line transform transition-transform animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-[#FAFAF8] shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0E8F5D]/10 text-[#0E8F5D]">
              <Flame className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">
                Product Intelligence & Radar
              </div>
              <div className="text-sm font-bold text-ink truncate max-w-md" id="drawer-title">
                {listing.title}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-muted transition-colors"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Product Overview Hero */}
          <div className="flex flex-col sm:flex-row gap-5 p-4 rounded-xl bg-[#FAFAF8] border border-line">
            <div className="shrink-0">
              {listing.imageUrl ? (
                <img
                  src={listing.imageUrl}
                  alt={listing.title}
                  className="h-32 w-32 rounded-lg object-cover border border-line shadow-xs"
                />
              ) : (
                <div className="h-32 w-32 rounded-lg bg-surface-muted border border-line flex items-center justify-center text-xs font-bold text-ink-tertiary">
                  NO IMAGE
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xl font-bold text-ink">
                  ${listing.price.toFixed(2)}
                </span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
                {listing.taxonomyPath && (
                  <Badge variant="neutral" className="text-xs">
                    {listing.taxonomyPath}
                  </Badge>
                )}
              </div>

              <div className="text-xs text-ink-secondary leading-relaxed line-clamp-3">
                {listing.description || "No description available for this listing."}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-ink-tertiary">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Age: <strong className="text-ink">{listing.listingAgeDays} days</strong>
                </span>
                <span>·</span>
                <span>
                  Shop: <strong className="text-ink">{shop.shopName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Opportunity Radar Score Breakdown */}
          <Card padding="md" className="border-line shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line-subtle pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0E8F5D]" />
                <Heading as="h3" size="h4">
                  Opportunity Radar Breakdown
                </Heading>
              </div>
              <DataProvenanceBadge type="SELLERSALT_SCORE" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center p-3 rounded-lg bg-[#FAFAF8] border border-line-subtle">
              <div className="text-center sm:text-left sm:border-r border-line-subtle sm:pr-4">
                <div className="text-[11px] font-bold text-ink-tertiary uppercase">Radar Score</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-mono text-3xl font-extrabold text-[#0E8F5D]">
                    {opportunity.opportunityScore}
                  </span>
                  <span className="text-xs text-ink-tertiary">/100</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm font-bold text-ink">
                    {opportunity.classificationEmoji} {opportunity.classificationLabel}
                  </span>
                </div>
                <div className="text-xs text-ink-secondary leading-snug">
                  {opportunity.reason}
                </div>
              </div>
            </div>

            {/* 5 Factor Radar Meter Bars */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-ink uppercase tracking-wider">
                5-Factor Mathematical Rubric
              </div>

              {/* 1. Market Velocity */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-[#0E8F5D]" /> Market Velocity (30%)
                  </span>
                  <span className="font-mono font-semibold text-ink">
                    {opportunity.signals.velocity.metricValue} ({opportunity.signals.velocity.score}/100)
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0E8F5D] rounded-full transition-all duration-500"
                    style={{ width: `${opportunity.signals.velocity.score}%` }}
                  />
                </div>
              </div>

              {/* 2. Catalog Density */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-amber-600" /> Catalog Density / Yield (25%)
                  </span>
                  <span className="font-mono font-semibold text-ink">
                    {opportunity.signals.density.metricValue} ({opportunity.signals.density.score}/100)
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${opportunity.signals.density.score}%` }}
                  />
                </div>
              </div>

              {/* 3. Competition Barrier */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-600" /> Competition Barrier (20%)
                  </span>
                  <span className="font-mono font-semibold text-ink">
                    {opportunity.signals.competition.label} ({opportunity.signals.competition.score}/100)
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${opportunity.signals.competition.score}%` }}
                  />
                </div>
              </div>

              {/* 4. Buyer Engagement */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Buyer Engagement (15%)
                  </span>
                  <span className="font-mono font-semibold text-ink">
                    {opportunity.signals.momentum.metricValue} ({opportunity.signals.momentum.score}/100)
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${opportunity.signals.momentum.score}%` }}
                  />
                </div>
              </div>

              {/* 5. Freshness */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-ink-tertiary" /> Launch Freshness (10%)
                  </span>
                  <span className="font-mono font-semibold text-ink">
                    {opportunity.signals.freshness.metricValue} ({opportunity.signals.freshness.score}/100)
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink-tertiary rounded-full transition-all duration-500"
                    style={{ width: `${opportunity.signals.freshness.score}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Parent Shop Profile */}
          <Card padding="md" className="border-line shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-ink" />
                <Heading as="h3" size="h4">
                  Shop Benchmark Profile
                </Heading>
              </div>
              <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div className="bg-[#FAFAF8] p-2 rounded-lg border border-line-subtle">
                <div className="text-[10px] text-ink-tertiary">Lifetime Sales</div>
                <div className="font-bold font-mono text-sm text-ink mt-0.5">
                  {shop.totalSales.toLocaleString()}
                </div>
              </div>
              <div className="bg-[#FAFAF8] p-2 rounded-lg border border-line-subtle">
                <div className="text-[10px] text-ink-tertiary">Active Listings</div>
                <div className="font-bold font-mono text-sm text-ink mt-0.5">
                  {shop.activeListings}
                </div>
              </div>
              <div className="bg-[#FAFAF8] p-2 rounded-lg border border-line-subtle">
                <div className="text-[10px] text-ink-tertiary">Reviews / Rating</div>
                <div className="font-bold font-mono text-sm text-ink mt-0.5">
                  {shop.reviewCount} ★ {shop.reviewAverage ? shop.reviewAverage.toFixed(1) : "—"}
                </div>
              </div>
              <div className="bg-[#FAFAF8] p-2 rounded-lg border border-line-subtle">
                <div className="text-[10px] text-ink-tertiary">Shop Age</div>
                <div className="font-bold font-mono text-sm text-ink mt-0.5">
                  {Math.round(shop.shopAgeMonths)} mos
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Link href={`/shops/${shop.shopId}`} target="_blank">
                <Button variant="secondary" size="compact" className="text-xs">
                  Inspect Shop Intelligence →
                </Button>
              </Link>
            </div>
          </Card>

          {/* Section 4: Tags & Keywords */}
          {listing.tags.length > 0 && (
            <Card padding="md" className="border-line shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-ink" />
                  <Heading as="h3" size="h4">
                    Extracted Tags ({listing.tags.length})
                  </Heading>
                </div>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {listing.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 rounded bg-[#F4F3EF] text-ink text-xs font-medium border border-line-subtle"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Section 5: Strategic Takeaway */}
          <Card padding="md" className="border-line shadow-xs bg-[#F9FBF9] space-y-2 border-l-4 border-l-[#0E8F5D]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E8F5D] uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" /> Strategic Takeaway
            </div>
            <div className="text-xs text-ink leading-relaxed">
              {opportunity.strategicTakeaway}
            </div>
          </Card>
        </div>

        {/* Drawer Action Footer */}
        <div className="px-6 py-4 border-t border-line bg-[#FAFAF8] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={listing.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ink-secondary hover:text-[#0E8F5D] flex items-center gap-1 font-medium"
            >
              View on Etsy <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <span className="text-line">|</span>
            <Link
              href={`/keyword-research?q=${encodeURIComponent(listing.title)}`}
              className="text-xs text-ink-secondary hover:text-[#0E8F5D] font-medium"
            >
              Mine Keywords →
            </Link>
            <span className="text-line">|</span>
            <Link
              href={`/spy?shop=${encodeURIComponent(shop.shopName || shop.shopId)}`}
              className="text-xs text-ink-secondary hover:text-[#0E8F5D] font-medium"
            >
              Spy on Shop →
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={product.isSavedToPlanner || plannerSuccess ? "secondary" : "primary"}
              size="default"
              loading={savingToPlanner}
              disabled={!!product.isSavedToPlanner || !!plannerSuccess}
              onClick={handleAddToPlanner}
              className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold text-white gap-1.5"
            >
              {plannerSuccess ? (
                <>
                  <Check className="h-4 w-4" /> {plannerSuccess}
                </>
              ) : product.isSavedToPlanner ? (
                <>
                  <Check className="h-4 w-4" /> In Planner
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" /> Add to Planner
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
