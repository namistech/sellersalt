"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Trash2, ExternalLink } from "lucide-react";

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

// Placeholders — swap for real URLs once available (Shopify affiliate link,
// and real Netdrix order-form URLs for custom store builds).
const SHOPIFY_AFFILIATE_URL = "https://www.shopify.com/";
const ORDER_SHOPIFY_STORE_URL = "mailto:hello@netdrix.com?subject=Order%20a%20custom%20Shopify%20store";
const ORDER_WOOCOMMERCE_STORE_URL = "mailto:hello@netdrix.com?subject=Order%20a%20custom%20WooCommerce%20store";

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [wooStoreUrl, setWooStoreUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  async function loadChannels() {
    const res = await fetch("/api/seller-channels");
    const data = await res.json();
    setChannels(data.channels ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadChannels();
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) setBannerMessage("Store connected successfully.");
    if (params.get("error") === "limit_reached") setBannerMessage("Your plan's store limit is reached — upgrade to connect more.");
    if (params.get("error") === "invalid_store_url") setBannerMessage("That doesn't look like a valid store URL.");
  }, []);

  function handleConnectWoo(e: React.FormEvent) {
    e.preventDefault();
    if (!wooStoreUrl.trim()) return;
    setConnecting(true);
    // Full-page navigation, not fetch — this is a real redirect to the
    // customer's own store login/approval screen, not an API call.
    window.location.href = `/api/seller-channels/woocommerce/connect?storeUrl=${encodeURIComponent(wooStoreUrl.trim())}&label=${encodeURIComponent(wooStoreUrl.trim())}`;
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
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Connected stores</h1>
        <p className="mt-1 text-sm text-muted">
          Connect your own shops to see them in your Unified Analytics dashboard.
        </p>
      </header>

      {bannerMessage && (
        <div className="card mb-6">
          <p className="text-sm text-ink">{bannerMessage}</p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-1 text-sm font-semibold text-ink">Connect WooCommerce</h2>
          <p className="mb-4 text-xs text-muted">
            You'll be taken to your own store to log in and approve — nothing to copy or paste.
          </p>
          <form onSubmit={handleConnectWoo} className="flex gap-2">
            <input
              className="input"
              required
              placeholder="https://mystore.com"
              value={wooStoreUrl}
              onChange={(e) => setWooStoreUrl(e.target.value)}
            />
            <button type="submit" disabled={connecting} className="btn-primary shrink-0">
              {connecting ? "Redirecting…" : "Connect"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="mb-1 text-sm font-semibold text-ink">Connect Shopify</h2>
          <p className="mb-4 text-xs text-muted">Coming soon — needs a one-time app registration on our side.</p>
          <div className="flex flex-wrap gap-2">
            <a href={SHOPIFY_AFFILIATE_URL} target="_blank" rel="noreferrer" className="btn-secondary">
              <ExternalLink className="mr-1.5 inline h-4 w-4" />
              Create a Shopify store
            </a>
          </div>
        </div>
      </div>

      <div className="mb-6 card">
        <h2 className="mb-3 text-sm font-semibold text-ink">Don't have a store yet?</h2>
        <div className="flex flex-wrap gap-2">
          <a href={ORDER_SHOPIFY_STORE_URL} className="btn-secondary">Order a custom Shopify store</a>
          <a href={ORDER_WOOCOMMERCE_STORE_URL} className="btn-secondary">Order a custom WooCommerce store</a>
        </div>
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
