"use client";

import { useEffect, useState } from "react";

interface Package {
  id: string;
  key: string;
  name: string;
  priceUsd: number;
  isCustom: boolean;
  maxConnectors: number;
  maxSearchConfigs: number;
  maxScheduledSearches: number;
  maxTrackedShops: number;
  maxProspectsPerMonth: number;
  _count: { organizations: number };
}

interface PlatformConnector {
  id: string;
  type: string;
  label: string;
  status: string;
  createdAt: string;
}

interface SiteSettingRow {
  key: string;
  label: string;
  isSecret: boolean;
  hasValue: boolean;
  value?: string;
  updatedAt: string | null;
}

interface EmailSettingsData {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string;
  isActive: boolean;
  hasPassword: boolean;
}

interface PaymentProviderRow {
  id: string;
  provider: string;
  label: string;
  isActive: boolean;
  mode: "LIVE" | "SANDBOX";
  hasLiveCredentials: boolean;
  hasSandboxCredentials: boolean;
  updatedAt: string;
}

const PAYMENT_PROVIDERS: Array<{
  key: string;
  name: string;
  region: string;
  fields: Array<{ key: string; label: string; placeholder?: string }>;
}> = [
  {
    key: "STRIPE",
    name: "Stripe",
    region: "International",
    fields: [
      { key: "secretKey", label: "Secret key" },
      { key: "publishableKey", label: "Publishable key" },
      { key: "webhookSecret", label: "Webhook signing secret" },
    ],
  },
  {
    key: "PAYPAL",
    name: "PayPal",
    region: "International",
    fields: [
      { key: "clientId", label: "Client ID" },
      { key: "clientSecret", label: "Client secret" },
      { key: "webhookId", label: "Webhook ID" },
    ],
  },
  {
    key: "SAFEPAY",
    name: "Safepay",
    region: "Pakistan",
    fields: [
      { key: "apiKey", label: "API key" },
      { key: "secretKey", label: "Secret key" },
    ],
  },
  {
    key: "PAYFAST",
    name: "PayFast",
    region: "Pakistan",
    fields: [
      { key: "merchantId", label: "Merchant ID" },
      { key: "merchantKey", label: "Merchant key" },
      { key: "passphrase", label: "Passphrase" },
    ],
  },
];

interface SubscriptionInfo {
  status: "INCOMPLETE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  provider: string;
  packageId: string;
}

interface OrgRow {
  id: string;
  name: string;
  ownerEmail: string | null;
  createdAt: string;
  package: Package | null;
  subscription: SubscriptionInfo | null;
  usage: { connectors: number; searchConfigs: number; prospects: number; trackedShops: number };
}

interface CouponRow {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  isActive: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
}

const FIELDS: { key: keyof Package; label: string }[] = [
  { key: "maxConnectors", label: "Connectors" },
  { key: "maxSearchConfigs", label: "Saved searches" },
  { key: "maxScheduledSearches", label: "Scheduled searches" },
  { key: "maxTrackedShops", label: "Tracked shops" },
  { key: "maxProspectsPerMonth", label: "Prospects/month" },
];

export function AdminPackagesClient() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [platformConnectors, setPlatformConnectors] = useState<PlatformConnector[]>([]);
  const [showConnectorForm, setShowConnectorForm] = useState(false);
  const [connectorForm, setConnectorForm] = useState({ label: "Anadash Etsy", apiKey: "", sharedSecret: "" });
  const [connectorError, setConnectorError] = useState<string | null>(null);
  const [connectorSaving, setConnectorSaving] = useState(false);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProviderRow[]>([]);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editingCredMode, setEditingCredMode] = useState<"LIVE" | "SANDBOX">("SANDBOX");
  const [providerCreds, setProviderCreds] = useState<Record<string, string>>({});
  const [providerSaving, setProviderSaving] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [emailSettings, setEmailSettings] = useState<EmailSettingsData | null>(null);
  const [emailForm, setEmailForm] = useState({
    host: "", port: 465, secure: true, username: "", password: "", fromEmail: "", fromName: "Anadash", isActive: false,
  });
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTestMessage, setEmailTestMessage] = useState<string | null>(null);
  const [emailTesting, setEmailTesting] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettingRow[]>([]);
  const [settingDrafts, setSettingDrafts] = useState<Record<string, string>>({});
  const [settingSaving, setSettingSaving] = useState<string | null>(null);
  const [subGrantDrafts, setSubGrantDrafts] = useState<Record<string, { packageId: string; status: "ACTIVE" | "TRIALING" }>>({});
  const [subSavingOrgId, setSubSavingOrgId] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [showNewCouponForm, setShowNewCouponForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: "", type: "PERCENT" as "PERCENT" | "FIXED", value: 10, maxRedemptions: "", expiresAt: "" });
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Package>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPkg, setNewPkg] = useState({
    key: "", name: "", priceUsd: 0, isCustom: true,
    maxConnectors: 1, maxSearchConfigs: 3, maxScheduledSearches: 1, maxTrackedShops: 5, maxProspectsPerMonth: 200,
  });

  async function loadAll() {
    const [pRes, oRes, cRes, payRes, emailRes, settingsRes, couponRes] = await Promise.all([
      fetch("/api/admin/packages"),
      fetch("/api/admin/organizations"),
      fetch("/api/admin/platform-connectors"),
      fetch("/api/admin/payment-providers"),
      fetch("/api/admin/email-settings"),
      fetch("/api/admin/settings"),
      fetch("/api/admin/coupons"),
    ]);
    const [pData, oData, cData, payData, emailData, settingsData, couponData] = await Promise.all([
      pRes.json(), oRes.json(), cRes.json(), payRes.json(), emailRes.json(), settingsRes.json(), couponRes.json(),
    ]);
    setPackages(pData.packages ?? []);
    setOrgs(oData.organizations ?? []);
    setPlatformConnectors(cData.connectors ?? []);
    setPaymentProviders(payData.providers ?? []);
    if (emailData.settings) {
      setEmailSettings(emailData.settings);
      setEmailForm((f) => ({ ...f, ...emailData.settings, password: "" }));
    }
    setSiteSettings(settingsData.settings ?? []);
    setCoupons(couponData.coupons ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function startEdit(pkg: Package) {
    setEditingId(pkg.id);
    setDraft(pkg);
  }

  async function saveEdit() {
    if (!editingId) return;
    await fetch(`/api/admin/packages/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setEditingId(null);
    loadAll();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPkg),
    });
    setShowNewForm(false);
    setNewPkg({ key: "", name: "", priceUsd: 0, isCustom: true, maxConnectors: 1, maxSearchConfigs: 3, maxScheduledSearches: 1, maxTrackedShops: 5, maxProspectsPerMonth: 200 });
    loadAll();
  }

  async function handleAssign(orgId: string, packageId: string) {
    await fetch(`/api/admin/organizations/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
    });
    loadAll();
  }

  async function handleGrantSubscription(orgId: string) {
    const draft = subGrantDrafts[orgId];
    if (!draft?.packageId) return;
    setSubSavingOrgId(orgId);
    await fetch(`/api/admin/organizations/${orgId}/subscription`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSubSavingOrgId(null);
    loadAll();
  }

  async function handleRevokeSubscription(orgId: string) {
    if (!confirm("Revoke this org's subscription? They'll lose dashboard access until a new one is granted.")) return;
    setSubSavingOrgId(orgId);
    await fetch(`/api/admin/organizations/${orgId}/subscription`, { method: "DELETE" });
    setSubSavingOrgId(null);
    loadAll();
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    setCouponError(null);
    setCouponSaving(true);
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCoupon.code,
        type: newCoupon.type,
        value: newCoupon.value,
        maxRedemptions: newCoupon.maxRedemptions || null,
        expiresAt: newCoupon.expiresAt || null,
      }),
    });
    const data = await res.json();
    setCouponSaving(false);
    if (!res.ok) {
      setCouponError(data.error ?? "Failed to create coupon.");
      return;
    }
    setShowNewCouponForm(false);
    setNewCoupon({ code: "", type: "PERCENT", value: 10, maxRedemptions: "", expiresAt: "" });
    loadAll();
  }

  async function handleToggleCouponActive(id: string, next: boolean) {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    loadAll();
  }

  async function handleDeleteCoupon(id: string) {
    if (!confirm("Delete this coupon? It will no longer be redeemable.")) return;
    await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function handleAddConnector(e: React.FormEvent) {
    e.preventDefault();
    setConnectorError(null);
    setConnectorSaving(true);
    const res = await fetch("/api/admin/platform-connectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ETSY",
        label: connectorForm.label,
        credentials: { apiKey: connectorForm.apiKey, sharedSecret: connectorForm.sharedSecret },
      }),
    });
    const data = await res.json();
    setConnectorSaving(false);
    if (!res.ok) {
      setConnectorError(data.error ?? "Failed to add connector.");
      return;
    }
    setShowConnectorForm(false);
    setConnectorForm({ label: "Anadash Etsy", apiKey: "", sharedSecret: "" });
    loadAll();
  }

  async function handleRemoveConnector(id: string) {
    if (!confirm("Remove this platform connector? Every customer currently relying on it (with no key of their own) will lose access until you add a replacement.")) return;
    await fetch(`/api/admin/platform-connectors/${id}`, { method: "DELETE" });
    loadAll();
  }

  function startEditProvider(providerKey: string, credMode: "LIVE" | "SANDBOX") {
    setEditingProvider(providerKey);
    setEditingCredMode(credMode);
    setProviderCreds({});
    setProviderError(null);
  }

  async function handleSaveProvider(providerKey: string, label: string) {
    setProviderError(null);
    setProviderSaving(true);
    const res = await fetch("/api/admin/payment-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerKey, label, credentials: providerCreds, credentialMode: editingCredMode }),
    });
    const data = await res.json();
    setProviderSaving(false);
    if (!res.ok) {
      setProviderError(data.error ?? "Failed to save.");
      return;
    }
    setEditingProvider(null);
    loadAll();
  }

  async function handleToggleProvider(id: string, next: boolean) {
    await fetch(`/api/admin/payment-providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    loadAll();
  }

  async function handleSwitchMode(id: string, nextMode: "LIVE" | "SANDBOX") {
    if (nextMode === "LIVE" && !confirm("Switch to LIVE mode? Real charges will process with real money from this point on.")) return;
    await fetch(`/api/admin/payment-providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: nextMode }),
    });
    loadAll();
  }

  async function handleRemoveProvider(id: string) {
    if (!confirm("Remove these credentials? Customers will no longer see this as an accepted payment method.")) return;
    await fetch(`/api/admin/payment-providers/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function handleSaveEmailSettings(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSaving(true);
    const res = await fetch("/api/admin/email-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailForm),
    });
    const data = await res.json();
    setEmailSaving(false);
    if (!res.ok) {
      setEmailError(data.error ?? "Failed to save.");
      return;
    }
    loadAll();
  }

  async function handleTestEmail() {
    setEmailTestMessage(null);
    setEmailTesting(true);
    const res = await fetch("/api/admin/email-settings/test", { method: "POST" });
    const data = await res.json();
    setEmailTesting(false);
    setEmailTestMessage(res.ok ? "Test email sent — check your inbox." : `Failed: ${data.error}`);
  }

  async function handleSaveSetting(key: string) {
    const value = settingDrafts[key];
    if (!value?.trim()) return;
    setSettingSaving(key);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSettingSaving(null);
    setSettingDrafts((d) => ({ ...d, [key]: "" }));
    loadAll();
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-8">
      <div className="card max-w-2xl">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ink">Site settings</h2>
          <p className="text-xs text-muted">
            Links and platform app credentials used across the app — edit here, no deploy needed.
          </p>
        </div>
        <div className="divide-y divide-line">
          {siteSettings.map((s) => (
            <div key={s.key} className="py-3 first:pt-0 last:pb-0">
              <label className="label" htmlFor={s.key}>{s.label}</label>
              <div className="flex gap-2">
                <input
                  id={s.key}
                  className="input"
                  type={s.isSecret ? "password" : "text"}
                  placeholder={s.isSecret ? (s.hasValue ? "Set — enter a new value to replace" : "Not set") : s.value}
                  value={settingDrafts[s.key] ?? ""}
                  onChange={(e) => setSettingDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
                />
                <button
                  onClick={() => handleSaveSetting(s.key)}
                  disabled={settingSaving === s.key || !settingDrafts[s.key]?.trim()}
                  className="btn-secondary shrink-0"
                >
                  {settingSaving === s.key ? "Saving…" : "Save"}
                </button>
              </div>
              {!s.isSecret && s.hasValue && <p className="mt-1 text-xs text-muted">Current: {s.value}</p>}
              {s.isSecret && <p className="mt-1 text-xs text-muted">{s.hasValue ? "Value is set (hidden)." : "Not set yet."}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Platform connectors</h2>
            <p className="text-xs text-muted">Shared by every customer by default — this is what lets users search without connecting anything themselves.</p>
          </div>
          {!showConnectorForm && (
            <button className="btn-secondary" onClick={() => setShowConnectorForm(true)}>Add connector</button>
          )}
        </div>

        {showConnectorForm && (
          <form onSubmit={handleAddConnector} className="mb-4 space-y-3 rounded-md border border-line p-3">
            <input className="input" placeholder="Label" value={connectorForm.label} onChange={(e) => setConnectorForm({ ...connectorForm, label: e.target.value })} required />
            <input className="input" placeholder="Etsy API key (keystring)" value={connectorForm.apiKey} onChange={(e) => setConnectorForm({ ...connectorForm, apiKey: e.target.value })} required />
            <input className="input" placeholder="Etsy Shared Secret" value={connectorForm.sharedSecret} onChange={(e) => setConnectorForm({ ...connectorForm, sharedSecret: e.target.value })} required />
            {connectorError && <p className="text-sm text-danger">{connectorError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={connectorSaving} className="btn-primary">{connectorSaving ? "Testing…" : "Connect"}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowConnectorForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {platformConnectors.length === 0 ? (
          <p className="text-sm text-muted">No platform connector yet — customers can't search until one is added.</p>
        ) : (
          <div className="divide-y divide-line">
            {platformConnectors.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-ink">{c.label}</div>
                  <div className="text-xs text-muted">{c.type} · added {new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${c.status === "ACTIVE" ? "bg-green-50 text-success" : "bg-red-50 text-danger"}`}>{c.status}</span>
                  <button onClick={() => handleRemoveConnector(c.id)} className="text-sm text-muted hover:text-danger">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card max-w-lg">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ink">Email (SMTP)</h2>
          <p className="text-xs text-muted">
            Powers password reset, team invites, and search alerts. Swap providers anytime — no
            redeploy needed.
          </p>
        </div>
        <form onSubmit={handleSaveEmailSettings} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="SMTP host" value={emailForm.host} onChange={(e) => setEmailForm({ ...emailForm, host: e.target.value })} required />
            <input className="input" type="number" placeholder="Port" value={emailForm.port} onChange={(e) => setEmailForm({ ...emailForm, port: Number(e.target.value) })} required />
          </div>
          <input className="input" placeholder="Username" value={emailForm.username} onChange={(e) => setEmailForm({ ...emailForm, username: e.target.value })} required />
          <input
            className="input"
            type="password"
            placeholder={emailSettings?.hasPassword ? "Password (leave blank to keep current)" : "Password"}
            value={emailForm.password}
            onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="From email" value={emailForm.fromEmail} onChange={(e) => setEmailForm({ ...emailForm, fromEmail: e.target.value })} required />
            <input className="input" placeholder="From name" value={emailForm.fromName} onChange={(e) => setEmailForm({ ...emailForm, fromName: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={emailForm.secure} onChange={(e) => setEmailForm({ ...emailForm, secure: e.target.checked })} />
            Use TLS (port 465) — uncheck for STARTTLS (port 587)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={emailForm.isActive} onChange={(e) => setEmailForm({ ...emailForm, isActive: e.target.checked })} />
            Active
          </label>
          {emailError && <p className="text-sm text-danger">{emailError}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={emailSaving} className="btn-primary">
              {emailSaving ? "Saving…" : "Save"}
            </button>
            {emailSettings && (
              <button type="button" onClick={handleTestEmail} disabled={emailTesting} className="btn-secondary">
                {emailTesting ? "Sending…" : "Send test email"}
              </button>
            )}
          </div>
          {emailTestMessage && (
            <p className={`text-sm ${emailTestMessage.startsWith("Failed") ? "text-danger" : "text-success"}`}>
              {emailTestMessage}
            </p>
          )}
        </form>
      </div>

      <div className="card">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ink">Payment providers</h2>
          <p className="text-xs text-muted">
            Credentials are stored encrypted, separately for sandbox and live — switch modes anytime
            without re-entering keys. Stripe and PayPal power real checkout once active; Safepay and
            PayFast are credential storage only for now.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PAYMENT_PROVIDERS.map((pp) => {
            const existing = paymentProviders.find((row) => row.provider === pp.key);
            const isEditing = editingProvider === pp.key;
            const currentMode = existing?.mode ?? "SANDBOX";
            return (
              <div key={pp.key} className="rounded-md border border-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-ink">{pp.name}</div>
                    <div className="text-xs text-muted">{pp.region}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {existing && (
                      <span className={`badge ${currentMode === "LIVE" ? "bg-red-50 text-danger" : "bg-amber-50 text-amber-700"}`}>
                        {currentMode === "LIVE" ? "LIVE" : "Sandbox"}
                      </span>
                    )}
                    {existing?.isActive ? (
                      <span className="badge bg-green-50 text-success">Active</span>
                    ) : (
                      <span className="badge bg-gray-100 text-muted">Inactive</span>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <div className="mb-1 flex rounded-md border border-line p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditingCredMode("SANDBOX")}
                        className={`flex-1 rounded py-1 ${editingCredMode === "SANDBOX" ? "bg-amber-50 font-medium text-amber-700" : "text-muted"}`}
                      >
                        Sandbox keys
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCredMode("LIVE")}
                        className={`flex-1 rounded py-1 ${editingCredMode === "LIVE" ? "bg-red-50 font-medium text-danger" : "text-muted"}`}
                      >
                        Live keys
                      </button>
                    </div>
                    {pp.fields.map((f) => (
                      <input
                        key={f.key}
                        className="input"
                        placeholder={f.label}
                        value={providerCreds[f.key] ?? ""}
                        onChange={(e) => setProviderCreds({ ...providerCreds, [f.key]: e.target.value })}
                      />
                    ))}
                    {providerError && <p className="text-xs text-danger">{providerError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveProvider(pp.key, pp.name)}
                        disabled={providerSaving}
                        className="btn-primary !py-1.5 !px-3 text-xs"
                      >
                        {providerSaving ? "Saving…" : `Save ${editingCredMode === "LIVE" ? "live" : "sandbox"} keys`}
                      </button>
                      <button onClick={() => setEditingProvider(null)} className="btn-secondary !py-1.5 !px-3 text-xs">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={existing?.hasSandboxCredentials ? "text-success" : "text-muted"}>
                        {existing?.hasSandboxCredentials ? "✓" : "—"} Sandbox
                      </span>
                      <span className={existing?.hasLiveCredentials ? "text-success" : "text-muted"}>
                        {existing?.hasLiveCredentials ? "✓" : "—"} Live
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => startEditProvider(pp.key, "SANDBOX")} className="text-sm text-accent hover:underline">
                        {existing?.hasSandboxCredentials ? "Update sandbox" : "Add sandbox"}
                      </button>
                      <span className="text-line">·</span>
                      <button onClick={() => startEditProvider(pp.key, "LIVE")} className="text-sm text-accent hover:underline">
                        {existing?.hasLiveCredentials ? "Update live" : "Add live"}
                      </button>
                      {existing && (
                        <>
                          <span className="text-line">·</span>
                          <button
                            onClick={() => handleSwitchMode(existing.id, currentMode === "LIVE" ? "SANDBOX" : "LIVE")}
                            className="text-sm text-muted hover:text-ink"
                          >
                            Switch to {currentMode === "LIVE" ? "sandbox" : "live"}
                          </button>
                          <span className="text-line">·</span>
                          <button
                            onClick={() => handleToggleProvider(existing.id, !existing.isActive)}
                            className="text-sm text-muted hover:text-ink"
                          >
                            {existing.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <span className="text-line">·</span>
                          <button
                            onClick={() => handleRemoveProvider(existing.id)}
                            className="text-sm text-muted hover:text-danger"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Packages</h2>
          <button className="btn-secondary" onClick={() => setShowNewForm((s) => !s)}>
            {showNewForm ? "Cancel" : "New package"}
          </button>
        </div>

        {showNewForm && (
          <form onSubmit={handleCreate} className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-line p-3 sm:grid-cols-4">
            <input className="input" placeholder="key (e.g. STARTER)" value={newPkg.key} onChange={(e) => setNewPkg({ ...newPkg, key: e.target.value })} required />
            <input className="input" placeholder="Display name" value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} required />
            <input className="input" type="number" placeholder="Price $" value={newPkg.priceUsd} onChange={(e) => setNewPkg({ ...newPkg, priceUsd: Number(e.target.value) })} />
            <div />
            {FIELDS.map((f) => (
              <input
                key={f.key}
                className="input"
                type="number"
                placeholder={f.label}
                value={(newPkg as any)[f.key]}
                onChange={(e) => setNewPkg({ ...newPkg, [f.key]: Number(e.target.value) })}
              />
            ))}
            <button type="submit" className="btn-primary sm:col-span-4">Create package</button>
          </form>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-4">Package</th>
              <th className="py-2 pr-4">Price</th>
              {FIELDS.map((f) => (
                <th key={f.key} className="py-2 pr-4">{f.label}</th>
              ))}
              <th className="py-2 pr-4">Orgs</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {packages.map((pkg) => {
              const isEditing = editingId === pkg.id;
              return (
                <tr key={pkg.id}>
                  <td className="py-2 pr-4 font-medium text-ink">
                    {pkg.name} {pkg.isCustom && <span className="badge bg-accent-soft text-accent">custom</span>}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {isEditing ? (
                      <input className="input !w-20" type="number" value={draft.priceUsd ?? pkg.priceUsd} onChange={(e) => setDraft({ ...draft, priceUsd: Number(e.target.value) })} />
                    ) : (
                      `$${pkg.priceUsd}`
                    )}
                  </td>
                  {FIELDS.map((f) => (
                    <td key={f.key} className="py-2 pr-4 tabular-nums">
                      {isEditing ? (
                        <input
                          className="input !w-20"
                          type="number"
                          value={(draft as any)[f.key] ?? (pkg as any)[f.key]}
                          onChange={(e) => setDraft({ ...draft, [f.key]: Number(e.target.value) })}
                        />
                      ) : (
                        (pkg as any)[f.key]
                      )}
                    </td>
                  ))}
                  <td className="py-2 pr-4 tabular-nums">{pkg._count.organizations}</td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="text-accent hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-muted hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(pkg)} className="text-accent hover:underline">Edit</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-4 text-sm font-semibold text-ink">Organizations</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-4">Org</th>
              <th className="py-2 pr-4">Owner</th>
              <th className="py-2 pr-4">Package</th>
              <th className="py-2 pr-4">Usage</th>
              <th className="py-2 pr-4">Assign</th>
              <th className="py-2 pr-4">Subscription (dashboard access)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orgs.map((org) => {
              const draft = subGrantDrafts[org.id] ?? { packageId: org.package?.id ?? "", status: "ACTIVE" as const };
              const hasAccess = org.subscription && (org.subscription.status === "ACTIVE" || org.subscription.status === "TRIALING");
              return (
                <tr key={org.id}>
                  <td className="py-2 pr-4 font-medium text-ink">{org.name}</td>
                  <td className="py-2 pr-4 text-muted">{org.ownerEmail ?? "—"}</td>
                  <td className="py-2 pr-4">{org.package?.name ?? "None"}</td>
                  <td className="py-2 pr-4 text-xs text-muted">
                    {org.usage.connectors}c · {org.usage.searchConfigs}s · {org.usage.trackedShops}t · {org.usage.prospects}p
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      className="input !w-auto py-1 text-xs"
                      value={org.package?.id ?? ""}
                      onChange={(e) => handleAssign(org.id, e.target.value)}
                    >
                      <option value="" disabled>Select…</option>
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${hasAccess ? "bg-green-50 text-success" : "bg-gray-100 text-muted"}`}>
                        {org.subscription ? `${org.subscription.status} · ${org.subscription.provider}` : "None"}
                      </span>
                      {org.subscription ? (
                        <button
                          onClick={() => handleRevokeSubscription(org.id)}
                          disabled={subSavingOrgId === org.id}
                          className="text-xs text-muted hover:text-danger"
                        >
                          Revoke
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <select
                            className="input !w-auto py-1 text-xs"
                            value={draft.packageId}
                            onChange={(e) => setSubGrantDrafts((d) => ({ ...d, [org.id]: { ...draft, packageId: e.target.value } }))}
                          >
                            <option value="" disabled>Package…</option>
                            {packages.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <select
                            className="input !w-auto py-1 text-xs"
                            value={draft.status}
                            onChange={(e) => setSubGrantDrafts((d) => ({ ...d, [org.id]: { ...draft, status: e.target.value as "ACTIVE" | "TRIALING" } }))}
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="TRIALING">Trialing</option>
                          </select>
                          <button
                            onClick={() => handleGrantSubscription(org.id)}
                            disabled={!draft.packageId || subSavingOrgId === org.id}
                            className="btn-secondary !py-1 !px-2 text-xs"
                          >
                            Grant
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Coupons</h2>
            <p className="text-xs text-muted">Discount codes applied at checkout — reduce both the trial charge and the recurring price.</p>
          </div>
          <button className="btn-secondary" onClick={() => setShowNewCouponForm((s) => !s)}>
            {showNewCouponForm ? "Cancel" : "New coupon"}
          </button>
        </div>

        {showNewCouponForm && (
          <form onSubmit={handleCreateCoupon} className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-line p-3 sm:grid-cols-5">
            <input className="input" placeholder="Code (e.g. LAUNCH20)" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })} required />
            <select className="input" value={newCoupon.type} onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value as "PERCENT" | "FIXED" })}>
              <option value="PERCENT">% off</option>
              <option value="FIXED">$ off</option>
            </select>
            <input className="input" type="number" placeholder="Value" value={newCoupon.value} onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })} required />
            <input className="input" type="number" placeholder="Max redemptions (blank = ∞)" value={newCoupon.maxRedemptions} onChange={(e) => setNewCoupon({ ...newCoupon, maxRedemptions: e.target.value })} />
            <input className="input" type="date" placeholder="Expires (blank = never)" value={newCoupon.expiresAt} onChange={(e) => setNewCoupon({ ...newCoupon, expiresAt: e.target.value })} />
            {couponError && <p className="text-sm text-danger sm:col-span-5">{couponError}</p>}
            <button type="submit" disabled={couponSaving} className="btn-primary sm:col-span-5">
              {couponSaving ? "Saving…" : "Create coupon"}
            </button>
          </form>
        )}

        {coupons.length === 0 ? (
          <p className="text-sm text-muted">No coupons yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Discount</th>
                <th className="py-2 pr-4">Redemptions</th>
                <th className="py-2 pr-4">Expires</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-4 font-medium text-ink">{c.code}</td>
                  <td className="py-2 pr-4 tabular-nums">{c.type === "PERCENT" ? `${c.value}%` : `$${c.value}`}</td>
                  <td className="py-2 pr-4 tabular-nums">{c.redemptionCount}/{c.maxRedemptions ?? "∞"}</td>
                  <td className="py-2 pr-4 text-muted">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}</td>
                  <td className="py-2 pr-4">
                    <button onClick={() => handleToggleCouponActive(c.id, !c.isActive)} className={`badge ${c.isActive ? "bg-green-50 text-success" : "bg-gray-100 text-muted"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="py-2 pr-4">
                    <button onClick={() => handleDeleteCoupon(c.id)} className="text-sm text-muted hover:text-danger">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
