"use client";

import { useEffect, useState } from "react";
import { Download, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Button, Alert } from "@/components/ui";
import { Table, EmptyState, formatShortDate, type Column } from "@/components/data";
import { fetchDroppedShops, type DroppedShopRow } from "@/services/inactive";
import { ServiceError } from "@/services/http";

const columns: Column<DroppedShopRow>[] = [
  {
    key: "shop",
    header: "Shop",
    render: (d) => (
      <a href={d.shopUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-medium text-accent hover:underline">
        {d.shopIconUrl ? <img src={d.shopIconUrl} alt="" className="h-6 w-6 rounded-full object-cover" /> : <span className="h-6 w-6 rounded-full bg-line-subtle" />}
        {d.shopName}
      </a>
    ),
  },
  { key: "searchConfigName", header: "From search", render: (d) => <>{d.searchConfigName}</> },
  { key: "lastKnownTotalSales", header: "Last known sales", align: "right", render: (d) => <>{d.lastKnownTotalSales ?? "—"}</> },
  { key: "lastKnownReviewCount", header: "Last known reviews", align: "right", render: (d) => <>{d.lastKnownReviewCount}</> },
  { key: "lastSeenAt", header: "Last seen", render: (d) => <>{formatShortDate(d.lastSeenAt)}</> },
];

function toCsv(rows: DroppedShopRow[]): string {
  const header = "Shop,From Search,Last Known Sales,Last Known Reviews,Last Seen";
  const body = rows
    .map((d) => [d.shopName, d.searchConfigName, d.lastKnownTotalSales ?? "", d.lastKnownReviewCount, d.lastSeenAt].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return [header, body].join("\n");
}

export default function InactivePage() {
  const [dropped, setDropped] = useState<DroppedShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDroppedShops()
      .then(setDropped)
      .catch((e) => setError(e instanceof ServiceError ? e.message : "Couldn't load Dropped shops."))
      .finally(() => setLoading(false));
  }, []);

  function handleExport() {
    const blob = new Blob([toCsv(dropped)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellersalt-dropped-shops-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Dropped shops"
        description="Shops that matched a search's previous run but not its most recent one. This could mean deactivated, on vacation, or just drifted outside your price/age/review filters — worth a manual check, not a confirmed fact."
        primaryAction={
          dropped.length > 0 ? (
            <Button variant="secondary" leadingIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Export CSV
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert variant="danger" title="Couldn't load Dropped shops" className="mb-6">
          {error}
        </Alert>
      )}

      <Card padding="sm">
        <Table<DroppedShopRow>
          aria-label="Dropped shops"
          columns={columns}
          rows={dropped}
          getRowId={(d) => `${d.searchConfigName}-${d.shopExternalId}`}
          loading={loading}
          emptyState={
            <EmptyState
              icon={<XCircle />}
              title="Nothing to show yet"
              description="This needs a search to have completed at least two successful scheduled runs before there's anything to compare — check back after your schedules have fired a few more times."
            />
          }
        />
      </Card>
    </div>
  );
}
