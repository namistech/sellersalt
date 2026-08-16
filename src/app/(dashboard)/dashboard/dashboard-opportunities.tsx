"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, ExternalLink, ArrowRight, Sparkles, Check, Flame, Gem, Zap } from "lucide-react";
import { Card, Button, Badge, Text, Eyebrow, IconButton, SafeImage, cn } from "@/components/ui";
import { EmptyState } from "@/components/data";
import { scoreEstDailySales, demandMeta } from "@/lib/competition-scoring";
import { updateProspect, type ProspectStatus } from "@/services/prospects";
import type { DashboardOpportunityItem } from "@/services/dashboard";

interface DashboardOpportunitiesProps {
  opportunities: DashboardOpportunityItem[];
  onNewSearch: () => void;
}

export function DashboardOpportunities({ opportunities: initialOpportunities, onNewSearch }: DashboardOpportunitiesProps) {
  const [items, setItems] = useState<DashboardOpportunityItem[]>(initialOpportunities);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleToggleFavorite(id: string, current: boolean) {
    const next = !current;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isFavorite: next } : item)));
    try {
      await updateProspect(id, { isFavorite: next });
    } catch {
      // Revert on error
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isFavorite: current } : item)));
    }
  }

  async function handleStatusChange(id: string, status: ProspectStatus) {
    setUpdatingId(id);
    const previous = items.find((item) => item.id === id)?.status;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    try {
      await updateProspect(id, { status });
    } catch {
      if (previous) {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: previous } : item)));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <Card variant="feature" padding="lg" className="flex flex-col justify-between">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-primary-subtle text-brand-primary text-xs font-bold">
              <Flame className="h-3.5 w-3.5" />
            </span>
            <Eyebrow tone="accent">Top Opportunity Discoveries</Eyebrow>
            <Badge variant="success" className="font-semibold text-brand-primary bg-brand-primary-subtle border border-brand-primary/20">
              High potential
            </Badge>
          </div>
          <Link
            href="/radar"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
          >
            Open Radar <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={<Sparkles />}
              title="No prospects discovered yet"
              description="Define a search with keywords like 'digital planner' or 'svg bundle' to start pulling high-velocity listings."
              action={
                <Button variant="primary" size="compact" onClick={onNewSearch}>
                  Create a search
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-line-subtle">
            {items.map((item, index) => {
              const velocityLevel = scoreEstDailySales(item.estDailySales ?? 0);
              const meta = demandMeta(velocityLevel);
              const isTopFinding = index === 0;

              // Quick opportunity badge detection
              const isEmerging = item.shopAgeMonths <= 18 && (item.estDailySales ?? 0) >= 3.5;
              const isHiddenGem = (item.avgSellingRatio ?? 0) >= 15;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between",
                    isTopFinding && "rounded-md -mx-2 px-2 bg-accent-soft/40"
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <SafeImage
                      src={item.listingImageUrl}
                      alt={item.listingTitle || item.shopName}
                      fallbackType="product"
                      className={cn(
                        "shrink-0 rounded-md object-cover border border-line",
                        isTopFinding ? "h-16 w-16" : "h-12 w-12"
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/products/${item.id}`}
                          className={cn(
                            "text-ink hover:text-brand-primary truncate",
                            isTopFinding ? "font-bold text-base" : "font-medium text-sm"
                          )}
                        >
                          {item.listingTitle}
                        </Link>
                        {isEmerging && (
                          <span className="shrink-0 text-[10px] font-bold text-warn-strong bg-warn-subtle px-1.5 py-0.5 rounded border border-warn/30">
                            🔥 Emerging
                          </span>
                        )}
                        {!isEmerging && isHiddenGem && (
                          <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300">
                            💎 Hidden Gem
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-meta text-ink-tertiary">
                        <Link href={`/shops/${item.shopExternalId}`} className="text-brand-primary hover:underline">
                          {item.shopName}
                        </Link>
                        <span>·</span>
                        <span className="font-semibold text-ink">${item.price.toFixed(2)}</span>
                        {item.estDailySales != null && (
                          <>
                            <span>·</span>
                            <span className={meta.text}>
                              {item.estDailySales.toFixed(1)} sales/day ({meta.label})
                            </span>
                          </>
                        )}
                        {item.avgSellingRatio != null && (
                          <>
                            <span>·</span>
                            <span>{item.avgSellingRatio.toFixed(1)}x density</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <IconButton
                      icon={<Star className={item.isFavorite ? "fill-amber-400 text-amber-400" : "text-ink-tertiary"} />}
                      aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      variant="tertiary"
                      size="compact"
                      onClick={() => handleToggleFavorite(item.id, item.isFavorite)}
                    />
                    {item.status === "SHORTLISTED" ? (
                      <Badge variant="success" className="flex items-center gap-1 text-xs">
                        <Check className="h-3 w-3" /> Shortlisted
                      </Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        size="compact"
                        disabled={updatingId === item.id}
                        onClick={() => handleStatusChange(item.id, "SHORTLISTED")}
                        className="text-xs"
                      >
                        Shortlist
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-meta text-ink-tertiary">
        <span>Ranked by estimated velocity, sales density & competition signals</span>
        <Link href="/radar" className="font-medium text-brand-primary hover:underline flex items-center gap-1">
          Explore Opportunity Radar →
        </Link>
      </div>
    </Card>
  );
}
