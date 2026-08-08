"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radar } from "lucide-react";
import { SpyTabs } from "../spy-tabs";

interface TrackedShop {
  shopExternalId: string;
  shopName: string;
  trackingSince: string;
  latestSnapshot: {
    capturedAt: string;
    totalSales: number | null;
    reviewCount: number;
    activeListings: number;
  } | null;
}

export default function TrackedShopsPage() {
  const [shops, setShops] = useState<TrackedShop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shops/tracked")
      .then((r) => r.json())
      .then((d) => {
        setShops(d.shops ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <SpyTabs active="tracked" />

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : shops.length === 0 ? (
        <div className="card">
          <p className="text-sm text-muted">
            No shops being tracked yet.{" "}
            <Link href="/spy" className="text-accent hover:underline">
              Track a shop
            </Link>{" "}
            to see it here.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Shop</th>
                <th className="py-2 pr-4">Total sales</th>
                <th className="py-2 pr-4">Reviews</th>
                <th className="py-2 pr-4">Listings</th>
                <th className="py-2 pr-4">Last checked</th>
                <th className="py-2 pr-4">Tracking since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shops.map((s) => (
                <tr key={s.shopExternalId}>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/shops/${s.shopExternalId}`}
                      className="flex items-center gap-2 font-medium text-accent hover:underline"
                    >
                      <Radar className="h-4 w-4" />
                      {s.shopName}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{s.latestSnapshot?.totalSales ?? "—"}</td>
                  <td className="py-2 pr-4 tabular-nums">{s.latestSnapshot?.reviewCount ?? "—"}</td>
                  <td className="py-2 pr-4 tabular-nums">{s.latestSnapshot?.activeListings ?? "—"}</td>
                  <td className="py-2 pr-4 text-muted">
                    {s.latestSnapshot ? new Date(s.latestSnapshot.capturedAt).toLocaleDateString() : "Not yet"}
                  </td>
                  <td className="py-2 pr-4 text-muted">{new Date(s.trackingSince).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
