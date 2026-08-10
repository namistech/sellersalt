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

// Real URLs. Netdrix's order form is one form shared for both platforms for
// now — swap in dedicated URLs later if you build separate ones.
// Fallback values, used only until an admin sets the real ones — that's the
// whole point of moving these into /admin instead of hardcoding them here.
const FALLBACK_SHOPIFY_AFFILIATE_URL = "https://shopify.pxf.io/9gO2v3";
const FALLBACK_ORDER_URL = "https://netdrix.com/?fluent-form=8";

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [wooStoreUrl, setWooStoreUrl] = useState("");
  const [shopifyShop, setShopifyShop] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [links, setLinks] = useState({
    shopify_affiliate_url: FALLBACK_SHOPIFY_AFFILIATE_URL,
    netdrix_shopify_order_url: FALLBACK_ORDER_URL,
    netdrix_woocommerce_order_url: FALLBACK_ORDER_URL,
  });

  async function loadChannels() {
    const res = await fetch("/api/seller-channels");
    const data = await res.json();
    setChannels(data.channels ?? []);
    setLoading(false);
  }

  async function loadLinks() {
    const res = await fetch("/api/settings/public");
    const data = await res.json();
    if (data.settings) {
      setLinks({
        shopify_affiliate_url: data.settings.shopify_affiliate_url || FALLBACK_SHOPIFY_AFFILIATE_URL,
        netdrix_shopify_order_url: data.settings.netdrix_shopify_order_url || FALLBACK_ORDER_URL,
        netdrix_woocommerce_order_url: data.settings.netdrix_woocommerce_order_url || FALLBACK_ORDER_URL,
      });
    }
  }

  useEffect(() => {
    loadChannels();
    loadLinks();
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) setBannerMessage("Store connected successfully.");
    if (params.get("error") === "limit_reached") setBannerMessage("Your plan's store limit is reached — upgrade to connect more.");
    if (params.get("error") === "invalid_store_url") setBannerMessage("That doesn't look like a valid store URL.");
    if (params.get("error") === "shopify_not_configured") setBannerMessage("Shopify isn't configured yet — an admin needs to add the Client ID/Secret first.");
    if (params.get("error")?.startsWith("shopify_")) setBannerMessage("Couldn't connect to Shopify — the connection was rejected or the code was invalid. Try again.");
  }, []);

  function handleConnectShopify(e: React.FormEvent) {
    e.preventDefault();
    if (!shopifyShop.trim()) return;
    setConnecting(true);
    window.location.href = `/api/seller-channels/shopify/connect?shop=${encodeURIComponent(shopifyShop.trim())}&label=${encodeURIComponent(shopifyShop.trim())}`;
  }

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
          <p className="mb-4 text-xs text-muted">
            You'll be taken to Shopify to log in and approve — nothing to copy or paste.
          </p>
          <form onSubmit={handleConnectShopify} className="mb-3 flex gap-2">
            <input
              className="input"
              required
              placeholder="mystore or mystore.myshopify.com"
              value={shopifyShop}
              onChange={(e) => setShopifyShop(e.target.value)}
            />
            <button type="submit" disabled={connecting} className="btn-primary shrink-0">
              {connecting ? "Redirecting…" : "Connect"}
            </button>
          </form>
          <a href={links.shopify_affiliate_url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
            <ExternalLink className="mr-1 inline h-3.5 w-3.5" />
            Don't have a Shopify store? Create one
          </a>
        </div>
      </div>

      <div className="mb-6 card">
        <h2 className="mb-3 text-sm font-semibold text-ink">Don't have a store yet?</h2>
        <div className="flex flex-wrap gap-2">
          <a href={`${links.netdrix_shopify_order_url}&ref=anadash_shopify`} className="btn-secondary">Order a custom Shopify store</a>
          <a href={`${links.netdrix_woocommerce_order_url}&ref=anadash_woocommerce`} className="btn-secondary">Order a custom WooCommerce store</a>
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
