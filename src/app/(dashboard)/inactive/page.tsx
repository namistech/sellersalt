"use client";

import { useEffect, useState } from "react";

interface Dropped {
  searchConfigName: string;
  shopExternalId: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl: string | null;
  lastSeenAt: string;
  lastKnownTotalSales: number | null;
  lastKnownReviewCount: number;
}

export default function InactivePage() {
  const [dropped, setDropped] = useState<Dropped[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inactive")
      .then((r) => r.json())
      .then((d) => {
        setDropped(d.dropped ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Dropped shops</h1>
        <p className="mt-1 text-sm text-muted">
          Shops that matched a search's previous run but not its most recent one. This could
          mean deactivated, on vacation, or just drifted outside your price/age/review
          filters — worth a manual check, not a confirmed fact.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : dropped.length === 0 ? (
        <div className="card">
          <p className="text-sm text-muted">
            Nothing to show yet. This needs a search to have completed at least two successful
            scheduled runs before there's anything to compare — check back after your
            schedules have fired a few more times.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Shop</th>
                <th className="py-2 pr-4">From search</th>
                <th className="py-2 pr-4">Last known sales</th>
                <th className="py-2 pr-4">Last known reviews</th>
                <th className="py-2 pr-4">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {dropped.map((d) => (
                <tr key={`${d.searchConfigName}-${d.shopExternalId}`}>
                  <td className="py-2 pr-4">
                    <a
                      href={d.shopUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 font-medium text-accent hover:underline"
                    >
                      {d.shopIconUrl ? (
                        <img src={d.shopIconUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <span className="h-6 w-6 rounded-full bg-line" />
                      )}
                      {d.shopName}
                    </a>
                  </td>
                  <td className="py-2 pr-4 text-muted">{d.searchConfigName}</td>
                  <td className="py-2 pr-4 tabular-nums">{d.lastKnownTotalSales ?? "—"}</td>
                  <td className="py-2 pr-4 tabular-nums">{d.lastKnownReviewCount}</td>
                  <td className="py-2 pr-4 text-muted">{new Date(d.lastSeenAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
