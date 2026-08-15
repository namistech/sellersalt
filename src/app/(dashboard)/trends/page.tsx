"use client";

import { useEffect, useState } from "react";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Button, Alert, Heading } from "@/components/ui";
import { Table, EmptyState, MetricDelta, formatShortDate, type Column } from "@/components/data";
import { fetchTrends, type TrendRow } from "@/services/trends";
import { ServiceError } from "@/services/http";

function buildColumns(): Column<TrendRow>[] {
  return [
    {
      key: "shop",
      header: "Shop",
      render: (t) => (
        <a href={t.shopUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-medium text-accent hover:underline">
          {t.shopIconUrl ? <img src={t.shopIconUrl} alt="" className="h-6 w-6 rounded-full object-cover" /> : <span className="h-6 w-6 rounded-full bg-line-subtle" />}
          {t.shopName}
        </a>
      ),
    },
    { key: "lastTotalSales", header: "Sales", align: "right", render: (t) => <>{t.lastTotalSales ?? "—"}</> },
    {
      key: "salesGrowth",
      header: "Sales change",
      align: "right",
      render: (t) => (t.salesGrowth != null ? <MetricDelta value={t.salesGrowth} type="absolute" /> : <>—</>),
    },
    { key: "lastReviewCount", header: "Reviews", align: "right", render: (t) => <>{t.lastReviewCount}</> },
    { key: "reviewGrowth", header: "Review change", align: "right", render: (t) => <MetricDelta value={t.reviewGrowth} type="absolute" /> },
    { key: "snapshotCount", header: "Snapshots", align: "right", render: (t) => <>{t.snapshotCount}</> },
    { key: "firstSeenAt", header: "Tracked since", render: (t) => <>{formatShortDate(t.firstSeenAt)}</> },
  ];
}

function toCsv(rows: TrendRow[]): string {
  const header = "Shop,Last Sales,Sales Change,Last Reviews,Review Change,Snapshots,Tracked Since";
  const body = rows
    .map((t) => [t.shopName, t.lastTotalSales ?? "", t.salesGrowth ?? "", t.lastReviewCount, t.reviewGrowth, t.snapshotCount, t.firstSeenAt].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return [header, body].join("\n");
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrends()
      .then(setTrends)
      .catch((e) => setError(e instanceof ServiceError ? e.message : "Couldn't load Trends."))
      .finally(() => setLoading(false));
  }, []);

  const columns = buildColumns();
  const gaining = trends.filter((t) => (t.salesGrowth ?? 0) > 0);
  const declining = trends.filter((t) => (t.salesGrowth ?? 0) < 0);

  function handleExport() {
    const blob = new Blob([toCsv(trends)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sellersalt-trends-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Trends"
        description="Shops seen across two or more of your scheduled runs, compared first-seen to most-recent. Sales growth is real (Etsy's lifetime sales count), not estimated."
        primaryAction={
          trends.length > 0 ? (
            <Button variant="secondary" leadingIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Export CSV
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert variant="danger" title="Couldn't load Trends" className="mb-6">
          {error}
        </Alert>
      )}

      {loading ? (
        <Card padding="lg">
          <Table<TrendRow> aria-label="Trends" columns={columns} rows={[]} getRowId={(t) => t.shopExternalId} loading />
        </Card>
      ) : trends.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<TrendingUp />}
            title="No trend data yet"
            description="Trends need a shop to show up in at least two separate runs of the same search — set a search to run on a schedule (Daily or Weekly, from the Prospects page) and check back after it's fired a few times."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {gaining.length > 0 && (
            <Card padding="lg">
              <Heading as="h2" size="h4" className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-data-positive" aria-hidden /> Gaining
              </Heading>
              <Table<TrendRow> aria-label="Gaining shops" columns={columns} rows={gaining} getRowId={(t) => t.shopExternalId} density="compact" />
            </Card>
          )}
          {declining.length > 0 && (
            <Card padding="lg">
              <Heading as="h2" size="h4" className="mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-data-negative" aria-hidden /> Declining
              </Heading>
              <Table<TrendRow> aria-label="Declining shops" columns={columns} rows={declining} getRowId={(t) => t.shopExternalId} density="compact" />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
