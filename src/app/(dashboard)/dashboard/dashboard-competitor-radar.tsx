"use client";

import Link from "next/link";
import { Radar, ArrowRight, TrendingUp } from "lucide-react";
import { Card, Button, Eyebrow, Text, Badge } from "@/components/ui";
import { EmptyState, MetricDelta, formatRelativeTime, Freshness } from "@/components/data";
import type { DashboardCompetitorItem } from "@/services/dashboard";

interface DashboardCompetitorRadarProps {
  competitors: DashboardCompetitorItem[];
}

export function DashboardCompetitorRadar({ competitors }: DashboardCompetitorRadarProps) {
  return (
    <Card padding="lg" className="flex flex-col justify-between">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eyebrow>Competitor Radar</Eyebrow>
            <Badge variant="neutral">Active tracking</Badge>
          </div>
          <Link
            href="/spy/tracked"
            className="inline-flex items-center gap-1 text-body-sm font-medium text-accent hover:underline"
          >
            All tracked shops <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {competitors.length === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={<Radar />}
              title="No competitor shops tracked yet"
              description="Spy on any Etsy competitor URL to build a real historical sales & review trend over time."
              action={
                <Button variant="primary" size="compact" href="/spy">
                  Spy on a shop
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-line-subtle">
            {competitors.map((shop) => {
              const snapshot = shop.latestSnapshot;
              const sales = snapshot?.totalSales;
              const hasSalesDelta = shop.salesDelta != null && shop.salesDelta !== 0;

              return (
                <div key={shop.shopExternalId} className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/shops/${shop.shopExternalId}`}
                      className="group flex items-center gap-1.5 font-medium text-ink hover:text-accent"
                    >
                      <Radar className="h-4 w-4 text-accent shrink-0" aria-hidden />
                      <Text as="span" size="body-sm" weight="medium" className="truncate">
                        {shop.shopName}
                      </Text>
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-meta text-ink-tertiary">
                      <span>
                        Sales: <strong className="text-ink">{sales != null ? sales.toLocaleString() : "—"}</strong>
                      </span>
                      {hasSalesDelta && (
                        <span className="flex items-center gap-0.5">
                          (<MetricDelta value={shop.salesDelta!} type="absolute" higherIsBetter /> vs previous)
                        </span>
                      )}
                      <span>·</span>
                      <span>
                        Reviews: <strong className="text-ink">{snapshot?.reviewCount ?? "—"}</strong>
                      </span>
                      {shop.reviewDelta != null && shop.reviewDelta !== 0 && (
                        <span>
                          (+{shop.reviewDelta})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {snapshot?.capturedAt && (
                      <Freshness state="recent" timestamp={snapshot.capturedAt} />
                    )}
                    <Button variant="secondary" size="compact" href={`/shops/${shop.shopExternalId}`}>
                      View trend ↗
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-meta text-ink-tertiary">
        <span>Snapshots refreshed via background schedule</span>
        <Link href="/spy" className="text-accent hover:underline">
          + Track new shop
        </Link>
      </div>
    </Card>
  );
}
