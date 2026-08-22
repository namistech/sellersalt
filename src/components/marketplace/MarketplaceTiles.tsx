"use client";

import React, { useState, useEffect } from "react";
import {
  Store,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Trash2,
  Sparkles,
  Zap,
  ShoppingBag,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Card, Badge, Button, Heading, Text, Alert } from "@/components/ui";

interface ConnectedChannel {
  id: string;
  platform: string;
  label: string;
  storeUrl: string;
  status: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
}

interface MarketplaceTilesProps {
  initialChannels?: ConnectedChannel[];
  title?: string;
  subtitle?: string;
}

export function MarketplaceTiles({
  initialChannels = [],
  title = "Marketplace Channels",
  subtitle = "Connect and manage your seller accounts across multi-channel ecommerce platforms.",
}: MarketplaceTilesProps) {
  const [channels, setChannels] = useState<ConnectedChannel[]>(initialChannels);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    text: string;
    variant: "success" | "danger" | "warn";
  } | null>(null);

  async function loadChannels() {
    try {
      const res = await fetch("/api/seller-channels");
      const data = await res.json();
      if (data.channels) {
        setChannels(data.channels);
      }
    } catch {
      // ignore
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
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const connected = params.get("connected");

    if (connected) {
      setBannerMessage({
        text: "Etsy shop connected successfully! Your shop data will begin syncing automatically.",
        variant: "success",
      });
      return;
    }

    if (!error) return;

    const ERROR_MESSAGES: Record<string, string> = {
      limit_reached: "Your plan's connected store limit has been reached. Upgrade your package to link additional stores.",
      etsy_not_configured: "Etsy Seller App API credentials are not yet configured.",
      etsy_access_denied: "Etsy authorization was cancelled — you declined access on Etsy's page. Click Connect to try again.",
      etsy_authorization_failed: "Etsy declined this authorization request. Ensure your shop is active on Etsy.",
      etsy_callback_incomplete: "Etsy's response was missing required information. Please try connecting again.",
      etsy_invalid_state: "This authorization link is invalid or has expired. Please try connecting again.",
      etsy_token_exchange_failed: "Etsy rejected the authorization code. Please try connecting again.",
      etsy_no_shop_found: "We couldn't find an Etsy shop on this account. Make sure you're signing in with the Etsy account that owns your shop.",
      etsy_token_invalid: "Etsy issued a token but it failed verification. Please try connecting again.",
    };

    setBannerMessage({
      text: ERROR_MESSAGES[error] ?? "Could not complete Etsy connection. Please try again.",
      variant: error === "limit_reached" || error === "etsy_access_denied" ? "warn" : "danger",
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
      window.location.href = "/api/seller-channels/etsy/connect";
      return;
    }
    setBannerMessage({
      text: "Etsy authorization opened in a new tab. Approve access on Etsy, then return here.",
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
    if (
      !confirm(
        "Are you sure you want to disconnect this shop? Stored research data will be preserved, but automatic synchronization will stop."
      )
    )
      return;
    try {
      await fetch(`/api/seller-channels/${id}`, { method: "DELETE" });
      loadChannels();
    } catch {
      alert("Error disconnecting shop.");
    }
  }

  const etsyChannels = channels.filter((c) => c.platform === "ETSY_SELLER");
  const primaryEtsyChannel = etsyChannels[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Heading as="h2" size="h3">
          {title}
        </Heading>
        <Text size="body-sm" color="secondary" className="mt-1">
          {subtitle}
        </Text>
      </div>

      {bannerMessage && (
        <Alert
          variant={
            bannerMessage.variant === "success"
              ? "success"
              : bannerMessage.variant === "warn"
              ? "warning"
              : "danger"
          }
        >
          {bannerMessage.text}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* ========================================================= */}
        {/* 1. ETSY — PRIMARY AVAILABLE MARKETPLACE */}
        {/* ========================================================= */}
        <Card
          padding="lg"
          className="md:col-span-2 lg:col-span-2 border-2 border-[#0E8F5D] bg-white shadow-sm flex flex-col justify-between relative overflow-hidden"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line-subtle">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#FFF3E8] border border-[#F1641E]/30 flex items-center justify-center text-[#F1641E] font-black text-xl shrink-0">
                  E
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-ink">Etsy Marketplace</h3>
                    <Badge variant="success" className="font-bold text-label-sm">
                      Available
                    </Badge>
                  </div>
                  <p className="text-sm text-ink-tertiary">
                    Official OpenAPI v3 Integration · Read &amp; Write Operations
                  </p>
                </div>
              </div>

              {primaryEtsyChannel ? (
                <Badge variant="success" className="font-bold flex items-center gap-1 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                </Badge>
              ) : (
                <Badge variant="neutral" className="text-sm">
                  Ready to Link
                </Badge>
              )}
            </div>

            {primaryEtsyChannel ? (
              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-label-sm font-bold text-ink-tertiary uppercase block">
                      Connected Storefront
                    </span>
                    <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                      <Store className="h-4 w-4 text-[#0E8F5D]" />
                      {primaryEtsyChannel.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={primaryEtsyChannel.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-ink-secondary hover:text-ink px-2.5 py-1.5 rounded-lg border border-line bg-white shadow-2xs hover:bg-surface-muted transition"
                    >
                      <span>View on Etsy</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <Button
                      variant="secondary"
                      size="compact"
                      loading={syncingId === primaryEtsyChannel.id}
                      onClick={() => handleSync(primaryEtsyChannel.id)}
                      className="text-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync
                    </Button>
                    <Button
                      variant="secondary"
                      size="compact"
                      onClick={() => handleDelete(primaryEtsyChannel.id)}
                      className="text-sm text-danger hover:bg-danger/10 border-danger/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-line-subtle text-sm text-ink-secondary">
                  <div>
                    <span className="text-label-sm text-ink-tertiary block">Status</span>
                    <span className="font-semibold text-[#0E8F5D]">
                      {primaryEtsyChannel.status === "ACTIVE"
                        ? "Active & Synchronizing"
                        : "Needs Attention: Reconnect"}
                    </span>
                  </div>
                  <div>
                    <span className="text-label-sm text-ink-tertiary block">Last Synchronized</span>
                    <span className="font-medium text-ink">
                      {primaryEtsyChannel.lastSyncedAt
                        ? new Date(primaryEtsyChannel.lastSyncedAt).toLocaleString()
                        : "Pending initial sync"}
                    </span>
                  </div>
                  <div>
                    <span className="text-label-sm text-ink-tertiary block">Capabilities</span>
                    <span className="font-medium text-ink">Search, Intelligence, Drafts</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-ink-secondary">
                <p className="leading-relaxed">
                  Connect your authenticated Etsy seller shop to synchronize live sales metrics, monitor listing search rank, generate SEO-optimized listings, and create local or remote drafts with 1-click human approval.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-ink font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0E8F5D]" /> Product &amp; Niche Opportunity Radar
                  </div>
                  <div className="flex items-center gap-1.5 text-ink font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0E8F5D]" /> Competitor Tracking &amp; Sales Velocity
                  </div>
                  <div className="flex items-center gap-1.5 text-ink font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0E8F5D]" /> 13-Tag SEO Listing Optimization
                  </div>
                  <div className="flex items-center gap-1.5 text-ink font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#0E8F5D]" /> Chrome Extension Live Integration
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
            <Text size="meta" color="tertiary">
              {primaryEtsyChannel ? "Etsy OpenAPI v3 Connected" : "Requires Etsy seller account login"}
            </Text>

            {primaryEtsyChannel ? (
              <Button
                variant="secondary"
                size="compact"
                onClick={handleConnectEtsy}
                loading={connecting}
                className="text-xs font-semibold"
              >
                + Connect Another Shop
              </Button>
            ) : (
              <Button
                variant="primary"
                size="compact"
                onClick={handleConnectEtsy}
                loading={connecting}
                className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold text-xs px-4 py-2"
              >
                ⚡ Connect Etsy Shop →
              </Button>
            )}
          </div>
        </Card>

        {/* ========================================================= */}
        {/* 2. AMAZON — COMING SOON */}
        {/* ========================================================= */}
        <Card
          padding="lg"
          className="border-line bg-[#FAFAF8]/70 shadow-2xs opacity-85 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#FF9900]/15 border border-[#FF9900]/30 flex items-center justify-center text-[#FF9900] font-black text-sm">
                  a
                </div>
                <h3 className="text-sm font-bold text-ink">Amazon</h3>
              </div>
              <Badge variant="neutral" className="text-label-sm">
                Coming Soon
              </Badge>
            </div>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Amazon Seller Central integration for Best Sellers Rank (BSR) tracking, search frequency rank, and FBA fee calculations.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-sm text-ink-tertiary">
            <span>Amazon SP-API</span>
            <Button variant="secondary" size="compact" disabled className="text-label-sm h-7 opacity-60">
              Coming Soon
            </Button>
          </div>
        </Card>

        {/* ========================================================= */}
        {/* 3. EBAY — COMING SOON */}
        {/* ========================================================= */}
        <Card
          padding="lg"
          className="border-line bg-[#FAFAF8]/70 shadow-2xs opacity-85 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#0064D2]/15 border border-[#0064D2]/30 flex items-center justify-center text-[#0064D2] font-black text-sm">
                  e
                </div>
                <h3 className="text-sm font-bold text-ink">eBay</h3>
              </div>
              <Badge variant="neutral" className="text-label-sm">
                Coming Soon
              </Badge>
            </div>
            <p className="text-sm text-ink-secondary leading-relaxed">
              eBay marketplace connector for multi-channel inventory cross-listing and sell-through rate analysis.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-sm text-ink-tertiary">
            <span>eBay Buy &amp; Sell API</span>
            <Button variant="secondary" size="compact" disabled className="text-label-sm h-7 opacity-60">
              Coming Soon
            </Button>
          </div>
        </Card>

        {/* ========================================================= */}
        {/* 4. TIKTOK SHOP — COMING SOON */}
        {/* ========================================================= */}
        <Card
          padding="lg"
          className="border-line bg-[#FAFAF8]/70 shadow-2xs opacity-85 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-black/10 border border-black/20 flex items-center justify-center text-black font-black text-sm">
                  TT
                </div>
                <h3 className="text-sm font-bold text-ink">TikTok Shop</h3>
              </div>
              <Badge variant="neutral" className="text-label-sm">
                Coming Soon
              </Badge>
            </div>
            <p className="text-sm text-ink-secondary leading-relaxed">
              TikTok Shop creator intelligence, trending affiliate products, viral GMV tracking, and video conversion analytics.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-sm text-ink-tertiary">
            <span>TikTok Partner API</span>
            <Button variant="secondary" size="compact" disabled className="text-label-sm h-7 opacity-60">
              Coming Soon
            </Button>
          </div>
        </Card>

        {/* ========================================================= */}
        {/* 5. WALMART — COMING SOON */}
        {/* ========================================================= */}
        <Card
          padding="lg"
          className="border-line bg-[#FAFAF8]/70 shadow-2xs opacity-85 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#0071DC]/15 border border-[#0071DC]/30 flex items-center justify-center text-[#0071DC] font-black text-sm">
                  W
                </div>
                <h3 className="text-sm font-bold text-ink">Walmart</h3>
              </div>
              <Badge variant="neutral" className="text-label-sm">
                Coming Soon
              </Badge>
            </div>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Walmart Marketplace integration for Buy Box price intelligence, catalog synchronization, and fulfillment analytics.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-line-subtle flex items-center justify-between text-sm text-ink-tertiary">
            <span>Walmart Marketplace API</span>
            <Button variant="secondary" size="compact" disabled className="text-label-sm h-7 opacity-60">
              Coming Soon
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
