"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Search as SearchIcon, Radar } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Button, Card, Input, Select, Alert, Tabs, Heading, Text, Badge } from "@/components/ui";
import { Table, EmptyState, ResultsCount, ActiveFilters, type Column } from "@/components/data";
import { fetchProspects, updateProspect, type ProspectRow, type ProspectStatus } from "@/services/prospects";
import {
  fetchSearchConfigs,
  createSearchConfig,
  updateSearchConfigSchedule,
  scheduleFrequencyFromCron,
  SCHEDULE_FREQUENCY_LABELS,
  type SearchConfigSummary,
  type ScheduleFrequency,
} from "@/services/searchConfigs";
import { fetchConnectors, type ConnectorSummary } from "@/services/connectors";
import { runSearch } from "@/services/jobs";
import { ServiceError } from "@/services/http";
import { PROSPECT_STATUS_OPTIONS, buildProspectColumns } from "../prospect-columns";
import { NewSearchDrawer } from "../new-search-drawer";

import { LiveSearchTab } from "./live-search-tab";

const CSV_COLUMNS: Array<{ key: keyof ProspectRow; label: string }> = [
  { key: "shopName", label: "Shop" },
  { key: "shopUrl", label: "Shop URL" },
  { key: "shopAgeMonths", label: "Shop Age (mo)" },
  { key: "reviewCount", label: "Reviews" },
  { key: "activeListings", label: "Active Listings" },
  { key: "totalSales", label: "Total Sales" },
  { key: "avgSellingRatio", label: "Sales/Listing" },
  { key: "estDailySales", label: "Est Daily Sales" },
  { key: "listingTitle", label: "Listing" },
  { key: "listingUrl", label: "Listing URL" },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
];

function toCsv(rows: ProspectRow[]): string {
  const header = CSV_COLUMNS.map((c) => c.label).join(",");
  const body = rows
    .map((r) => CSV_COLUMNS.map((c) => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCsv(filename: string, rows: ProspectRow[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type SortKey = "shopAgeMonths" | "reviewCount" | "activeListings" | "totalSales" | "avgSellingRatio" | "estDailySales" | "price";

export default function ProspectsPage() {
  const [tab, setTab] = useState<"live" | "results" | "saved">("live");
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [searchConfigs, setSearchConfigs] = useState<SearchConfigSummary[]>([]);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  // Checkbox row selection for export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [searchFilter, setSearchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<Set<ProspectStatus>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | undefined>("estDailySales");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function loadAll() {
    setLoadError(null);
    try {
      const [c, s, p] = await Promise.all([fetchConnectors(), fetchSearchConfigs(), fetchProspects()]);
      setConnectors(c);
      setSearchConfigs(s);
      setProspects(p);
    } catch (e) {
      setLoadError(e instanceof ServiceError ? e.message : "Couldn't load Prospects. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCreateSearch(input: Parameters<typeof createSearchConfig>[0]) {
    await createSearchConfig(input);
    setDrawerOpen(false);
    setQueuedMessage(
      "We're working on your query. Your research is running in the background — please check back in a minute or two."
    );
    setTab("saved");
    await loadAll();
  }

  async function handleRun(searchConfigId: string) {
    setRunning(searchConfigId);
    try {
      await runSearch(searchConfigId);
    } catch {
      // Surfaced generically
    } finally {
      setRunning(null);
      loadAll();
    }
  }

  async function handleScheduleChange(searchConfigId: string, scheduleFrequency: ScheduleFrequency) {
    setSavingSchedule(searchConfigId);
    try {
      await updateSearchConfigSchedule(searchConfigId, scheduleFrequency);
    } finally {
      setSavingSchedule(null);
      loadAll();
    }
  }

  async function handleToggleFavorite(id: string, next: boolean) {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, isFavorite: next } : p)));
    try {
      await updateProspect(id, { isFavorite: next });
    } catch {
      setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, isFavorite: !next } : p)));
    }
  }

  async function handleStatusChange(id: string, status: ProspectStatus) {
    const previous = prospects.find((p) => p.id === id)?.status;
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    try {
      await updateProspect(id, { status });
    } catch {
      if (previous) setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, status: previous } : p)));
    }
  }

  function toggleStatusFilter(status: ProspectStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let rows = prospects;
    if (searchFilter !== "all") rows = rows.filter((p) => p.searchConfigId === searchFilter);
    if (statusFilter.size > 0) rows = rows.filter((p) => statusFilter.has(p.status));
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? 0) as number;
      const bv = (b[sortKey] ?? 0) as number;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [prospects, searchFilter, statusFilter, sortKey, sortDir]);

  function handleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key as SortKey);
      setSortDir("desc");
    }
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size >= filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }

  function handleExportSelected() {
    const rowsToExport =
      selectedIds.size > 0
        ? filtered.filter((p) => selectedIds.has(p.id))
        : filtered;
    downloadCsv(`sellersalt-prospects-${Date.now()}.csv`, rowsToExport);
  }

  const columns: Column<ProspectRow>[] = buildProspectColumns({
    onToggleFavorite: handleToggleFavorite,
    onStatusChange: handleStatusChange,
    showSearchName: tab === "results" && searchFilter === "all" ? (row) => searchConfigs.find((s) => s.id === row.searchConfigId)?.name : undefined,
  });

  const activeFilters = [
    ...(searchFilter !== "all" ? [{ key: "search", label: `Search: ${searchConfigs.find((s) => s.id === searchFilter)?.name ?? ""}` }] : []),
    ...Array.from(statusFilter).map((s) => ({ key: `status:${s}`, label: PROSPECT_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s })),
  ];

  function clearFilters() {
    setSearchFilter("all");
    setStatusFilter(new Set());
  }

  function removeFilter(key: string) {
    if (key === "search") setSearchFilter("all");
    if (key.startsWith("status:")) {
      const status = key.replace("status:", "") as ProspectStatus;
      toggleStatusFilter(status);
    }
  }

  if (!loading && connectors.length === 0) {
    return (
      <div>
        <PageHeader title="Prospects" description="Results are grouped under the search that found them." />
        <Card padding="lg">
          <EmptyState
            title="Connect a marketplace first"
            description="Then define a search to start finding prospects."
            action={
              <Button variant="primary" href="/connectors">
                Go to connectors
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Prospects"
        description="Total Sales and Sales/Listing come from Etsy's real lifetime sales count for the shop."
        primaryAction={
          <div className="flex gap-2">
            {tab === "results" && filtered.length > 0 && (
              <Button
                variant="secondary"
                leadingIcon={<Download className="h-4 w-4" />}
                onClick={handleExportSelected}
              >
                {selectedIds.size > 0
                  ? `Export Selected (${selectedIds.size}) CSV`
                  : "Export All CSV"}
              </Button>
            )}
            <Button variant="primary" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setDrawerOpen(true)}>
              New search
            </Button>
          </div>
        }
      />

      {loadError && (
        <Alert variant="danger" title="Couldn't load Prospects" className="mb-6">
          {loadError}
        </Alert>
      )}

      {queuedMessage && (
        <Alert variant="success" title="Research queued" className="mb-6" onDismiss={() => setQueuedMessage(null)}>
          {queuedMessage}
        </Alert>
      )}

      <Tabs value={tab} onChange={(v) => setTab(v as "live" | "results" | "saved")}>
        <Tabs.List aria-label="Product Hunting Views">
          <Tabs.Trigger value="live">Live Product Hunting</Tabs.Trigger>
          <Tabs.Trigger value="results">Stream Discoveries ({filtered.length})</Tabs.Trigger>
          <Tabs.Trigger value="saved">Saved Streams ({searchConfigs.length})</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel value="live">
          <LiveSearchTab />
        </Tabs.Panel>

        <Tabs.Panel value="results">
          {/* Search Streams Filter Chips */}
          {searchConfigs.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-bold text-ink-tertiary">Search Stream:</span>
              <button
                type="button"
                onClick={() => setSearchFilter("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  searchFilter === "all" ? "bg-[#141B16] text-white" : "bg-[#F4F3EF] text-ink hover:bg-[#E3E6E0]"
                }`}
              >
                All searches
              </button>
              {searchConfigs.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSearchFilter(s.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    searchFilter === s.id ? "bg-[#141B16] text-white" : "bg-[#F4F3EF] text-ink hover:bg-[#E3E6E0]"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold text-ink-tertiary">Status:</span>
            {PROSPECT_STATUS_OPTIONS.map((opt) => {
              const isSelected = statusFilter.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleStatusFilter(opt.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    isSelected ? "bg-[#0E8F5D] text-white" : "bg-[#F4F3EF] text-ink hover:bg-[#E3E6E0]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <ResultsCount count={filtered.length} label="prospects" />
            <ActiveFilters filters={activeFilters} onRemove={removeFilter} onClearAll={clearFilters} />
          </div>

          <Card padding="sm">
            <Table<ProspectRow>
              aria-label="Prospects"
              columns={columns}
              rows={filtered}
              getRowId={(p) => p.id}
              loading={loading}
              sortKey={sortKey}
              sortDirection={sortDir}
              onSort={handleSort}
              selectedIds={selectedIds}
              onSelectRow={toggleSelectRow}
              onSelectAll={toggleSelectAll}
              emptyState={
                <EmptyState
                  icon={<SearchIcon />}
                  title="No prospects match"
                  description={
                    prospects.length === 0
                      ? "Define a search to start finding Etsy prospects matching your filters."
                      : "Try widening your search or status filters."
                  }
                  action={
                    prospects.length === 0 ? (
                      <Button variant="primary" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setDrawerOpen(true)}>
                        New search
                      </Button>
                    ) : undefined
                  }
                />
              }
            />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="saved">
          <div className="flex flex-col gap-4">
            {searchConfigs.map((sc) => {
              const freq = scheduleFrequencyFromCron(sc.scheduleCron);
              const isRunning = running === sc.id;
              const isSavingThis = savingSchedule === sc.id;

              return (
                <Card key={sc.id} padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">{sc.name}</span>
                      <Badge variant="neutral">{sc.connector?.label ?? "Etsy"}</Badge>
                    </div>
                    <div className="text-xs text-ink-secondary mt-1">
                      Keywords: {sc.keywords.join(", ")} · Price: ${sc.minPrice}–${sc.maxPrice} · Shop age: {sc.minShopAgeMonths}–{sc.maxShopAgeMonths}mo · Min reviews: {sc.minReviewCount}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Select
                      aria-label={`Schedule frequency for ${sc.name}`}
                      value={freq}
                      onChange={(e) => handleScheduleChange(sc.id, e.target.value as ScheduleFrequency)}
                      disabled={isSavingThis}
                      options={Object.entries(SCHEDULE_FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))}
                      className="text-xs w-36"
                    />

                    <Button
                      variant="secondary"
                      size="compact"
                      loading={isRunning}
                      onClick={() => handleRun(sc.id)}
                      className="text-xs shrink-0"
                    >
                      Run Now
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </Tabs.Panel>
      </Tabs>

      <NewSearchDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        connectors={connectors}
        onSubmit={handleCreateSearch}
      />
    </div>
  );
}
