"use client";

import { useState } from "react";
import {
  X,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  Tag,
  ExternalLink,
  Check,
  Bookmark,
  Scale,
} from "lucide-react";
import type { ProductHuntingResult, ProductComparisonSummary } from "@/types/product-hunting";
import { Button, Badge, Card, Heading, Text } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { addProductToPlanner } from "@/services/product-hunting-client";

export interface ProductComparisonModalProps {
  products: ProductHuntingResult[];
  comparison: ProductComparisonSummary;
  open: boolean;
  onClose: () => void;
  /** All compared items come from the same single-marketplace search
   * context (the caller only ever compares within one search's results),
   * so this is enough to badge provenance correctly without needing a
   * per-item marketplace field. Defaults to Etsy for existing callers
   * that don't pass it. */
  marketplace?: string;
}

export function ProductComparisonModal({
  products,
  comparison,
  open,
  onClose,
  marketplace = "etsy",
}: ProductComparisonModalProps) {
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (!open || products.length === 0) return null;

  async function handleSaveToPlanner(product: ProductHuntingResult) {
    setSavingId(product.id);
    try {
      await addProductToPlanner(product);
      setSavedMap((prev) => ({ ...prev, [product.id]: true }));
    } catch (err: any) {
      alert(err.message || "Failed to add to Planner");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-line flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-[#FAFAF8] shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
              <Scale className="h-5 w-5" />
            </span>
            <div>
              <Heading as="h2" size="h4" id="modal-title">
                Opportunity Radar Comparison ({products.length} Products)
              </Heading>
              <Text size="body-sm" color="secondary">
                Side-by-side marketplace benchmarks, sales velocity proxies, and shared tag clusters.
              </Text>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-muted transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Shared Insights Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#FAFAF8] border border-line">
            <div>
              <div className="text-[11px] font-bold text-ink-tertiary uppercase">Highest Velocity</div>
              <div className="font-bold text-sm text-[#0E8F5D] mt-0.5 truncate">
                {comparison.highestVelocityProduct.listing.title}
              </div>
              <div className="text-xs text-ink-secondary">
                {comparison.highestVelocityProduct.signals.estDailySales.toFixed(1)} sales/day
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-ink-tertiary uppercase">Lowest Competition</div>
              <div className="font-bold text-sm text-blue-600 mt-0.5 truncate">
                {comparison.lowestCompetitionProduct.listing.title}
              </div>
              <div className="text-xs text-ink-secondary">
                {comparison.lowestCompetitionProduct.shop.reviewCount} total reviews
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-ink-tertiary uppercase">Price Sweet Spot</div>
              {comparison.priceRange ? (
                <>
                  <div className="font-mono font-bold text-sm text-ink mt-0.5">
                    ${comparison.priceRange.min.toFixed(2)} – ${comparison.priceRange.max.toFixed(2)}
                  </div>
                  <div className="text-xs text-ink-secondary">
                    Avg: ${comparison.priceRange.average.toFixed(2)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-ink-tertiary mt-0.5">Price unavailable for this sample</div>
              )}
            </div>
          </div>

          {/* Shared Tags Cloud */}
          {comparison.sharedTags.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase">
                <Tag className="h-3.5 w-3.5 text-amber-600" /> High-Conviction Shared Tags across all selected products:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {comparison.sharedTags.map((tag, i) => (
                  <Badge key={i} variant="warning" className="text-xs font-semibold">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Products Comparison Grid */}
          <div
            className={`grid gap-4 ${
              products.length === 2
                ? "grid-cols-1 md:grid-cols-2"
                : products.length === 3
                ? "grid-cols-1 md:grid-cols-3"
                : "grid-cols-1 md:grid-cols-4"
            }`}
          >
            {products.map((item) => {
              const isSaved = savedMap[item.id] || item.isSavedToPlanner;
              const isVelocityLeader = comparison.highestVelocityProduct.id === item.id;
              const isOpportunityLeader = comparison.highestOpportunityProduct.id === item.id;

              return (
                <Card
                  key={item.id}
                  padding="md"
                  className="border-line flex flex-col justify-between space-y-4 bg-white relative hover:border-line-strong transition-all shadow-xs"
                >
                  <div className="space-y-3">
                    {/* Image & Leader Badges */}
                    <div className="relative">
                      {item.listing.imageUrl ? (
                        <img
                          src={item.listing.imageUrl}
                          alt={item.listing.title}
                          className="h-36 w-full rounded-lg object-cover border border-line"
                        />
                      ) : (
                        <div className="h-36 w-full rounded-lg bg-surface-muted border border-line flex items-center justify-center text-xs font-bold text-ink-tertiary">
                          ETSY
                        </div>
                      )}

                      {isOpportunityLeader && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#0E8F5D] text-white text-[10px] font-bold shadow-xs">
                          ★ Top Radar
                        </span>
                      )}
                      {isVelocityLeader && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold shadow-xs">
                          🔥 Top Velocity
                        </span>
                      )}
                    </div>

                    {/* Title & Price */}
                    <div>
                      <div className="font-bold text-xs text-ink line-clamp-2" title={item.listing.title}>
                        {item.listing.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-base font-bold text-ink">
                          {item.listing.price !== null ? `$${item.listing.price.toFixed(2)}` : "Unavailable"}
                        </span>
                        <DataProvenanceBadge type={marketplace === "etsy" ? "ACTUAL_ETSY_DATA" : "EXTERNAL_DATA"} />
                      </div>
                    </div>

                    {/* Opportunity Radar Metrics */}
                    <div className="p-2.5 rounded-lg bg-[#FAFAF8] border border-line-subtle space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-tertiary">Radar Score:</span>
                        <span className="font-mono font-bold text-[#0E8F5D]">
                          {item.opportunity.opportunityScore}/100
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-tertiary">Daily Velocity:</span>
                        <span className="font-mono font-semibold text-ink">
                          {item.signals.estDailySales.toFixed(1)}/day
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-tertiary">Sales/Listing:</span>
                        <span className="font-mono font-semibold text-ink">
                          {item.signals.avgSellingRatio.toFixed(1)}x
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-tertiary">Parent Reviews:</span>
                        <span className="font-mono font-semibold text-ink">
                          {item.shop.reviewCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink-tertiary">Listing Age:</span>
                        <span className="font-mono text-ink">
                          {item.listing.listingAgeDays}d
                        </span>
                      </div>
                    </div>

                    {/* Tags preview */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-ink-tertiary uppercase">Tags ({item.listing.tags.length}):</div>
                      <div className="flex flex-wrap gap-1">
                        {item.listing.tags.slice(0, 4).map((t, i) => (
                          <span
                            key={i}
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              comparison.sharedTags.includes(t.toLowerCase())
                                ? "bg-amber-100/70 border-amber-300 text-amber-900 font-semibold"
                                : "bg-[#F4F3EF] border-line-subtle text-ink"
                            }`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-line-subtle flex flex-col gap-2">
                    <Button
                      variant={isSaved ? "secondary" : "primary"}
                      size="compact"
                      loading={savingId === item.id}
                      disabled={isSaved}
                      onClick={() => handleSaveToPlanner(item)}
                      className="w-full text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
                    >
                      {isSaved ? (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" /> In Planner
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-3.5 w-3.5 mr-1" /> Add to Planner
                        </>
                      )}
                    </Button>

                    <a
                      href={item.listing.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-center text-ink-secondary hover:text-[#0E8F5D] flex items-center justify-center gap-1 font-medium"
                    >
                      View on Etsy <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-line bg-[#FAFAF8] flex justify-end shrink-0">
          <Button variant="secondary" size="compact" onClick={onClose}>
            Close Comparison
          </Button>
        </div>
      </div>
    </div>
  );
}
