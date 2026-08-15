"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radar } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Button, Alert } from "@/components/ui";
import { Table, EmptyState, ResultsCount, formatShortDate, type Column } from "@/components/data";
import { fetchTrackedResearchShops, type TrackedResearchShop } from "@/services/researchShops";
import { ServiceError } from "@/services/http";
import { SpyTabs } from "../spy-tabs";

const columns: Column<TrackedResearchShop>[] = [
  {
    key: "shop",
    header: "Shop",
    render: (s) => (
      <Link href={`/shops/${s.shopExternalId}`} className="flex items-center gap-2 font-medium text-accent hover:underline">
        <Radar className="h-4 w-4" aria-hidden />
        {s.shopName}
      </Link>
    ),
  },
  { key: "totalSales", header: "Total sales", align: "right", render: (s) => <>{s.latestSnapshot?.totalSales ?? "—"}</> },
  { key: "reviewCount", header: "Reviews", align: "right", render: (s) => <>{s.latestSnapshot?.reviewCount ?? "—"}</> },
  { key: "activeListings", header: "Listings", align: "right", render: (s) => <>{s.latestSnapshot?.activeListings ?? "—"}</> },
  {
    key: "lastChecked",
    header: "Last checked",
    render: (s) => <>{s.latestSnapshot ? formatShortDate(s.latestSnapshot.capturedAt) : "Not yet"}</>,
  },
  { key: "trackingSince", header: "Tracking since", render: (s) => <>{formatShortDate(s.trackingSince)}</> },
];

export default function TrackedShopsPage() {
  const [shops, setShops] = useState<TrackedResearchShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrackedResearchShops()
      .then(setShops)
      .catch((e) => setError(e instanceof ServiceError ? e.message : "Couldn't load tracked shops."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Spy on Competitor" />
      <SpyTabs active="tracked" />

      {error && (
        <Alert variant="danger" title="Couldn't load tracked shops" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="mb-3 flex justify-end">
        <ResultsCount count={shops.length} label={shops.length === 1 ? "tracked shop" : "tracked shops"} />
      </div>

      <Card padding="sm">
        <Table<TrackedResearchShop>
          aria-label="Tracked competitor shops"
          columns={columns}
          rows={shops}
          getRowId={(s) => s.shopExternalId}
          loading={loading}
          emptyState={
            <EmptyState
              icon={<Radar />}
              title="No shops being tracked yet"
              description="Track a shop from Spy on Competitor to see it here."
              action={
                <Button variant="primary" href="/spy">
                  Track a shop
                </Button>
              }
            />
          }
        />
      </Card>
    </div>
  );
}
