"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Search as SearchIcon, Radar, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Button, Card, Input, Select, Alert, Tabs, Heading, Text, Badge, Dialog, HowItWorksGuide } from "@/components/ui";
import { Table, EmptyState, ResultsCount, ActiveFilters, type Column } from "@/components/data";
import { fetchProspects, updateProspect, type ProspectRow, type ProspectStatus } from "@/services/prospects";
import {
  fetchSearchConfigs,
  createSearchConfig,
  updateSearchConfigSchedule,
  deleteSearchConfig,
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
  const [tab, setTab] = useState<string>("live");
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

  // Stream Deletion Dialog state
  const [streamToDelete, setStreamToDelete] = useState<SearchConfigSummary | null>(null);
  const [isDeletingStream, setIsDeletingStream] = useState(false);

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

  async function handleConfirmDeleteStream() {
    if (!streamToDelete) return;
    setIsDeletingStream(true);
    try {
      await deleteSearchConfig(streamToDelete.id);
      setSearchConfigs((prev) => prev.filter((s) => s.id !== streamToDelete.id));
      setStreamToDelete(null);
    } catch (err: any) {
      alert("Failed to delete saved search: " + (err.message || "Unknown error"));
    } finally {
      setIsDeletingStream(false);
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

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setSortDir("desc");
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
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        return sortDir === "asc" ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
      });
    }
    return rows;
  }, [prospects, searchFilter, statusFilter, sortKey, sortDir]);

  // Selection handlers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  }

  function handleExportSelected() {
    const rowsToExport =
      selectedIds.size > 0 ? filtered.filter((r) => selectedIds.has(r.id)) : filtered;
    downloadCsv(`sellersalt-prospects-${Date.now()}.csv`, rowsToExport);
  }

  const columns: Column<ProspectRow>[] = buildProspectColumns({
    onToggleFavorite: handleToggleFavorite,
    onStatusChange: handleStatusChange,
    showSearchName:
      tab === "results" && searchFilter === "all"
        ? (row) => searchConfigs.find((s) => s.id === row.searchConfigId)?.name
        : undefined,
  });

  const activeFilters = [
    ...(searchFilter !== "all"
      ? [{ key: "search", label: `Search: ${searchConfigs.find((s) => s.id === searchFilter)?.name ?? ""}` }]
      : []),
    ...Array.from(statusFilter).map((s) => ({
      key: `status:${s}`,
      label: PROSPECT_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s,
    })),
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Contextual Guide */}
      <HowItWorksGuide
        title="How Saved Searches & Competitor Prospecting Work"
        description="Configure automated query streams that match price brackets, store age filters, and keyword niches across Etsy."
        steps={[
          {
            title: "1. Define Target Parameters",
            description: "Specify keyword queries, target retail price ranges, maximum store age, and review barriers.",
            badge: "Filter Blueprint",
          },
          {
            title: "2. Automated Scheduling",
            description: "Run on-demand or schedule background executions every 6 hours, daily, or weekly.",
            badge: "Cadence",
          },
          {
            title: "3. Direct Discovery Feed",
            description: "Discovered matching shops and listings automatically populate your prospect queue.",
            badge: "Live Queue",
          },
        ]}
      />

      <PageHeader
        title="Discovery &amp; Saved Searches"
        description="Automated query streams monitoring Etsy for breakthrough competitors and newly emerging stores."
        primaryAction={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="compact"
              onClick={handleExportSelected}
              disabled={filtered.length === 0}
              className="text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 inline" />
              {selectedIds.size > 0 ? `Export Selected (${selectedIds.size}) CSV` : "Export CSV"}
            </Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => setDrawerOpen(true)}
              className="text-xs bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5 inline" />
              New Saved Search
            </Button>
          </div>
        }
      />

      {queuedMessage && <Alert variant="info">{queuedMessage}</Alert>}
      {loadError && <Alert variant="danger">{loadError}</Alert>}

      <Tabs value={tab} onChange={(v: string) => setTab(v)}>
        <Tabs.List>
          <Tabs.Trigger value="live">Live Search</Tabs.Trigger>
          <Tabs.Trigger value="results">Results ({filtered.length})</Tabs.Trigger>
          <Tabs.Trigger value="saved">Saved Searches ({searchConfigs.length})</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel value="live">
          <LiveSearchTab />
        </Tabs.Panel>

        <Tabs.Panel value="results">
          <div className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ResultsCount count={filtered.length} />
              </div>
              <div className="flex items-center gap-2">
                {searchConfigs.length > 1 && (
                  <Select
                    aria-label="Filter by search"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    options={[
                      { value: "all", label: "All Searches" },
                      ...searchConfigs.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                    className="text-xs w-48"
                  />
                )}
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="p-3 border-b border-line bg-surface-muted">
                <ActiveFilters filters={activeFilters} onRemove={removeFilter} onClearAll={clearFilters} />
              </div>
            )}

            <Table<ProspectRow>
              aria-label="Prospects discovery results"
              rows={filtered}
              columns={columns}
              getRowId={(row) => row.id}
              sortKey={sortKey}
              sortDirection={sortDir}
              onSort={handleSort}
              selectedIds={selectedIds}
              onSelectRow={toggleSelect}
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
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="saved">
          <div className="flex flex-col gap-4">
            {searchConfigs.length === 0 ? (
              <Card padding="lg" className="border-line bg-white text-center py-12 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[#E7FAF1] text-[#0E8F5D] flex items-center justify-center mx-auto">
                  <Radar className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-ink">No Saved Searches</h3>
                <p className="text-xs text-ink-secondary max-w-md mx-auto">
                  Saved searches monitor specific keyword and price niches automatically on a recurring schedule.
                </p>
                <Button
                  variant="primary"
                  size="compact"
                  onClick={() => setDrawerOpen(true)}
                  className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create First Saved Search
                </Button>
              </Card>
            ) : (
              searchConfigs.map((sc) => {
                const freq = scheduleFrequencyFromCron(sc.scheduleCron);
                const isRunning = running === sc.id;
                const isSavingThis = savingSchedule === sc.id;

                return (
                  <Card key={sc.id} padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-line bg-white shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink">{sc.name}</span>
                        <Badge variant="neutral">{sc.connector?.label ?? "Etsy"}</Badge>
                        {sc.scheduleCron && (
                          <Badge variant="success" className="text-[10px]">
                            ⚡ {SCHEDULE_FREQUENCY_LABELS[freq]}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-ink-secondary mt-1">
                        Keywords: <strong className="text-ink">{sc.keywords.join(", ")}</strong> · Price: ${sc.minPrice}–${sc.maxPrice} · Shop age: {sc.minShopAgeMonths}–{sc.maxShopAgeMonths}mo · Min reviews: {sc.minReviewCount}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
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
                        className="text-xs"
                      >
                        Run Now
                      </Button>

                      <button
                        type="button"
                        onClick={() => setStreamToDelete(sc)}
                        className="p-2 rounded-lg text-ink-tertiary hover:text-danger hover:bg-danger-subtle border border-line transition shadow-2xs"
                        title="Delete Saved Search"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </Tabs.Panel>
      </Tabs>

      {/* Delete Stream Confirmation Dialog */}
      <Dialog
        open={Boolean(streamToDelete)}
        onClose={() => setStreamToDelete(null)}
        title="Delete Saved Search"
        description={`Are you sure you want to delete "${streamToDelete?.name}"? Scheduled recurring runs for this saved search will stop immediately.`}
        actions={
          <>
            <Button
              variant="secondary"
              size="compact"
              onClick={() => setStreamToDelete(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="compact"
              loading={isDeletingStream}
              onClick={handleConfirmDeleteStream}
              className="text-xs"
            >
              Delete Saved Search
            </Button>
          </>
        }
      />

      <NewSearchDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        connectors={connectors}
        onSubmit={handleCreateSearch}
      />
    </div>
  );
}
