"use client";

import { useEffect, useState } from "react";

interface Connector {
  id: string;
  type: string;
  label: string;
  status: string;
  createdAt: string;
}

const AVAILABLE_TYPES = [
  { type: "ETSY", name: "Etsy", available: true },
  { type: "EBAY", name: "eBay", available: false },
];

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadConnectors() {
    const res = await fetch("/api/connectors");
    const data = await res.json();
    setConnectors(data.connectors ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadConnectors();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/connectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ETSY",
        label: label || "Etsy",
        credentials: { apiKey, sharedSecret },
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to add connector.");
      return;
    }
    setShowForm(false);
    setLabel("");
    setApiKey("");
    setSharedSecret("");
    loadConnectors();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this connector? Existing prospect data is kept, but scheduled runs using it will stop.")) return;
    await fetch(`/api/connectors/${id}`, { method: "DELETE" });
    loadConnectors();
  }

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Connectors</h1>
          <p className="mt-1 text-sm text-muted">Connect marketplaces to source prospects from.</p>
        </div>
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            Add connector
          </button>
        )}
      </header>

      {showForm && (
        <form onSubmit={handleAdd} className="card mb-6 max-w-md space-y-4">
          <h2 className="text-sm font-semibold text-ink">Connect Etsy</h2>
          <div>
            <label className="label" htmlFor="label">Label</label>
            <input
              id="label"
              className="input"
              placeholder="Etsy - Netdrix Sourcing"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="apiKey">Etsy API key (keystring)</label>
            <input
              id="apiKey"
              className="input"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Etsy Developer App keystring"
            />
            <p className="mt-1 text-xs text-muted">
              Stored encrypted. From your Etsy Developer App dashboard.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="sharedSecret">Etsy Shared Secret</label>
            <input
              id="sharedSecret"
              className="input"
              required
              value={sharedSecret}
              onChange={(e) => setSharedSecret(e.target.value)}
              placeholder="Paste your Etsy Developer App shared secret"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Testing connection…" : "Connect"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : connectors.length === 0 ? (
        <p className="text-sm text-muted">No connectors yet. Add one to get started.</p>
      ) : (
        <div className="card divide-y divide-line">
          {connectors.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <div className="text-sm font-medium text-ink">{c.label}</div>
                <div className="text-xs text-muted">{c.type} · connected {new Date(c.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${c.status === "ACTIVE" ? "bg-green-50 text-success" : "bg-red-50 text-danger"}`}>
                  {c.status}
                </span>
                <button onClick={() => handleDelete(c.id)} className="text-sm text-muted hover:text-danger">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-ink">Coming in phase 2</h2>
        <div className="grid grid-cols-3 gap-4">
          {AVAILABLE_TYPES.filter((t) => !t.available).map((t) => (
            <div key={t.type} className="card opacity-50">
              <div className="text-sm font-medium text-ink">{t.name}</div>
              <div className="mt-1 text-xs text-muted">Not yet available</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}