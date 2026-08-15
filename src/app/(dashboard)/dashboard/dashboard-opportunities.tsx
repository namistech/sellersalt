"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, ExternalLink, ArrowRight, Sparkles, Check } from "lucide-react";
import { Card, Button, Badge, Heading, Text, IconButton } from "@/components/ui";
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
    <Card padding="lg" className="flex flex-col justify-between">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heading as="h2" size="h4">
              Top Opportunity Discoveries
            </Heading>
            <Badge variant="success">High potential</Badge>
          </div>
          <Link
            href="/prospects"
            className="inline-flex items-center gap-1 text-body-sm font-medium text-accent hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
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
            {items.map((item) => {
              const velocityLevel = scoreEstDailySales(item.estDailySales ?? 0);
              const meta = demandMeta(velocityLevel);

              return (
                <div key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    {item.listingImageUrl ? (
                      <img
                        src={item.listingImageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-md object-cover border border-line"
                      />
                    ) : (
                      <div className="h-12 w-12 shrink-0 rounded-md bg-line-subtle" />
                    )}
                    <div className="min-w-0">
                      <a
                        href={item.listingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center gap-1 font-medium text-ink hover:text-accent"
                      >
                        <Text as="span" size="body-sm" weight="medium" className="truncate">
                          {item.listingTitle}
                        </Text>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                      </a>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-meta text-ink-tertiary">
                        <Link href={`/shops/${item.shopExternalId}`} className="text-accent hover:underline">
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
                      <Badge variant="success" className="flex items-center gap-1">
                        <Check className="h-3 w-3" /> Shortlisted
                      </Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        size="compact"
                        disabled={updatingId === item.id}
                        onClick={() => handleStatusChange(item.id, "SHORTLISTED")}
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
        <span>Ranked by estimated buyer velocity & demand signals</span>
        <Link href="/prospects?status=SHORTLISTED" className="text-accent hover:underline">
          Shortlist pipeline →
        </Link>
      </div>
    </Card>
  );
}
