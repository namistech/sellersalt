"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface Connector {
  id: string;
  type: string;
  label: string;
  status: string;
  scope: "platform" | "own";
  createdAt: string;
}

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

  const platformConnectors = connectors.filter((c) => c.scope === "platform");
  const ownConnectors = connectors.filter((c) => c.scope === "own");

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
    if (!confirm("Remove this connector? Your searches will fall back to SellerSalt's shared connection.")) return;
    await fetch(`/api/connectors/${id}`, { method: "DELETE" });
    loadConnectors();
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Connectors</h1>
        <p className="mt-1 text-sm text-muted">
          SellerSalt connects marketplaces for you — nothing to set up. This page is only for
          customers who want to use their own dedicated API key.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="card mb-6">
          <h2 className="mb-3 text-sm font-semibold text-ink">Available to you</h2>
          {platformConnectors.length === 0 ? (
            <p className="text-sm text-muted">
              No marketplace is connected yet — contact us if searches aren't working.
            </p>
          ) : (
            <div className="space-y-2">
              {platformConnectors.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm text-ink">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {c.type} — provided by SellerSalt, ready to use
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Your own connector (optional)</h2>
            <p className="text-xs text-muted">For dedicated rate limits instead of the shared connection above.</p>
          </div>
          {!showForm && (
            <button className="btn-secondary" onClick={() => setShowForm(true)}>
              Add your own
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="mb-4 max-w-md space-y-4 rounded-md border border-line p-3">
            <div>
              <label className="label" htmlFor="label">Label</label>
              <input
                id="label"
                className="input"
                placeholder="Etsy - My Own Key"
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
              />
            </div>
            <div>
              <label className="label" htmlFor="sharedSecret">Etsy Shared Secret</label>
              <input
                id="sharedSecret"
                className="input"
                required
                value={sharedSecret}
                onChange={(e) => setSharedSecret(e.target.value)}
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

        {ownConnectors.length === 0 ? (
          <p className="text-sm text-muted">You're using SellerSalt's shared connection — no own key added.</p>
        ) : (
          <div className="divide-y divide-line">
            {ownConnectors.map((c) => (
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
      </div>
    </div>
  );
}
