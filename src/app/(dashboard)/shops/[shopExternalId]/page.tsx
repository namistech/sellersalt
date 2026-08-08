"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Listing {
  listingExternalId: string;
  listingTitle: string;
  listingUrl: string;
  listingImageUrl: string | null;
  price: number;
  lastSeenAt: string;
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
    shopAgeMonths: number;
    reviewCount: number;
    reviewAverage: number | null;
    activeListings: number;
    totalSales: number | null;
    numFavorers: number | null;
    avgSellingRatio: number | null;
    estDailySales: number | null;
    badges: string[];
  };
  keywords: Array<{ term: string; count: number }>;
  listings: Listing[];
  watch: { isActive: boolean; startedAt: string; snapshots: Snapshot[] } | null;
}

type SortOption = "recent" | "price-desc" | "price-asc";

export default function ShopDetailPage() {
  const params = useParams();
  const shopExternalId = params.shopExternalId as string;

  const [data, setData] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"overview" | "track">("overview");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [trackingBusy, setTrackingBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/shops/${shopExternalId}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const json = await res.json();
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

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (notFound || !data) {
    return (
      <div className="card">
        <p className="text-sm text-muted">
          This shop isn't in your data yet — it needs to show up in a Prospects search first.
        </p>
      </div>
    );
  }

  const { shop, keywords, listings, watch } = data;

  const sortedListings = [...listings].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
  });
  const visibleListings = sortedListings.slice(0, 12);

  const chartData = (watch?.snapshots ?? []).map((s) => ({
    date: new Date(s.capturedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    sales: s.totalSales ?? 0,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {shop.shopIconUrl ? (
            <img
              src={shop.shopIconUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-2 ring-line"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-line" />
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

      <div className="mb-6 flex gap-1 border-b border-line">
        <button
          onClick={() => setTab("overview")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
            tab === "overview" ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("track")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
            tab === "track" ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Spy on Competitor
        </button>
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <StatCard label="Total sales" value={shop.totalSales ?? "—"} />
            <StatCard label="Active listings" value={shop.activeListings} />
            <StatCard
              label="Reviews"
              value={shop.reviewCount}
              sub={shop.reviewAverage != null ? `${shop.reviewAverage.toFixed(1)}★ avg` : undefined}
            />
            <StatCard label="Shop age" value={`${shop.shopAgeMonths}mo`} />
            <StatCard label="Sales / listing" value={shop.avgSellingRatio ?? "—"} />
            <StatCard label="Est. daily sales" value={shop.estDailySales ?? "—"} />
            <StatCard label="Favorites" value={shop.numFavorers ?? "—"} />
          </div>

          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-ink">Popular search terms</h2>
            {keywords.length === 0 ? (
              <p className="text-sm text-muted">Not enough listing data yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <span
                    key={k.term}
                    className="badge border border-line bg-paper text-ink"
                    style={{ fontSize: `${Math.min(0.95, 0.7 + k.count * 0.03)}rem` }}
                  >
                    {k.term} <span className="ml-1 text-muted">{k.count}</span>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              Extracted from listing titles we've captured for this shop — not the platform's own tag data.
            </p>
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Listings we've tracked</h2>
              <select
                className="input !w-auto py-1 text-xs"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="recent">Recently seen</option>
                <option value="price-desc">Price: high to low</option>
                <option value="price-asc">Price: low to high</option>
              </select>
            </div>
            {listings.length === 0 ? (
              <p className="text-sm text-muted">No listings captured yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {visibleListings.map((l) => (
                    <a
                      key={l.listingExternalId}
                      href={l.listingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group block overflow-hidden rounded-md border border-line transition hover:border-accent"
                    >
                      {l.listingImageUrl ? (
                        <img src={l.listingImageUrl} alt="" className="h-32 w-full object-cover" />
                      ) : (
                        <div className="h-32 w-full bg-line" />
                      )}
                      <div className="p-2">
                        <div className="truncate text-xs text-ink group-hover:text-accent">{l.listingTitle}</div>
                        <div className="mt-0.5 text-xs font-medium text-muted">${l.price.toFixed(2)}</div>
                      </div>
                    </a>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">
                  Showing listings found through your searches, not the shop's full catalog.{" "}
                  <a href={shop.shopUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    Show all on Etsy ↗
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "track" && (
        <div className="card">
          {!watch || !watch.isActive ? (
            <div className="relative overflow-hidden rounded-lg">
              <div
                className="absolute inset-0 opacity-60 blur-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(37,99,235,0.35), rgba(37,99,235,0.05))",
                }}
              />
              <div className="relative flex flex-col items-center justify-center gap-4 py-16 text-center">
                <h2 className="text-lg font-semibold text-ink">Start tracking this shop's sales</h2>
                <p className="max-w-md text-sm text-muted">
                  We'll check back on {shop.shopName} once a day and build a real sales trend
                  graph over time — no manual re-running needed.
                </p>
                <button onClick={handleStartTracking} disabled={trackingBusy} className="btn-primary">
                  {trackingBusy ? "Starting…" : "Start tracking sales"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Sales trend — {shop.shopName}</h2>
                <button onClick={handleStopTracking} disabled={trackingBusy} className="btn-secondary">
                  {trackingBusy ? "Stopping…" : "Stop tracking"}
                </button>
              </div>
              {chartData.length < 2 ? (
                <p className="text-sm text-muted">
                  Tracking started. We check daily — the graph fills in once there are a couple of
                  snapshots to compare.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(228 228 231)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="rgb(113 113 122)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="rgb(113 113 122)" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
