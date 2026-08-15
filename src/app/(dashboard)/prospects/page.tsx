"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Search as SearchIcon, Radar } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Button, Card, Input, Select, Alert, Tabs, Heading, Text } from "@/components/ui";
import { Table, EmptyState, ResultsCount, FilterGroup, ActiveFilters, type Column } from "@/components/data";
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
  const [tab, setTab] = useState<"results" | "saved">("results");
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [searchConfigs, setSearchConfigs] = useState<SearchConfigSummary[]>([]);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState<string | null>(null);

  const [searchFilter, setSearchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<Set<ProspectStatus>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | undefined>(undefined);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateSearch(input: Parameters<typeof createSearchConfig>[0]) {
    await createSearchConfig(input);
    setDrawerOpen(false);
    await loadAll();
  }

  async function handleRun(searchConfigId: string) {
    setRunning(searchConfigId);
    try {
      await runSearch(searchConfigId);
    } catch {
      // Surfaced generically — a queue/Redis failure here doesn't block the rest of the page.
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
                onClick={() => downloadCsv(`sellersalt-prospects-${new Date().toISOString().slice(0, 10)}.csv`, filtered)}
              >
                Export CSV
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

      <Tabs value={tab} onChange={(v) => setTab(v as "results" | "saved")}>
        <Tabs.List aria-label="Prospects views">
          <Tabs.Trigger value="results">Results</Tabs.Trigger>
          <Tabs.Trigger value="saved">Saved Searches</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Panel value="results">
          {!loading && searchConfigs.length === 0 ? (
            <Card padding="lg" className="mt-4">
              <EmptyState
                icon={<SearchIcon />}
                title="No saved searches yet"
                description='Click "New search" to define keywords and filters — results appear here once a search runs.'
                action={
                  <Button variant="primary" onClick={() => setDrawerOpen(true)}>
                    New search
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  aria-label="Filter by search"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  options={[{ value: "all", label: "All searches" }, ...searchConfigs.map((s) => ({ value: s.id, label: s.name }))]}
                  className="!w-auto"
                />
                <FilterGroup label="Status" activeSummary={statusFilter.size > 0 ? `Status (${statusFilter.size})` : undefined}>
                  <div className="flex flex-col gap-2">
                    {PROSPECT_STATUS_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 text-body-sm text-ink">
                        <input
                          type="checkbox"
                          checked={statusFilter.has(opt.value)}
                          onChange={() => toggleStatusFilter(opt.value)}
                          className="h-[18px] w-[18px] rounded-xs border-line-strong accent-accent"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </FilterGroup>
                <ResultsCount count={filtered.length} label={filtered.length === 1 ? "prospect" : "prospects"} className="ml-auto" />
              </div>
              {activeFilters.length > 0 && <ActiveFilters filters={activeFilters} onRemove={() => clearFilters()} onClearAll={clearFilters} />}

              <Table<ProspectRow>
                aria-label="Prospects"
                columns={columns}
                rows={filtered}
                getRowId={(p) => p.id}
                sortKey={sortKey}
                sortDirection={sortDir}
                onSort={handleSort}
                loading={loading}
                density="compact"
                emptyState={
                  <EmptyState
                    title={prospects.length === 0 ? "No results yet" : "No results for these filters"}
                    description={
                      prospects.length === 0
                        ? 'Run a search from the Saved Searches tab — check the Jobs page for progress.'
                        : "Try clearing your filters."
                    }
                    action={prospects.length > 0 ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : undefined}
                  />
                }
              />
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="saved">
          {loading ? (
            <Text size="body-sm" color="secondary" className="mt-4">
              Loading…
            </Text>
          ) : searchConfigs.length === 0 ? (
            <Card padding="lg" className="mt-4">
              <EmptyState
                icon={<SearchIcon />}
                title='No saved searches yet — click "New search" to create one'
                action={
                  <Button variant="primary" onClick={() => setDrawerOpen(true)}>
                    New search
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {searchConfigs.map((s) => {
                const resultCount = prospects.filter((p) => p.searchConfigId === s.id).length;
                return (
                  <Card key={s.id} padding="md">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <Heading as="h3" size="h4">
                          {s.name}
                        </Heading>
                        <Text size="body-sm" color="secondary" className="mt-0.5">
                          {s.keywords.join(", ")} · ${s.minPrice}–${s.maxPrice} · {resultCount} result{resultCount === 1 ? "" : "s"}
                        </Text>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          aria-label={`Schedule for ${s.name}`}
                          value={scheduleFrequencyFromCron(s.scheduleCron)}
                          disabled={savingSchedule === s.id}
                          onChange={(e) => handleScheduleChange(s.id, e.target.value as ScheduleFrequency)}
                          options={Object.entries(SCHEDULE_FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))}
                          className="!w-auto"
                        />
                        <Button
                          variant="secondary"
                          leadingIcon={<Radar className="h-4 w-4" />}
                          onClick={() => handleRun(s.id)}
                          loading={running === s.id}
                        >
                          Run now
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
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
