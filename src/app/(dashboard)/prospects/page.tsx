"use client";

import { useEffect, useState } from "react";

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
}
interface Prospect {
  id: string;
  keyword: string;
  shopName: string;
  shopUrl: string;
  shopAgeMonths: number;
  reviewCount: number;
  activeListings: number;
  reviewRatio: number;
  reviewVelocity: number;
  listingTitle: string;
  listingUrl: string;
  price: number;
  status: string;
  createdAt: string;
}

export default function ProspectsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [searchConfigs, setSearchConfigs] = useState<SearchConfig[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
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
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
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
            Sourcing leads matched against your filters. Review Ratio and Review Velocity are
            proxy signals based on review volume — Etsy's public API doesn't expose true sales
            counts, so treat these as leads to verify, not confirmed winners.
          </p>
        </div>
        {!showForm && (
          <button className="btn-primary shrink-0" onClick={() => setShowForm(true)}>
            New search
          </button>
        )}
      </header>

      {showForm && (
        <form onSubmit={handleCreateConfig} className="card mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Define a search</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Connector</label>
              <select
                className="input"
                required
                value={form.connectorId}
                onChange={(e) => setForm({ ...form, connectorId: e.target.value })}
              >
                <option value="">Select…</option>
                {connectors.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
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

          <div className="w-40">
            <label className="label">Min reviews</label>
            <input type="number" className="input" value={form.minReviewCount}
              onChange={(e) => setForm({ ...form, minReviewCount: Number(e.target.value) })} />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Save search</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {searchConfigs.length > 0 && (
        <div className="card mb-6">
          <h2 className="mb-3 text-sm font-semibold text-ink">Saved searches</h2>
          <div className="divide-y divide-line">
            {searchConfigs.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="text-sm font-medium text-ink">{s.name}</div>
                  <div className="text-xs text-muted">
                    {s.keywords.join(", ")} · ${s.minPrice}–${s.maxPrice}
                  </div>
                </div>
                <button
                  onClick={() => handleRun(s.id)}
                  disabled={running === s.id}
                  className="btn-secondary"
                >
                  {running === s.id ? "Queuing…" : "Run now"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <h2 className="mb-3 text-sm font-semibold text-ink">Results ({prospects.length})</h2>
        {prospects.length === 0 ? (
          <p className="text-sm text-muted">
            No results yet. Save a search above, then hit "Run now" — results appear here once the
            job finishes (check the Jobs page for progress).
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Shop</th>
                <th className="py-2 pr-4">Shop age</th>
                <th className="py-2 pr-4">Reviews</th>
                <th className="py-2 pr-4">Listings</th>
                <th className="py-2 pr-4">Rev ratio</th>
                <th className="py-2 pr-4">Rev velocity</th>
                <th className="py-2 pr-4">Listing</th>
                <th className="py-2 pr-4">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {prospects.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-4">
                    <a href={p.shopUrl} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
                      {p.shopName}
                    </a>
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{p.shopAgeMonths}mo</td>
                  <td className="py-2 pr-4 tabular-nums">{p.reviewCount}</td>
                  <td className="py-2 pr-4 tabular-nums">{p.activeListings}</td>
                  <td className="py-2 pr-4 tabular-nums">{p.reviewRatio}</td>
                  <td className="py-2 pr-4 tabular-nums">{p.reviewVelocity}/mo</td>
                  <td className="py-2 pr-4 max-w-xs truncate">
                    <a href={p.listingUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      {p.listingTitle}
                    </a>
                  </td>
                  <td className="py-2 pr-4 tabular-nums">${p.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
