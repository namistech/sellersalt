"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { ProspectTable, type ProspectRow } from "../prospect-table";

interface Connector {
  id: string;
  label: string;
  type: string;
}
interface SearchConfig {
  id: string;
  name: string;
  keywords: string[];
  minPrice: number;
  maxPrice: number;
  scheduleCron: string | null;
  createdAt: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  MANUAL: "Manual only",
  EVERY_6_HOURS: "Every 6 hours",
  DAILY: "Daily",
  WEEKLY: "Weekly",
};

function frequencyFromCron(cron: string | null): string {
  if (!cron) return "MANUAL";
  if (cron === "0 */6 * * *") return "EVERY_6_HOURS";
  if (cron === "0 6 * * *") return "DAILY";
  if (cron === "0 6 * * 1") return "WEEKLY";
  return "MANUAL";
}

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
];

function toCsv(rows: ProspectRow[]): string {
  const header = CSV_COLUMNS.map((c) => c.label).join(",");
  const body = rows
    .map((r) =>
      CSV_COLUMNS.map((c) => {
        const val = r[c.key];
        const str = val == null ? "" : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCsv(filename: string, rows: ProspectRow[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProspectsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [searchConfigs, setSearchConfigs] = useState<SearchConfig[]>([]);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    connectorId: "",
    name: "",
    keywords: "digital planner, crochet pattern PDF, svg bundle",
    minPrice: 10,
    maxPrice: 20,
    minShopAgeMonths: 12,
    maxShopAgeMonths: 24,
    minReviewCount: 20,
    scheduleFrequency: "MANUAL",
  });

  async function loadAll() {
    const [cRes, sRes, pRes] = await Promise.all([
      fetch("/api/connectors"),
      fetch("/api/search-configs"),
      fetch("/api/prospects"),
    ]);
    const [cData, sData, pData] = await Promise.all([cRes.json(), sRes.json(), pRes.json()]);
    setConnectors(cData.connectors ?? []);
    setSearchConfigs(sData.searchConfigs ?? []);
    setProspects(pData.prospects ?? []);
    if (!form.connectorId && cData.connectors?.length > 0) {
      setForm((f) => ({ ...f, connectorId: cData.connectors[0].id }));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateConfig(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/search-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create search.");
      return;
    }
    setShowForm(false);
    loadAll();
  }

  async function handleRun(searchConfigId: string) {
    setRunning(searchConfigId);
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchConfigId }),
    });
    setRunning(null);
    loadAll();
  }

  async function handleScheduleChange(searchConfigId: string, scheduleFrequency: string) {
    setSavingSchedule(searchConfigId);
    const res = await fetch(`/api/search-configs/${searchConfigId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleFrequency }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to update schedule.");
    }
    setSavingSchedule(null);
    loadAll();
  }

  async function handleToggleFavorite(id: string, next: boolean) {
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, isFavorite: next } : p)));
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
  }

  if (!loading && connectors.length === 0) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Prospects</h1>
        <p className="mb-6 text-sm text-muted">
          Connect a marketplace first, then define a search to start finding prospects.
        </p>
        <a href="/connectors" className="btn-primary">Go to connectors</a>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Prospects</h1>
          <p className="mt-1 text-sm text-muted">
            Results are grouped under the search that found them. Set a search to run on a
            schedule to build up trend history automatically — Total Sales and Sales/Listing
            come from Etsy's real lifetime sales count for the shop.
          </p>
        </div>
        <div className="flex gap-2">
          {prospects.length > 0 && (
            <button
              className="btn-secondary"
              onClick={() => downloadCsv(`anadash-prospects-${new Date().toISOString().slice(0, 10)}.csv`, prospects)}
            >
              <Download className="mr-1.5 inline h-4 w-4" />
              Export CSV
            </button>
          )}
          {!showForm && (
            <button className="btn-primary shrink-0" onClick={() => setShowForm(true)}>
              New search
            </button>
          )}
        </div>
      </header>

      {showForm && (
        <form onSubmit={handleCreateConfig} className="card mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Define a search</h2>

          <div>
            <label className="label">Connector</label>
            <div className="flex flex-wrap gap-2">
              {connectors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm({ ...form, connectorId: c.id })}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                    form.connectorId === c.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-line text-ink hover:border-ink"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Search name</label>
            <input
              className="input"
              required
              placeholder="Digital downloads - Q1"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Keywords (comma separated)</label>
            <input
              className="input"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="label">Min price ($)</label>
              <input type="number" className="input" value={form.minPrice}
                onChange={(e) => setForm({ ...form, minPrice: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Max price ($)</label>
              <input type="number" className="input" value={form.maxPrice}
                onChange={(e) => setForm({ ...form, maxPrice: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Min shop age (mo)</label>
              <input type="number" className="input" value={form.minShopAgeMonths}
                onChange={(e) => setForm({ ...form, minShopAgeMonths: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Max shop age (mo)</label>
              <input type="number" className="input" value={form.maxShopAgeMonths}
                onChange={(e) => setForm({ ...form, maxShopAgeMonths: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Min reviews</label>
              <input type="number" className="input" value={form.minReviewCount}
                onChange={(e) => setForm({ ...form, minReviewCount: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Run automatically</label>
              <select
                className="input"
                value={form.scheduleFrequency}
                onChange={(e) => setForm({ ...form, scheduleFrequency: e.target.value })}
              >
                {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Save search</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : searchConfigs.length === 0 ? (
        <p className="text-sm text-muted">No saved searches yet. Click "New search" to create one.</p>
      ) : (
        <div className="space-y-6">
          {searchConfigs.map((s) => {
            const rows = prospects.filter((p) => (p as any).searchConfigId === s.id);
            return (
              <div key={s.id} className="card">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink">{s.name}</div>
                    <div className="text-xs text-muted">
                      {s.keywords.join(", ")} · ${s.minPrice}–${s.maxPrice}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="input !w-auto py-1.5 text-xs"
                      value={frequencyFromCron(s.scheduleCron)}
                      disabled={savingSchedule === s.id}
                      onChange={(e) => handleScheduleChange(s.id, e.target.value)}
                    >
                      {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRun(s.id)}
                      disabled={running === s.id}
                      className="btn-secondary shrink-0"
                    >
                      {running === s.id ? "Queuing…" : "Run now"}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <ProspectTable
                    rows={rows}
                    onToggleFavorite={handleToggleFavorite}
                    emptyMessage='No results yet. Click "Run now" — check the Jobs page for progress.'
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
