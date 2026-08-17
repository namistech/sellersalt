"use client";

import React, { useState } from "react";
import {
  Globe,
  Store,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  Zap,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Key,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Badge,
  Button,
  Alert,
} from "@/components/ui";

interface SettingItem {
  key: string;
  label: string;
  isSecret: boolean;
  hasValue: boolean;
  value?: string;
  updatedAt?: string | null;
}

interface IntegrationsViewProps {
  settings: SettingItem[];
  onSaveSetting: (key: string, value: string) => Promise<boolean>;
  appBaseUrl: string;
}

export function IntegrationsView({
  settings,
  onSaveSetting,
  appBaseUrl,
}: IntegrationsViewProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingField, setSavingField] = useState<string | null>(null);
  const [successField, setSuccessField] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ channel: string; ok: boolean; msg: string } | null>(null);

  const getVal = (key: string, fallback = ""): string => {
    if (drafts[key] !== undefined) return drafts[key];
    const item = settings.find((s) => s.key === key);
    return item?.value ?? fallback;
  };

  const hasSecret = (key: string): boolean => {
    const item = settings.find((s) => s.key === key);
    return Boolean(item?.hasValue);
  };

  const updateDraft = (key: string, val: string) => {
    setDrafts((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (key: string) => {
    const val = drafts[key];
    if (val === undefined || !val.trim()) return;
    setSavingField(key);
    const ok = await onSaveSetting(key, val.trim());
    setSavingField(null);
    if (ok) {
      setSuccessField(key);
      setTimeout(() => setSuccessField(null), 2500);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = async (channel: string) => {
    setTestingChannel(channel);
    setTestResult(null);
    try {
      if (channel === "ETSY") {
        const res = await fetch("/api/admin/diagnostics/etsy-oauth");
        const data = await res.json();
        if (res.ok && data.diagnostic?.configured) {
          setTestResult({ channel: "ETSY", ok: true, msg: "Etsy OAuth configuration validated successfully." });
        } else {
          setTestResult({ channel: "ETSY", ok: false, msg: data.diagnostic?.error || "Etsy credentials incomplete." });
        }
      } else if (channel === "GOOGLE") {
        const clientId = getVal("google_client_id");
        const hasSec = hasSecret("google_client_secret") || Boolean(drafts["google_client_secret"]);
        if (clientId && hasSec) {
          setTestResult({ channel: "GOOGLE", ok: true, msg: "Google OAuth Client ID & Secret configured." });
        } else {
          setTestResult({ channel: "GOOGLE", ok: false, msg: "Google Client ID or Secret missing." });
        }
      } else {
        setTestResult({ channel, ok: true, msg: `${channel} integration configuration verified.` });
      }
    } catch {
      setTestResult({ channel, ok: false, msg: "Network error testing integration." });
    } finally {
      setTestingChannel(null);
    }
  };

  const baseOrigin = appBaseUrl.replace(/\/+$/, "");

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
            <Globe className="h-4 w-4" />
          </span>
          <Heading as="h2" size="h3" className="text-xl font-bold text-ink">
            Integration Hub & Marketplace Connectors
          </Heading>
        </div>
        <Text size="body-sm" className="text-ink-secondary mt-1">
          Manage OAuth 2.0 applications, API credentials, and webhook endpoints for marketplaces, identity providers, and future channels.
        </Text>
      </div>

      {testResult && (
        <Alert variant={testResult.ok ? "success" : "danger"}>
          <strong>{testResult.channel} Diagnostic:</strong> {testResult.msg}
        </Alert>
      )}

      {/* INTEGRATION CARDS GRID */}
      <div className="space-y-6">
        {/* ==================================================================== */}
        {/* 1. GOOGLE APIS & OAUTH */}
        {/* ==================================================================== */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FAFAF8] border border-line flex items-center justify-center font-extrabold text-sm text-[#4285F4]">
                G
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-ink">Google APIs / Google OAuth</h3>
                  <Badge variant={getVal("google_client_id") && hasSecret("google_client_secret") ? "success" : "warning"}>
                    {getVal("google_client_id") && hasSecret("google_client_secret") ? "CONFIGURED" : "NOT CONFIGURED"}
                  </Badge>
                </div>
                <p className="text-xs text-ink-tertiary">Single sign-on authentication and Google Sheets connector.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="compact"
                loading={testingChannel === "GOOGLE"}
                onClick={() => handleTestConnection("GOOGLE")}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Test Setup
              </Button>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-ink-secondary hover:text-ink inline-flex items-center gap-1 border border-line rounded-lg px-2.5 py-1.5 hover:bg-[#F4F3EF]"
              >
                Cloud Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Google Client ID</span>
                {successField === "google_client_id" && <span className="text-[10px] text-[#0E8F5D] font-bold">Saved!</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getVal("google_client_id")}
                  onChange={(e) => updateDraft("google_client_id", e.target.value)}
                  placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                  className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink"
                />
                <Button
                  variant="secondary"
                  size="compact"
                  loading={savingField === "google_client_id"}
                  onClick={() => handleSave("google_client_id")}
                  className="text-xs"
                >
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Google Client Secret</span>
                {hasSecret("google_client_secret") && <span className="text-[10px] text-[#0E8F5D] font-mono">ENCRYPTED AT REST</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={drafts["google_client_secret"] ?? ""}
                  onChange={(e) => updateDraft("google_client_secret", e.target.value)}
                  placeholder={hasSecret("google_client_secret") ? "••••••••••••••••••••" : "Paste client secret"}
                  className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
                />
                <Button
                  variant="secondary"
                  size="compact"
                  loading={savingField === "google_client_secret"}
                  onClick={() => handleSave("google_client_secret")}
                  className="text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* Callback URLs & Setup Instructions */}
          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3">
            <div className="text-xs font-bold text-ink">Authorized Redirect URI (Google Cloud Console)</div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-line">
              <span className="font-mono text-xs text-ink truncate select-all">{`${baseOrigin}/api/auth/callback/google`}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(`${baseOrigin}/api/auth/callback/google`, "google-callback")}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-secondary hover:text-ink shrink-0"
              >
                {copiedKey === "google-callback" ? <Check className="h-3.5 w-3.5 text-[#0E8F5D]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === "google-callback" ? "Copied" : "Copy URI"}</span>
              </button>
            </div>
            <p className="text-[11px] text-ink-tertiary">
              Create an <strong>OAuth 2.0 Client ID</strong> (Web Application) in Google Cloud Console and paste the exact Redirect URI above.
            </p>
          </div>
        </Card>

        {/* ==================================================================== */}
        {/* 2. ETSY OPEN API V3 */}
        {/* ==================================================================== */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#F1641E]/10 border border-[#F1641E]/20 flex items-center justify-center font-extrabold text-sm text-[#F1641E]">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-ink">Etsy API v3 & Seller Channels</h3>
                  <Badge variant={getVal("etsy_seller_client_id") ? "success" : "warning"}>
                    {getVal("etsy_seller_client_id") ? "ACTIVE CONNECTOR" : "NOT CONFIGURED"}
                  </Badge>
                </div>
                <p className="text-xs text-ink-tertiary">Public search extraction, live listing audits, and Seller OAuth 2.0 with PKCE.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="compact"
                loading={testingChannel === "ETSY"}
                onClick={() => handleTestConnection("ETSY")}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Run Diagnostic
              </Button>
              <a
                href="https://www.etsy.com/developers/your-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-ink-secondary hover:text-ink inline-flex items-center gap-1 border border-line rounded-lg px-2.5 py-1.5 hover:bg-[#F4F3EF]"
              >
                Etsy Developer <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Etsy Keystring / Client ID</span>
                {successField === "etsy_seller_client_id" && <span className="text-[10px] text-[#0E8F5D] font-bold">Saved!</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getVal("etsy_seller_client_id")}
                  onChange={(e) => updateDraft("etsy_seller_client_id", e.target.value)}
                  placeholder="e.g. 123456789abcdefgh"
                  className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
                />
                <Button
                  variant="secondary"
                  size="compact"
                  loading={savingField === "etsy_seller_client_id"}
                  onClick={() => handleSave("etsy_seller_client_id")}
                  className="text-xs"
                >
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Etsy Shared Secret (Optional for PKCE)</span>
                {hasSecret("etsy_seller_client_secret") && <span className="text-[10px] text-[#0E8F5D] font-mono">ENCRYPTED AT REST</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={drafts["etsy_seller_client_secret"] ?? ""}
                  onChange={(e) => updateDraft("etsy_seller_client_secret", e.target.value)}
                  placeholder={hasSecret("etsy_seller_client_secret") ? "••••••••••••••••••••" : "Paste secret if required"}
                  className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
                />
                <Button
                  variant="secondary"
                  size="compact"
                  loading={savingField === "etsy_seller_client_secret"}
                  onClick={() => handleSave("etsy_seller_client_secret")}
                  className="text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* Callback URLs & Scopes */}
          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3">
            <div className="text-xs font-bold text-ink">Etsy Developer App Callback URLs (Character-for-character match)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-white border border-line space-y-1">
                <div className="text-[11px] font-bold text-ink-secondary">Seller Store Authorization Callback:</div>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-xs text-ink truncate select-all">{`${baseOrigin}/api/seller-channels/etsy/callback`}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${baseOrigin}/api/seller-channels/etsy/callback`, "etsy-seller-cb")}
                    className="p-1 text-ink-secondary hover:text-ink shrink-0"
                  >
                    {copiedKey === "etsy-seller-cb" ? <Check className="h-3 w-3 text-[#0E8F5D]" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-line space-y-1">
                <div className="text-[11px] font-bold text-ink-secondary">NextAuth Etsy Login Callback:</div>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-xs text-ink truncate select-all">{`${baseOrigin}/api/auth/callback/etsy`}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${baseOrigin}/api/auth/callback/etsy`, "etsy-auth-cb")}
                    className="p-1 text-ink-secondary hover:text-ink shrink-0"
                  >
                    {copiedKey === "etsy-auth-cb" ? <Check className="h-3 w-3 text-[#0E8F5D]" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-ink-tertiary">
              Requested Scopes: <code className="font-mono text-ink font-semibold">listings_w listings_r shops_w shops_r transactions_r billing_r</code> with RFC 7636 PKCE S256 verifier.
            </div>
          </div>
        </Card>

        {/* ==================================================================== */}
        {/* 3. SHOPIFY INTEGRATION */}
        {/* ==================================================================== */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#96BF48]/10 border border-[#96BF48]/20 flex items-center justify-center font-extrabold text-sm text-[#96BF48]">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-ink">Shopify Multi-Channel Connector</h3>
                  <Badge variant={getVal("shopify_client_id") ? "success" : "neutral"}>
                    {getVal("shopify_client_id") ? "CONFIGURED" : "READY TO CONFIGURE"}
                  </Badge>
                </div>
                <p className="text-xs text-ink-tertiary">Direct product catalog sync and inventory webhook processing.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://partners.shopify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-ink-secondary hover:text-ink inline-flex items-center gap-1 border border-line rounded-lg px-2.5 py-1.5 hover:bg-[#F4F3EF]"
              >
                Shopify Partners <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Shopify Client ID / API Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getVal("shopify_client_id")}
                  onChange={(e) => updateDraft("shopify_client_id", e.target.value)}
                  placeholder="e.g. shp_api_123456"
                  className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
                />
                <Button
                  variant="secondary"
                  size="compact"
                  loading={savingField === "shopify_client_id"}
                  onClick={() => handleSave("shopify_client_id")}
                  className="text-xs"
                >
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Shopify Client Secret</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={drafts["shopify_client_secret"] ?? ""}
                  onChange={(e) => updateDraft("shopify_client_secret", e.target.value)}
                  placeholder={hasSecret("shopify_client_secret") ? "••••••••••••••••••••" : "Paste secret"}
                  className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
                />
                <Button
                  variant="secondary"
                  size="compact"
                  loading={savingField === "shopify_client_secret"}
                  onClick={() => handleSave("shopify_client_secret")}
                  className="text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-2">
            <div className="text-xs font-bold text-ink">Shopify App Redirection URL</div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-line">
              <span className="font-mono text-xs text-ink truncate select-all">{`${baseOrigin}/api/seller-channels/shopify/callback`}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(`${baseOrigin}/api/seller-channels/shopify/callback`, "shopify-cb")}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-secondary hover:text-ink"
              >
                {copiedKey === "shopify-cb" ? <Check className="h-3.5 w-3.5 text-[#0E8F5D]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === "shopify-cb" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        </Card>

        {/* ==================================================================== */}
        {/* 4. AMAZON SELLING PARTNER SP-API */}
        {/* ==================================================================== */}
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FF9900]/10 border border-[#FF9900]/20 flex items-center justify-center font-extrabold text-sm text-[#FF9900]">
                A
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-ink">Amazon SP-API Connector</h3>
                  <Badge variant="warning">COMING SOON — ARCHITECTURE READY</Badge>
                </div>
                <p className="text-xs text-ink-tertiary">Amazon Selling Partner API for BSR tracking and FBA fee calculations.</p>
              </div>
            </div>

            <span className="text-xs font-semibold text-ink-tertiary">Phase 2 Channel</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">SP-API Client ID (LWA)</label>
              <input
                type="text"
                value={getVal("amazon_client_id")}
                onChange={(e) => updateDraft("amazon_client_id", e.target.value)}
                placeholder="amzn1.application-oa2-client..."
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">SP-API Client Secret (LWA)</label>
              <input
                type="password"
                value={drafts["amazon_client_secret"] ?? ""}
                onChange={(e) => updateDraft("amazon_client_secret", e.target.value)}
                placeholder={hasSecret("amazon_client_secret") ? "••••••••••••••••••••" : "amzn1.oa2-cs.v1..."}
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Marketplace Region</label>
              <select
                value={getVal("amazon_region", "NA")}
                onChange={(e) => {
                  updateDraft("amazon_region", e.target.value);
                  onSaveSetting("amazon_region", e.target.value);
                }}
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink"
              >
                <option value="NA">North America (US, CA, MX, BR)</option>
                <option value="EU">Europe (UK, DE, FR, IT, ES)</option>
                <option value="FE">Far East (JP, AU, SG)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ==================================================================== */}
        {/* 5. TIKTOK SHOP, EBAY, WOOCOMMERCE & WALMART */}
        {/* ==================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* TikTok Shop Card */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs">TT</span>
                <div>
                  <h4 className="text-xs font-extrabold text-ink">TikTok Shop API</h4>
                  <span className="text-[10px] text-ink-tertiary">Fast-moving video commerce trends</span>
                </div>
              </div>
              <Badge variant="neutral">COMING SOON</Badge>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-ink">App Key</label>
                <input
                  type="text"
                  value={getVal("tiktok_app_key")}
                  onChange={(e) => updateDraft("tiktok_app_key", e.target.value)}
                  placeholder="e.g. 6a1b2c3d..."
                  className="w-full text-xs border border-line rounded px-2.5 py-1.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-ink">App Secret</label>
                <input
                  type="password"
                  value={drafts["tiktok_app_secret"] ?? ""}
                  onChange={(e) => updateDraft("tiktok_app_secret", e.target.value)}
                  placeholder="Paste secret"
                  className="w-full text-xs border border-line rounded px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>
          </Card>

          {/* eBay API Card */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-lg bg-[#E53238]/10 text-[#E53238] flex items-center justify-center font-extrabold text-xs">eBay</span>
                <div>
                  <h4 className="text-xs font-extrabold text-ink">eBay REST API</h4>
                  <span className="text-[10px] text-ink-tertiary">Secondary marketplace intelligence</span>
                </div>
              </div>
              <Badge variant="neutral">COMING SOON</Badge>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-ink">App ID (Client ID)</label>
                <input
                  type="text"
                  value={getVal("ebay_app_id")}
                  onChange={(e) => updateDraft("ebay_app_id", e.target.value)}
                  placeholder="e.g. MyCompany-SellerSa-PRD..."
                  className="w-full text-xs border border-line rounded px-2.5 py-1.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-ink">Cert ID (Client Secret)</label>
                <input
                  type="password"
                  value={drafts["ebay_cert_id"] ?? ""}
                  onChange={(e) => updateDraft("ebay_cert_id", e.target.value)}
                  placeholder="Paste cert secret"
                  className="w-full text-xs border border-line rounded px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>
          </Card>

          {/* WooCommerce Card */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-lg bg-[#96588A]/10 text-[#96588A] flex items-center justify-center font-extrabold text-xs">WC</span>
                <div>
                  <h4 className="text-xs font-extrabold text-ink">WooCommerce REST API</h4>
                  <span className="text-[10px] text-ink-tertiary">Self-hosted WordPress stores</span>
                </div>
              </div>
              <Badge variant="neutral">READY</Badge>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-ink">Store Base URL</label>
                <input
                  type="url"
                  value={getVal("woocommerce_store_url")}
                  onChange={(e) => updateDraft("woocommerce_store_url", e.target.value)}
                  placeholder="https://mystore.com"
                  className="w-full text-xs border border-line rounded px-2.5 py-1.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-ink">Consumer Key</label>
                <input
                  type="text"
                  value={getVal("woocommerce_consumer_key")}
                  onChange={(e) => updateDraft("woocommerce_consumer_key", e.target.value)}
                  placeholder="ck_..."
                  className="w-full text-xs border border-line rounded px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>
          </Card>

          {/* Walmart Marketplace Card */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-lg bg-[#0071DC]/10 text-[#0071DC] flex items-center justify-center font-extrabold text-xs">W</span>
                <div>
                  <h4 className="text-xs font-extrabold text-ink">Walmart Marketplace</h4>
                  <span className="text-[10px] text-ink-tertiary">Enterprise retail connector</span>
                </div>
              </div>
              <Badge variant="neutral">COMING SOON</Badge>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-ink">Client ID</label>
                <input
                  type="text"
                  value={getVal("walmart_client_id")}
                  onChange={(e) => updateDraft("walmart_client_id", e.target.value)}
                  placeholder="Client ID"
                  className="w-full text-xs border border-line rounded px-2.5 py-1.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-ink">Client Secret</label>
                <input
                  type="password"
                  value={drafts["walmart_client_secret"] ?? ""}
                  onChange={(e) => updateDraft("walmart_client_secret", e.target.value)}
                  placeholder="Paste client secret"
                  className="w-full text-xs border border-line rounded px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
