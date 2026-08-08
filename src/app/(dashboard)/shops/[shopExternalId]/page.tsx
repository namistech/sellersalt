"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DollarSign, Package, Star, Calendar, Heart, TrendingUp, Target, ShoppingBag, Copy, Check } from "lucide-react";
import { ScoredStatCard } from "../../scored-stat-card";
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

interface TopListing {
  listingExternalId: string;
  title: string;
  price: number;
  url: string;
  imageUrl?: string;
}

interface Snapshot {
  capturedAt: string;
  totalSales: number | null;
  reviewCount: number;
  activeListings: number;
}

interface ShopDetail {
  shop: {
    shopExternalId: string;
    shopName: string;
    shopUrl: string;
    shopIconUrl: string | null;
    shopBannerUrl?: string;
    shopAgeMonths: number;
    reviewCount: number;
    reviewAverage: number | null;
    activeListings: number;
    totalSales: number | null;
    numFavorers: number | null;
    avgSellingRatio: number;
    estDailySales: number;
    badges: string[];
  };
  keywords: Array<{ term: string; count: number }>;
  topListings: TopListing[];
  watch: { isActive: boolean; startedAt: string; snapshots: Snapshot[] } | null;
}

export default function ShopDetailPage() {
  const params = useParams();
  const shopExternalId = params.shopExternalId as string;

  const [data, setData] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await fetch(`/api/shops/${shopExternalId}`);
    const json = await res.json();
    if (!res.ok) {
      setErrorMsg(json.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopExternalId]);

  async function handleStartTracking() {
    setTrackingBusy(true);
    await fetch(`/api/shops/${shopExternalId}/track`, { method: "POST" });
    setTrackingBusy(false);
    load();
  }

  async function handleStopTracking() {
    setTrackingBusy(true);
    await fetch(`/api/shops/${shopExternalId}/track`, { method: "DELETE" });
    setTrackingBusy(false);
    load();
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

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (errorMsg || !data || !scored) {
    return (
      <div className="card">
        <p className="text-sm text-muted">{errorMsg ?? "Shop not found."}</p>
      </div>
    );
  }

  const { shop, keywords, topListings, watch } = data;

  // Fall back to a listing photo as the cover when Etsy doesn't expose a shop
  // banner for this shop (common — banners are optional on Etsy's side, not
  // something we failed to fetch).
  const coverImage = shop.shopBannerUrl || topListings[0]?.imageUrl;

  const trendData = (watch?.snapshots ?? []).map((s) => ({
    date: new Date(s.capturedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    sales: s.totalSales ?? 0,
    reviews: s.reviewCount,
    listings: s.activeListings,
  }));
  const currentSnapshotBar = [
    { name: "Sales", value: shop.totalSales ?? 0 },
    { name: "Reviews", value: shop.reviewCount },
    { name: "Listings", value: shop.activeListings },
  ];
  const isTracking = watch?.isActive ?? false;
  const hasTrendHistory = trendData.length >= 2;
  const overallMeta = levelMeta(scored.overall);

  return (
    <div>
      {/* Banner + header */}
      <div className="mb-6 overflow-hidden rounded-lg border border-line">
        <div
          className="h-32 w-full bg-gradient-to-br from-accent/25 to-accent-soft bg-cover bg-center sm:h-40"
          style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
        />
        <div className="flex flex-wrap items-start justify-between gap-4 bg-surface p-4">
          <div className="flex items-center gap-4">
            {shop.shopIconUrl ? (
              <img
                src={shop.shopIconUrl}
                alt=""
                className="-mt-10 h-16 w-16 rounded-full object-cover ring-4 ring-surface"
              />
            ) : (
              <div className="-mt-10 h-16 w-16 rounded-full bg-line ring-4 ring-surface" />
            )}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{shop.shopName}</h1>
              {shop.badges.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {shop.badges.map((b) => (
                    <span key={b} className="badge bg-accent-soft text-accent">
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <a href={shop.shopUrl} target="_blank" rel="noreferrer" className="btn-primary shrink-0">
            Visit shop ↗
          </a>
        </div>
      </div>

      {/* Competition rating — separated, most important card */}
      <div
        className={`mb-6 flex items-center gap-5 rounded-lg border-2 p-5 ${overallMeta.bg}`}
        style={{ borderColor: "currentColor" }}
      >
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/70 dark:bg-black/20 ${overallMeta.text}`}>
          <Target className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Overall competition rating</div>
          <div className={`text-xl font-bold ${overallMeta.text}`}>{overallMeta.label}</div>
          <p className="mt-0.5 text-xs text-muted">
            Based on this shop's age, lifetime sales, reviews, catalog size, and favorites.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-2 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
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
        <ScoredStatCard
          icon={ShoppingBag}
          label="Sales / listing"
          value={shop.avgSellingRatio}
          level={scored.sellThroughLevel}
          metaFn={demandMeta}
        />
        <ScoredStatCard
          icon={TrendingUp}
          label="Est. daily sales"
          value={shop.estDailySales}
          level={scored.velocityLevel}
          metaFn={demandMeta}
        />
        <div className="sm:col-span-1 md:col-span-2">
          <ScoredStatCard icon={Heart} label="Favorites" value={shop.numFavorers ?? "—"} level={scored.favoritesLevel} />
        </div>
      </div>
      <p className="mb-6 text-xs text-muted">
        Age, sales, reviews, listings, and favorites score how entrenched <em>this shop</em> is.
        Sales/listing and est. daily sales are a separate signal — how strong current buyer
        demand is in this category, regardless of whether this particular shop is easy to beat.
      </p>

      {/* Sales tracking graph */}
      <div className="card mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Sales tracking</h2>
          {isTracking ? (
            <button onClick={handleStopTracking} disabled={trackingBusy} className="btn-secondary">
              {trackingBusy ? "Stopping…" : "Stop tracking"}
            </button>
          ) : (
            <button onClick={handleStartTracking} disabled={trackingBusy} className="btn-primary">
              {trackingBusy ? "Starting…" : "Start tracking the shop"}
            </button>
          )}
        </div>

        {hasTrendHistory ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="reviewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="listingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D97706" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#D97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="rgb(113 113 122)" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} stroke="rgb(113 113 122)" axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgb(228 228 231)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="sales" name="Total sales" stroke="#2563EB" strokeWidth={2} fill="url(#salesGrad)" />
              <Area type="monotone" dataKey="reviews" name="Reviews" stroke="#16A34A" strokeWidth={2} fill="url(#reviewsGrad)" />
              <Area type="monotone" dataKey="listings" name="Listings" stroke="#D97706" strokeWidth={2} fill="url(#listingsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={currentSnapshotBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="rgb(113 113 122)" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} stroke="rgb(113 113 122)" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgb(228 228 231)" }} />
                <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-3 text-xs text-muted">
              {isTracking
                ? "Tracking is active — checking daily. The trend fills in once there are a couple of snapshots to compare."
                : "Showing this shop's current numbers. Start tracking to build a real trend over time — checked once a day."}
            </p>
          </div>
        )}
      </div>

      {/* Search terms */}
      <div className="card mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Popular search terms</h2>
          {keywords.length > 0 && (
            <button onClick={handleCopyKeywords} className="btn-secondary !py-1.5 !px-3 text-xs">
              {copied ? <Check className="mr-1 inline h-3.5 w-3.5" /> : <Copy className="mr-1 inline h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy all"}
            </button>
          )}
        </div>
        {keywords.length === 0 ? (
          <p className="text-sm text-muted">Not enough listing data yet to extract search terms.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span key={k.term} className="badge border border-line bg-paper text-ink">
                {k.term} <span className="ml-1 text-muted">{k.count}</span>
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          Long-tail phrases extracted from listing titles — single-word tags are excluded.
        </p>
      </div>

      {/* Best sellers */}
      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-ink">Best sellers</h2>
        {topListings.length === 0 ? (
          <p className="text-sm text-muted">No listings found for this shop.</p>
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
                    <div className="h-32 w-full bg-line" />
                  )}
                  <div className="p-2">
                    <div className="truncate text-xs text-ink group-hover:text-accent">{l.title}</div>
                    <div className="mt-0.5 text-xs font-medium text-muted">${l.price.toFixed(2)}</div>
                  </div>
                </a>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              Ranked by Etsy's own relevance score — Etsy doesn't expose per-listing sales counts publicly, so this
              isn't a confirmed sales ranking.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
