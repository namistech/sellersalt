"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";

interface Channel {
  id: string;
  platform: string;
  label: string;
  storeUrl: string;
  status: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  WOOCOMMERCE: "WooCommerce",
  SHOPIFY: "Shopify",
  ETSY_SELLER: "Etsy (your shop)",
  EBAY_SELLER: "eBay (your shop)",
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", storeUrl: "", consumerKey: "", consumerSecret: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function loadChannels() {
    const res = await fetch("/api/seller-channels");
    const data = await res.json();
    setChannels(data.channels ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadChannels();
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/seller-channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "WOOCOMMERCE",
        label: form.label || form.storeUrl,
        storeUrl: form.storeUrl,
        credentials: { consumerKey: form.consumerKey, consumerSecret: form.consumerSecret },
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to connect.");
      return;
    }
    setShowForm(false);
    setForm({ label: "", storeUrl: "", consumerKey: "", consumerSecret: "" });
    loadChannels();
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    await fetch(`/api/seller-channels/${id}/sync`, { method: "POST" });
    setSyncingId(null);
    loadChannels();
  }

  async function handleDelete(id: string) {
    if (!confirm("Disconnect this store? Its order history stays, but it'll stop syncing.")) return;
    await fetch(`/api/seller-channels/${id}`, { method: "DELETE" });
    loadChannels();
  }

  return (
    <div>
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Connected stores</h1>
          <p className="mt-1 text-sm text-muted">
            Connect your own shops to see them in your Unified Analytics dashboard.
          </p>
        </div>
        {!showForm && (
          <button className="btn-primary shrink-0" onClick={() => setShowForm(true)}>
            Connect a store
          </button>
        )}
      </header>

      {showForm && (
        <form onSubmit={handleConnect} className="card mb-6 max-w-lg space-y-4">
          <h2 className="text-sm font-semibold text-ink">Connect WooCommerce</h2>
          <p className="text-xs text-muted">
            In your WordPress admin: WooCommerce → Settings → Advanced → REST API → Add key
            (with Read permissions). Paste the key and secret below.
          </p>
          <div>
            <label className="label" htmlFor="label">Label</label>
            <input id="label" className="input" placeholder="My WooCommerce Store" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="storeUrl">Store URL</label>
            <input id="storeUrl" className="input" required placeholder="https://mystore.com" value={form.storeUrl} onChange={(e) => setForm({ ...form, storeUrl: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="consumerKey">Consumer Key</label>
            <input id="consumerKey" className="input" required value={form.consumerKey} onChange={(e) => setForm({ ...form, consumerKey: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="consumerSecret">Consumer Secret</label>
            <input id="consumerSecret" type="password" className="input" required value={form.consumerSecret} onChange={(e) => setForm({ ...form, consumerSecret: e.target.value })} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Testing connection…" : "Connect"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card mb-6 opacity-60">
        <h2 className="mb-1 text-sm font-semibold text-ink">Shopify &amp; Etsy (your shop)</h2>
        <p className="text-sm text-muted">Coming soon — needs a store-authorization flow specific to each platform.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : channels.length === 0 ? (
        <p className="text-sm text-muted">No stores connected yet.</p>
      ) : (
        <div className="card divide-y divide-line">
          {channels.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <div className="text-sm font-medium text-ink">
                  {c.label} <span className="badge bg-accent-soft text-accent">{PLATFORM_LABELS[c.platform] ?? c.platform}</span>
                </div>
                <div className="text-xs text-muted">{c.storeUrl}</div>
                {c.lastSyncError ? (
                  <div className="mt-0.5 text-xs text-danger">Last sync failed: {c.lastSyncError}</div>
                ) : (
                  <div className="mt-0.5 text-xs text-muted">
                    {c.lastSyncedAt ? `Last synced ${new Date(c.lastSyncedAt).toLocaleString()}` : "Not synced yet"}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleSync(c.id)} disabled={syncingId === c.id} className="text-muted hover:text-ink" aria-label="Sync now" title="Sync now">
                  <RefreshCw className={`h-4 w-4 ${syncingId === c.id ? "animate-spin" : ""}`} />
                </button>
                <button onClick={() => handleDelete(c.id)} className="text-muted hover:text-danger" aria-label="Disconnect" title="Disconnect">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
