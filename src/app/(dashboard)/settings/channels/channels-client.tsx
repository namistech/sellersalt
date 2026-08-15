"use client";

import { useEffect, useState } from "react";
import {
  Store,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  Card,
  Button,
  Badge,
  Heading,
  Text,
  Alert,
  Divider,
} from "@/components/ui";

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
  ETSY_SELLER: "Etsy Seller Store",
  WOOCOMMERCE: "WooCommerce (Beta)",
  SHOPIFY: "Shopify (Beta)",
};

export function ChannelsClient() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ text: string; variant: "success" | "danger" | "warn" } | null>(null);
  const [showSecondaryChannels, setShowSecondaryChannels] = useState(false);

  // Secondary manual states
  const [shopifyShop, setShopifyShop] = useState("");
  const [wooStoreUrl, setWooStoreUrl] = useState("");

  async function loadChannels() {
    try {
      const res = await fetch("/api/seller-channels");
      const data = await res.json();
      setChannels(data.channels ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChannels();
    function handleFocus() {
      loadChannels();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");

    if (params.get("connected")) {
      setBannerMessage({ text: "Etsy shop connected successfully! Your shop data will begin syncing automatically.", variant: "success" });
      return;
    }
    if (!error) return;

    const ETSY_ERROR_MESSAGES: Record<string, string> = {
      limit_reached: "Your plan's connected store limit has been reached. Upgrade your package to link additional stores.",
      etsy_not_configured: "Etsy Seller App API credentials are not yet configured in Admin settings.",
      etsy_access_denied: "Etsy authorization was cancelled — you declined access on Etsy's page. Click Connect to try again.",
      etsy_authorization_failed: "Etsy declined this authorization request. This is usually a redirect URL or app-configuration mismatch on Etsy's side — contact support if it persists.",
      etsy_callback_incomplete: "Etsy's response was missing required information. Please try connecting again.",
      etsy_invalid_state: "This authorization link is invalid or has expired (links are valid for 15 minutes). Please try connecting again.",
      etsy_token_exchange_failed: "Etsy rejected the authorization code during token exchange. Please try connecting again — if this keeps happening, the app's redirect URL may be misconfigured.",
      etsy_no_shop_found: "We couldn't find an Etsy shop on this account. Make sure you're signing in with the Etsy account that owns your shop.",
      etsy_token_invalid: "Etsy issued a token but it failed verification. Please try connecting again.",
    };

    const variant = error === "limit_reached" ? "warn" : error === "etsy_access_denied" ? "warn" : "danger";
    setBannerMessage({
      text: ETSY_ERROR_MESSAGES[error] ?? "Could not complete Etsy connection. Please try again.",
      variant,
    });
  }, []);

  function handleConnectEtsy() {
    setConnecting(true);
    const win = window.open(
      "/api/seller-channels/etsy/connect",
      "etsy-connect",
      "width=620,height=760,noopener,noreferrer"
    );
    if (!win) {
      // Popup blocked — fall back to same-tab navigation so connection still completes.
      window.location.href = "/api/seller-channels/etsy/connect";
      return;
    }
    setBannerMessage({
      text: "Etsy authorization opened in a new tab. Approve access there, then return here — this list refreshes automatically.",
      variant: "success",
    });
    setConnecting(false);
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/seller-channels/${id}/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to trigger sync.");
      }
    } catch {
      alert("Network error during sync.");
    } finally {
      setSyncingId(null);
      loadChannels();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to disconnect this shop? Stored research data will be preserved, but automatic synchronization will stop.")) return;
    try {
      await fetch(`/api/seller-channels/${id}`, { method: "DELETE" });
      loadChannels();
    } catch {
      alert("Error disconnecting shop.");
    }
  }

  const etsyChannels = channels.filter((c) => c.platform === "ETSY_SELLER");
  const isEtsyConnected = etsyChannels.length > 0;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <Heading as="h1" size="h2">
          Connected Etsy Shops
        </Heading>
        <Text size="body-md" color="secondary" className="mt-1">
          Link your authenticated Etsy seller account to synchronize live transaction metrics, listing health, and store analytics.
        </Text>
      </div>

      {bannerMessage && (
        <Alert variant={bannerMessage.variant === "warn" ? "warning" : bannerMessage.variant}>
          {bannerMessage.text}
        </Alert>
      )}

      {/* Primary Etsy Connection Surface */}
      <Card padding="lg" className="border-line bg-surface shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line-subtle pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0E8F5D]/10 text-[#0E8F5D]">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink">Etsy Seller Store Integration</h3>
                {isEtsyConnected ? (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3 mr-1 inline" /> Active Connection
                  </Badge>
                ) : (
                  <Badge variant="neutral">
                    Disconnected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-ink-secondary mt-0.5">
                Official OAuth 2.0 PKCE authentication with the Etsy Open API v3.
              </p>
            </div>
          </div>

          <div>
            <Button
              variant="primary"
              onClick={handleConnectEtsy}
              loading={connecting}
              className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-sm"
            >
              {isEtsyConnected ? "Connect Another Shop" : "Connect Your Etsy Shop"}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Feature Entitlement Explanation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-ink-secondary">
          <div className="rounded-lg border border-line-subtle bg-surface-muted p-3 space-y-1">
            <div className="font-semibold text-ink flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#0E8F5D]" /> Secure Permissions
            </div>
            <p>Read-only access for shop receipts, active listings, and inventory counts.</p>
          </div>
          <div className="rounded-lg border border-line-subtle bg-surface-muted p-3 space-y-1">
            <div className="font-semibold text-ink flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-[#0E8F5D]" /> Auto Token Refresh
            </div>
            <p>Automatic background OAuth token rotation without interruption.</p>
          </div>
          <div className="rounded-lg border border-line-subtle bg-surface-muted p-3 space-y-1">
            <div className="font-semibold text-ink flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#FFB020]" /> Store Health Analysis
            </div>
            <p>Unlocks personalized store conversion analytics and listing audits.</p>
          </div>
        </div>
      </Card>

      {/* Connected Shops Table */}
      <Card padding="lg" className="border-line bg-surface shadow-xs space-y-4">
        <Heading as="h2" size="h4">
          Active Workspace Channels
        </Heading>

        {loading ? (
          <Text size="body-sm" color="tertiary">Loading connected stores...</Text>
        ) : channels.length === 0 ? (
          <div className="text-center py-8 rounded-lg border border-dashed border-line bg-surface-muted space-y-3">
            <Store className="h-8 w-8 text-ink-tertiary mx-auto opacity-50" />
            <div className="space-y-1">
              <Text size="body-sm" weight="semibold" color="primary">
                No Etsy store connected yet
              </Text>
              <Text size="body-sm" color="secondary" className="max-w-md mx-auto">
                Connecting your Etsy shop allows SellerSalt to correlate your research with your live store's actual performance.
              </Text>
            </div>
            <Button variant="primary" size="compact" onClick={handleConnectEtsy} className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs">
              Connect Etsy Shop
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-line-subtle">
            {channels.map((c) => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{c.label}</span>
                    <Badge variant="neutral">
                      {PLATFORM_LABELS[c.platform] ?? c.platform}
                    </Badge>
                  </div>
                  <a
                    href={c.storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                  >
                    {c.storeUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                  {c.lastSyncError ? (
                    <div className="text-xs text-danger flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Sync warning: {c.lastSyncError}
                    </div>
                  ) : (
                    <div className="text-xs text-ink-tertiary">
                      {c.lastSyncedAt ? `Last synchronized: ${new Date(c.lastSyncedAt).toLocaleString()}` : "Pending first synchronization"}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => handleSync(c.id)}
                    loading={syncingId === c.id}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync
                  </Button>
                  <Button
                    variant="destructive"
                    size="compact"
                    onClick={() => handleDelete(c.id)}
                    className="text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Disconnect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Secondary Marketplace Channels (Architecturally Preserved) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowSecondaryChannels((s) => !s)}
          className="text-xs font-semibold text-ink-tertiary hover:text-ink flex items-center gap-1 transition"
        >
          {showSecondaryChannels ? "Hide upcoming platform channels" : "Show future channels (Shopify / WooCommerce preview)"}
        </button>

        {showSecondaryChannels && (
          <div className="mt-4 rounded-lg border border-line bg-surface-muted p-5 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-ink">Upcoming Multi-Channel Integrations</h4>
              <p className="text-xs text-ink-secondary mt-0.5">
                SellerSalt is launching Etsy-first. Additional marketplace channels are in closed beta.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-ink-tertiary">
              <div className="rounded border border-line bg-surface p-3 space-y-1">
                <span className="font-semibold text-ink">Shopify Connector</span>
                <p>Order sync and cross-listing foundation (Enterprise Beta).</p>
              </div>
              <div className="rounded border border-line bg-surface p-3 space-y-1">
                <span className="font-semibold text-ink">WooCommerce Connector</span>
                <p>REST API connector for self-hosted WordPress stores.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
