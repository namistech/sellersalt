"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DollarSign, Package, Star, Calendar, Heart, TrendingUp, Target, ShoppingBag, Copy, Check } from "lucide-react";
import { Card, Button, Badge, Heading, Text, Alert, Skeleton, cn } from "@/components/ui";
import { AreaChart, BarChart, EmptyState, type ChartSeries } from "@/components/data";
import { ScoredStatCard } from "../../scored-stat-card";
import { fetchResearchShop, startTrackingResearchShop, stopTrackingResearchShop, type ResearchShopDetail } from "@/services/researchShops";
import { ServiceError } from "@/services/http";
import {
  scoreShopAgeMonths,
  scoreTotalSales,
  scoreReviewCount,
  scoreEstDailySales,
  scoreSellThrough,
  scoreActiveListings,
  scoreFavorites,
  overallCompetitionRating,
  levelMeta,
  demandMeta,
} from "@/lib/competition-scoring";

const TREND_SERIES: ChartSeries[] = [
  { key: "sales", label: "Total sales", colorIndex: 0 },
  { key: "reviews", label: "Reviews", colorIndex: 2 },
  { key: "listings", label: "Listings", colorIndex: 1 },
];
const SNAPSHOT_SERIES: ChartSeries[] = [{ key: "value", label: "Current" }];

export default function ShopDetailPage() {
  const params = useParams();
  const shopExternalId = params.shopExternalId as string;

  const [data, setData] = useState<ResearchShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    setErrorMsg(null);
    try {
      const json = await fetchResearchShop(shopExternalId);
      setData(json);
    } catch (e) {
      setErrorMsg(e instanceof ServiceError ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopExternalId]);

  async function handleStartTracking() {
    setTrackingBusy(true);
    try {
      await startTrackingResearchShop(shopExternalId);
    } finally {
      setTrackingBusy(false);
      load();
    }
  }

  async function handleStopTracking() {
    setTrackingBusy(true);
    try {
      await stopTrackingResearchShop(shopExternalId);
    } finally {
      setTrackingBusy(false);
      load();
    }
  }

  async function handleCopyKeywords() {
    if (!data) return;
    await navigator.clipboard.writeText(data.keywords.map((k) => k.term).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const scored = useMemo(() => {
    if (!data) return null;
    const { shop } = data;
    const ageLevel = scoreShopAgeMonths(shop.shopAgeMonths);
    const salesLevel = scoreTotalSales(shop.totalSales ?? 0);
    const reviewLevel = scoreReviewCount(shop.reviewCount);
    const listingsLevel = scoreActiveListings(shop.activeListings);
    const favoritesLevel = scoreFavorites(shop.numFavorers ?? 0);
    const velocityLevel = scoreEstDailySales(shop.estDailySales);
    const sellThroughLevel = scoreSellThrough(shop.avgSellingRatio);
    const overall = overallCompetitionRating([ageLevel, salesLevel, reviewLevel, listingsLevel, favoritesLevel]);
    return { ageLevel, salesLevel, reviewLevel, velocityLevel, sellThroughLevel, listingsLevel, favoritesLevel, overall };
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton variant="block" className="h-40 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} variant="block" className="h-28 w-full rounded-md" />
          ))}
        </div>
        <Skeleton variant="block" className="h-72 w-full rounded-md" />
      </div>
    );
  }

  if (errorMsg || !data || !scored) {
    return (
      <Card padding="lg">
        <EmptyState tone="error" title="Couldn't load this shop" description={errorMsg ?? "Shop not found."} />
      </Card>
    );
  }

  const { shop, keywords, topListings, watch } = data;
  const coverImage = shop.shopBannerUrl || topListings[0]?.imageUrl;

  const trendData = (watch?.snapshots ?? []).map((s) => ({
    date: new Date(s.capturedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    sales: s.totalSales ?? 0,
    reviews: s.reviewCount,
    listings: s.activeListings,
  }));
  const snapshotBarData = [
    { name: "Sales", value: shop.totalSales ?? 0 },
    { name: "Reviews", value: shop.reviewCount },
    { name: "Listings", value: shop.activeListings },
  ];
  const isTracking = watch?.isActive ?? false;
  const hasTrendHistory = trendData.length >= 2;
  const overallMeta = levelMeta(scored.overall);

  return (
    <div className="flex flex-col gap-6">
      {/* Banner + header */}
      <div className="overflow-hidden rounded-lg border border-line">
        <div
          className="h-32 w-full bg-gradient-to-br from-accent/25 to-accent-soft bg-cover bg-center sm:h-40"
          style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
        />
        <div className="flex flex-wrap items-start justify-between gap-4 bg-surface p-4">
          <div className="flex items-center gap-4">
            {shop.shopIconUrl ? (
              <img src={shop.shopIconUrl} alt="" className="-mt-10 h-16 w-16 rounded-full object-cover ring-4 ring-surface" />
            ) : (
              <div className="-mt-10 h-16 w-16 rounded-full bg-line ring-4 ring-surface" />
            )}
            <div>
              <Heading as="h1" size="h1">
                {shop.shopName}
              </Heading>
              {shop.badges.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {shop.badges.map((b) => (
                    <Badge key={b} variant="success">
                      {b}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button variant="primary" href={shop.shopUrl} target="_blank" className="shrink-0">
            Visit shop ↗
          </Button>
        </div>
      </div>

      {/* Competition rating */}
      <div className={cn("flex items-center gap-5 rounded-lg border-2 p-5", overallMeta.bg)} style={{ borderColor: "currentColor" }}>
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/70", overallMeta.text)}>
          <Target className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <Text as="div" size="label-sm" color="secondary" className="uppercase tracking-wide">
            Overall competition rating
          </Text>
          <Heading as="h2" size="h3" className={overallMeta.text}>
            {overallMeta.label}
          </Heading>
          <Text size="body-sm" color="secondary" className="mt-0.5">
            Based on this shop's age, lifetime sales, reviews, catalog size, and favorites.
          </Text>
        </div>
      </div>

      {/* Stat cards */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          <ScoredStatCard icon={DollarSign} label="Total sales" value={shop.totalSales ?? "—"} level={scored.salesLevel} />
          <ScoredStatCard icon={Package} label="Active listings" value={shop.activeListings} level={scored.listingsLevel} />
          <ScoredStatCard
            icon={Star}
            label="Reviews"
            value={shop.reviewCount}
            sub={shop.reviewAverage != null ? `${shop.reviewAverage.toFixed(1)}★ avg` : undefined}
            level={scored.reviewLevel}
          />
          <ScoredStatCard icon={Calendar} label="Shop age" value={`${shop.shopAgeMonths}mo`} level={scored.ageLevel} />
          <ScoredStatCard icon={ShoppingBag} label="Sales / listing" value={shop.avgSellingRatio} level={scored.sellThroughLevel} metaFn={demandMeta} />
          <ScoredStatCard icon={TrendingUp} label="Est. daily sales" value={shop.estDailySales} level={scored.velocityLevel} metaFn={demandMeta} />
          <ScoredStatCard icon={Heart} label="Favorites" value={shop.numFavorers ?? "—"} level={scored.favoritesLevel} />
        </div>
        <Text size="meta" color="tertiary">
          Age, sales, reviews, listings, and favorites score how entrenched <em>this shop</em> is. Sales/listing and est. daily
          sales are a separate signal — how strong current buyer demand is in this category, regardless of whether this
          particular shop is easy to beat.
        </Text>
      </div>

      {/* Sales tracking graph */}
      <Card padding="lg">
        <div className="mb-4 flex items-center justify-between">
          <Heading as="h2" size="h4">
            Sales tracking
          </Heading>
          {isTracking ? (
            <Button variant="secondary" loading={trackingBusy} onClick={handleStopTracking}>
              Stop tracking
            </Button>
          ) : (
            <Button variant="primary" loading={trackingBusy} onClick={handleStartTracking}>
              Start tracking the shop
            </Button>
          )}
        </div>

        {hasTrendHistory ? (
          <AreaChart data={trendData} xKey="date" series={TREND_SERIES} height={280} accessibleSummary="Sales, reviews, and listings over time for this tracked shop" />
        ) : (
          <div>
            <BarChart data={snapshotBarData} xKey="name" series={SNAPSHOT_SERIES} height={220} accessibleSummary="Current sales, reviews, and listings snapshot" />
            <Text size="meta" color="tertiary" className="mt-3">
              {isTracking
                ? "Tracking is active — checking daily. The trend fills in once there are a couple of snapshots to compare."
                : "Showing this shop's current numbers. Start tracking to build a real trend over time — checked once a day."}
            </Text>
          </div>
        )}
      </Card>

      {/* Search terms */}
      <Card padding="lg">
        <div className="mb-3 flex items-center justify-between">
          <Heading as="h2" size="h4">
            Popular search terms
          </Heading>
          {keywords.length > 0 && (
            <Button variant="secondary" size="compact" leadingIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} onClick={handleCopyKeywords}>
              {copied ? "Copied" : "Copy all"}
            </Button>
          )}
        </div>
        {keywords.length === 0 ? (
          <Text size="body-sm" color="secondary">
            Not enough listing data yet to extract search terms.
          </Text>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <Badge key={k.term} variant="neutral">
                {k.term} <span className="text-ink-tertiary">{k.count}</span>
              </Badge>
            ))}
          </div>
        )}
        <Text size="meta" color="tertiary" className="mt-3">
          Long-tail phrases extracted from listing titles — single-word tags are excluded.
        </Text>
      </Card>

      {/* Best sellers */}
      <Card padding="lg">
        <Heading as="h2" size="h4" className="mb-3">
          Best sellers
        </Heading>
        {topListings.length === 0 ? (
          <Text size="body-sm" color="secondary">
            No listings found for this shop.
          </Text>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {topListings.map((l) => (
                <a
                  key={l.listingExternalId}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-md border border-line transition hover:border-accent"
                >
                  {l.imageUrl ? (
                    <img src={l.imageUrl} alt="" className="h-32 w-full object-cover" />
                  ) : (
                    <div className="h-32 w-full bg-line-subtle" />
                  )}
                  <div className="p-2">
                    <Text size="body-sm" className="truncate group-hover:text-accent">
                      {l.title}
                    </Text>
                    <Text size="body-sm" weight="medium" color="secondary" className="mt-0.5">
                      ${l.price.toFixed(2)}
                    </Text>
                  </div>
                </a>
              ))}
            </div>
            <Text size="meta" color="tertiary" className="mt-3">
              Ranked by Etsy's own relevance score — Etsy doesn't expose per-listing sales counts publicly, so this isn't a
              confirmed sales ranking.
            </Text>
          </>
        )}
      </Card>
    </div>
  );
}
