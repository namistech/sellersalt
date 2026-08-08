"use client";

import { useEffect, useState } from "react";

interface Trend {
  shopExternalId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl: string | null;
  firstTotalSales: number | null;
  lastTotalSales: number | null;
  firstReviewCount: number;
  lastReviewCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  snapshotCount: number;
  salesGrowth: number | null;
  reviewGrowth: number;
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trends")
      .then((r) => r.json())
      .then((d) => {
        setTrends(d.trends ?? []);
        setLoading(false);
      });
  }, []);

  const gaining = trends.filter((t) => (t.salesGrowth ?? 0) > 0);
  const declining = trends.filter((t) => (t.salesGrowth ?? 0) < 0);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Trends</h1>
        <p className="mt-1 text-sm text-muted">
          Shops seen across two or more of your scheduled runs, compared first-seen to
          most-recent. Sales growth is real (Etsy's lifetime sales count), not estimated.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : trends.length === 0 ? (
        <div className="card">
          <p className="text-sm text-muted">
            No trend data yet. Trends need a shop to show up in at least two separate runs of
            the same search — set a search to run on a schedule (Daily or Weekly, from the
            Prospects page) and check back after it's fired a few times.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <TrendSection title="Gaining" rows={gaining} />
          <TrendSection title="Declining" rows={declining} />
        </div>
      )}
    </div>
  );
}

function TrendSection({ title, rows }: { title: string; rows: Trend[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="card overflow-x-auto">
      <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-4">Shop</th>
            <th className="py-2 pr-4">Sales</th>
            <th className="py-2 pr-4">Sales change</th>
            <th className="py-2 pr-4">Reviews</th>
            <th className="py-2 pr-4">Review change</th>
            <th className="py-2 pr-4">Snapshots</th>
            <th className="py-2 pr-4">Tracked since</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((t) => (
            <tr key={t.shopExternalId}>
              <td className="py-2 pr-4">
                <a
                  href={t.shopUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 font-medium text-accent hover:underline"
                >
                  {t.shopIconUrl ? (
                    <img src={t.shopIconUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="h-6 w-6 rounded-full bg-line" />
                  )}
                  {t.shopName}
                </a>
              </td>
              <td className="py-2 pr-4 tabular-nums">{t.lastTotalSales ?? "—"}</td>
              <td
                className={`py-2 pr-4 tabular-nums font-medium ${
                  (t.salesGrowth ?? 0) > 0 ? "text-success" : (t.salesGrowth ?? 0) < 0 ? "text-danger" : ""
                }`}
              >
                {t.salesGrowth != null ? (t.salesGrowth > 0 ? `+${t.salesGrowth}` : t.salesGrowth) : "—"}
              </td>
              <td className="py-2 pr-4 tabular-nums">{t.lastReviewCount}</td>
              <td className="py-2 pr-4 tabular-nums">
                {t.reviewGrowth > 0 ? `+${t.reviewGrowth}` : t.reviewGrowth}
              </td>
              <td className="py-2 pr-4 tabular-nums">{t.snapshotCount}</td>
              <td className="py-2 pr-4 text-muted">{new Date(t.firstSeenAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
