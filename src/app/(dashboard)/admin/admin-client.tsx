"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Building,
  CreditCard,
  Mail,
  Settings,
  DollarSign,
  Store,
  Flame,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Send,
  Sliders,
  ExternalLink,
  Lock,
  Tag,
  Zap,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Badge,
  Button,
  Input,
  Select,
  Alert,
} from "@/components/ui";

interface AdminMetrics {
  totalUsers: number;
  totalOrgs: number;
  activeSubscriptions: number;
  connectedEtsyShops: number;
  totalProspects: number;
  totalSearchConfigs: number;
  estimatedMrr: number;
}

interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  membershipId: string | null;
  organizationId: string | null;
  organizationName: string;
  planName: string;
  subscriptionStatus: string;
  memberSince: string;
  suspended: boolean;
}

interface Package {
  id: string;
  key: string;
  name: string;
  priceUsd: number;
  isCustom: boolean;
  isActive: boolean;
  trialDays: number | null;
  trialPriceUsd: number | null;
  maxConnectors: number;
  maxSearchConfigs: number;
  maxScheduledSearches: number;
  maxTrackedShops: number;
  maxProspectsPerMonth: number;
  _count: { organizations: number };
}

interface OrgRow {
  id: string;
  name: string;
  ownerEmail: string | null;
  createdAt: string;
  package: Package | null;
  subscription: { status: string; provider: string } | null;
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

interface PaymentProviderRow {
  id: string;
  provider: string;
  label: string;
  isActive: boolean;
  mode: "LIVE" | "SANDBOX";
  priority: number;
  updatedAt: string;
}

interface SiteSettingRow {
  key: string;
  label: string;
  isSecret: boolean;
  hasValue: boolean;
  value?: string;
  updatedAt: string | null;
}

interface EmailTemplateSummary {
  key: string;
  name: string;
  description: string;
  defaultSubject: string;
  sampleHtml: string;
}

export function AdminPackagesClient() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "orgs" | "packages" | "coupons" | "payments" | "email" | "branding"
  >("overview");

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  const [packages, setPackages] = useState<Package[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProviderRow[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettingRow[]>([]);
  const [settingDrafts, setSettingDrafts] = useState<Record<string, string>>({});
  const [settingSaving, setSettingSaving] = useState<string | null>(null);

  // Email Templates & Testing
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateSummary[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("WELCOME");
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);

  // Coupon Form
  const [showNewCouponForm, setShowNewCouponForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    type: "PERCENT" as "PERCENT" | "FIXED",
    value: 10,
    maxRedemptions: "",
    expiresAt: "",
  });
  const [couponSaving, setCouponSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  // User row actions
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [userActionError, setUserActionError] = useState<string | null>(null);

  // Org row actions
  const [orgActionLoading, setOrgActionLoading] = useState<string | null>(null);
  const [orgActionError, setOrgActionError] = useState<string | null>(null);

  // Package edit/create — draft values are always raw input strings;
  // converted to numbers only when sent to the API.
  const [packageDrafts, setPackageDrafts] = useState<Record<string, Record<string, string>>>({});
  const [packageSaving, setPackageSaving] = useState<string | null>(null);
  const [showNewPackageForm, setShowNewPackageForm] = useState(false);
  const [newPackage, setNewPackage] = useState({
    key: "", name: "", priceUsd: 0,
    maxConnectors: 1, maxSearchConfigs: 3, maxScheduledSearches: 1, maxTrackedShops: 5, maxProspectsPerMonth: 200,
  });
  const [packageCreating, setPackageCreating] = useState(false);

  async function loadAll() {
    try {
      const [mRes, pRes, oRes, cRes, payRes, setRes, tmplRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/packages"),
        fetch("/api/admin/organizations"),
        fetch("/api/admin/coupons"),
        fetch("/api/admin/payment-providers"),
        fetch("/api/admin/settings"),
        fetch("/api/admin/email-templates"),
      ]);

      const [mData, pData, oData, cData, payData, setData, tmplData] = await Promise.all([
        mRes.json(),
        pRes.json(),
        oRes.json(),
        cRes.json(),
        payRes.json(),
        setRes.json(),
        tmplRes.json(),
      ]);

      if (mData.metrics) setMetrics(mData.metrics);
      if (pData.packages) setPackages(pData.packages);
      if (oData.organizations) setOrgs(oData.organizations);
      if (cData.coupons) setCoupons(cData.coupons);
      if (payData.providers) setPaymentProviders(payData.providers);
      if (setData.settings) {
        setSiteSettings(setData.settings);
        const drafts: Record<string, string> = {};
        for (const s of setData.settings) {
          if (s.value) drafts[s.key] = s.value;
        }
        setSettingDrafts(drafts);
      }
      if (tmplData.templates) {
        setEmailTemplates(tmplData.templates);
      }
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers(q: string) {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    searchUsers("");
  }, []);

  async function handleUserAction(userId: string, body: Record<string, unknown>) {
    setUserActionLoading(userId);
    setUserActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserActionError(data.error || "Action failed.");
        return;
      }
      await searchUsers(userSearch);
    } catch {
      setUserActionError("Network error.");
    } finally {
      setUserActionLoading(null);
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    setUserActionLoading(userId);
    setUserActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setUserActionError(data.error || "Delete failed.");
        return;
      }
      await searchUsers(userSearch);
    } catch {
      setUserActionError("Network error.");
    } finally {
      setUserActionLoading(null);
    }
  }

  async function handleOrgAction(orgId: string, method: "PATCH" | "PUT" | "DELETE", body?: Record<string, unknown>, path = "") {
    setOrgActionLoading(orgId);
    setOrgActionError(null);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setOrgActionError(data.error || "Action failed.");
        return;
      }
      await loadAll();
    } catch {
      setOrgActionError("Network error.");
    } finally {
      setOrgActionLoading(null);
    }
  }

  function updatePackageDraft(id: string, field: string, value: string) {
    setPackageDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleSavePackage(pkg: Package) {
    const draft = packageDrafts[pkg.id] ?? {};
    setPackageSaving(pkg.id);
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name ?? pkg.name,
          priceUsd: draft.priceUsd ?? pkg.priceUsd,
          maxConnectors: draft.maxConnectors ?? pkg.maxConnectors,
          maxSearchConfigs: draft.maxSearchConfigs ?? pkg.maxSearchConfigs,
          maxScheduledSearches: draft.maxScheduledSearches ?? pkg.maxScheduledSearches,
          maxTrackedShops: draft.maxTrackedShops ?? pkg.maxTrackedShops,
          maxProspectsPerMonth: draft.maxProspectsPerMonth ?? pkg.maxProspectsPerMonth,
        }),
      });
      if (res.ok) {
        setPackageDrafts((prev) => {
          const next = { ...prev };
          delete next[pkg.id];
          return next;
        });
        await loadAll();
      }
    } finally {
      setPackageSaving(null);
    }
  }

  async function handleTogglePackageActive(pkg: Package) {
    setPackageSaving(pkg.id);
    try {
      await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      await loadAll();
    } finally {
      setPackageSaving(null);
    }
  }

  async function handleDeletePackage(pkg: Package) {
    if (!confirm(`Delete package "${pkg.name}"? Organizations must be reassigned first.`)) return;
    setPackageSaving(pkg.id);
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Could not delete package.");
        return;
      }
      await loadAll();
    } finally {
      setPackageSaving(null);
    }
  }

  async function handleCreatePackage(e: React.FormEvent) {
    e.preventDefault();
    setPackageCreating(true);
    try {
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPackage),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Could not create package.");
        return;
      }
      setShowNewPackageForm(false);
      setNewPackage({ key: "", name: "", priceUsd: 0, maxConnectors: 1, maxSearchConfigs: 3, maxScheduledSearches: 1, maxTrackedShops: 5, maxProspectsPerMonth: 200 });
      await loadAll();
    } finally {
      setPackageCreating(false);
    }
  }

  async function handleSaveSetting(key: string) {
    const value = settingDrafts[key] ?? "";
    setSettingSaving(key);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSettingSaving(null);
    loadAll();
  }

  async function handleSendTestEmail() {
    if (!testRecipientEmail || !selectedTemplateKey) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: selectedTemplateKey,
          recipientEmail: testRecipientEmail,
        }),
      });
      const data = await res.json();
      setTestSending(false);
      setTestResult(data);
    } catch {
      setTestSending(false);
      setTestResult({ success: false, error: "Network error sending test email." });
    }
  }

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    setCouponSaving(true);
    await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCoupon.code,
        type: newCoupon.type,
        value: Number(newCoupon.value),
        maxRedemptions: newCoupon.maxRedemptions ? Number(newCoupon.maxRedemptions) : null,
        expiresAt: newCoupon.expiresAt || null,
      }),
    });
    setCouponSaving(false);
    setShowNewCouponForm(false);
    setNewCoupon({ code: "", type: "PERCENT", value: 10, maxRedemptions: "", expiresAt: "" });
    loadAll();
  }

  const selectedTemplate = emailTemplates.find((t) => t.key === selectedTemplateKey) || emailTemplates[0];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <Heading as="h1" size="h2">
          Admin Management Console
        </Heading>
        <Text size="body-md" color="secondary" className="mt-1">
          Executive metrics, multi-tenant user management, subscriptions, official payment connectors, and system branding.
        </Text>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-line pb-2">
        {[
          { id: "overview", label: "Executive Overview" },
          { id: "users", label: "Users Directory" },
          { id: "orgs", label: "Workspaces" },
          { id: "packages", label: "Packages & Plans" },
          { id: "coupons", label: "Coupons" },
          { id: "payments", label: "Payment Gateways" },
          { id: "email", label: "Email & Templates" },
          { id: "branding", label: "App Branding & SEO" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? "bg-[#141B16] text-white"
                : "bg-white hover:bg-[#F4F3EF] text-ink border border-line"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. EXECUTIVE OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card padding="md" className="border-line bg-white shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-ink-tertiary uppercase mb-1">
                <span>Estimated MRR</span>
                <DollarSign className="h-4 w-4 text-[#0E8F5D]" />
              </div>
              <div className="text-2xl font-extrabold text-ink font-mono">
                ${metrics?.estimatedMrr?.toLocaleString() ?? 0}
              </div>
              <div className="text-[11px] text-ink-secondary mt-1">
                From {metrics?.activeSubscriptions ?? 0} active subscriptions
              </div>
            </Card>

            <Card padding="md" className="border-line bg-white shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-ink-tertiary uppercase mb-1">
                <span>Total Users</span>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-ink font-mono">
                {metrics?.totalUsers ?? 0}
              </div>
              <div className="text-[11px] text-ink-secondary mt-1">
                Across {metrics?.totalOrgs ?? 0} workspaces
              </div>
            </Card>

            <Card padding="md" className="border-line bg-white shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-ink-tertiary uppercase mb-1">
                <span>Connected Etsy Shops</span>
                <Store className="h-4 w-4 text-[#0E8F5D]" />
              </div>
              <div className="text-2xl font-extrabold text-[#0E8F5D] font-mono">
                {metrics?.connectedEtsyShops ?? 0}
              </div>
              <div className="text-[11px] text-ink-secondary mt-1">
                Live OAuth seller authorizations
              </div>
            </Card>

            <Card padding="md" className="border-line bg-white shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-ink-tertiary uppercase mb-1">
                <span>Scraped Prospects</span>
                <Flame className="h-4 w-4 text-[#FFB020]" />
              </div>
              <div className="text-2xl font-extrabold text-ink font-mono">
                {metrics?.totalProspects?.toLocaleString() ?? 0}
              </div>
              <div className="text-[11px] text-ink-secondary mt-1">
                Across {metrics?.totalSearchConfigs ?? 0} active streams
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 2. USERS DIRECTORY */}
      {activeTab === "users" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Heading as="h2" size="h4">
                User Management Directory
              </Heading>
              <Text size="body-sm" color="secondary" className="mt-0.5">
                Search all registered accounts across all tenant workspaces.
              </Text>
            </div>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search name or email..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="text-xs"
              />
            </div>
          </div>

          {userActionError && <Alert variant="danger">{userActionError}</Alert>}

          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary font-semibold">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Workspace</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Signed Up</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-[#FAFAF8] ${u.suspended ? "opacity-60" : ""}`}>
                    <td className="p-3">
                      <div className="font-bold text-ink">{u.name || "—"}</div>
                      <div className="text-ink-tertiary">{u.email}</div>
                      {u.suspended && <Badge variant="danger" className="mt-1">Suspended</Badge>}
                    </td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        disabled={!u.membershipId || userActionLoading === u.id}
                        onChange={(e) => handleUserAction(u.id, { role: e.target.value })}
                        className="font-mono text-[11px] border border-line rounded px-1.5 py-1 bg-white disabled:opacity-50"
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                      </select>
                    </td>
                    <td className="p-3 font-medium text-ink">{u.organizationName}</td>
                    <td className="p-3">
                      <select
                        value={packages.find((p) => p.name === u.planName)?.id ?? ""}
                        disabled={!u.organizationId || userActionLoading === u.id}
                        onChange={(e) => e.target.value && handleUserAction(u.id, { packageId: e.target.value })}
                        className="text-[11px] border border-line rounded px-1.5 py-1 bg-white disabled:opacity-50 max-w-[110px]"
                      >
                        <option value="" disabled>{u.planName}</option>
                        {packages.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <Badge variant={u.subscriptionStatus === "ACTIVE" || u.subscriptionStatus === "TRIALING" ? "success" : "warning"}>
                        {u.subscriptionStatus}
                      </Badge>
                    </td>
                    <td className="p-3 text-ink-tertiary">{new Date(u.memberSince).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="compact"
                          loading={userActionLoading === u.id}
                          onClick={() => handleUserAction(u.id, { suspended: !u.suspended })}
                          className="text-[11px]"
                        >
                          {u.suspended ? "Unsuspend" : "Suspend"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="compact"
                          loading={userActionLoading === u.id}
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="text-[11px]"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 3. WORKSPACES */}
      {activeTab === "orgs" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <Heading as="h2" size="h4">
            Tenant Workspaces ({orgs.length})
          </Heading>
          {orgActionError && <Alert variant="danger">{orgActionError}</Alert>}
          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary font-semibold">
                <tr>
                  <th className="p-3">Workspace</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Subscription</th>
                  <th className="p-3">Usage</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {orgs.map((o) => (
                  <tr key={o.id} className="hover:bg-[#FAFAF8]">
                    <td className="p-3 font-bold text-ink">{o.name}</td>
                    <td className="p-3 text-ink-secondary">{o.ownerEmail || "—"}</td>
                    <td className="p-3">
                      <select
                        value={o.package?.id ?? ""}
                        disabled={orgActionLoading === o.id}
                        onChange={(e) => e.target.value && handleOrgAction(o.id, "PATCH", { packageId: e.target.value })}
                        className="text-[11px] border border-line rounded px-1.5 py-1 bg-white disabled:opacity-50 max-w-[110px]"
                      >
                        <option value="" disabled>{o.package?.name ?? "Started"}</option>
                        {packages.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <Badge variant={o.subscription?.status === "ACTIVE" ? "success" : "neutral"}>
                        {o.subscription?.status ?? "INCOMPLETE"}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-ink-tertiary">
                      {o.usage?.prospects ?? 0} prospects · {o.usage?.searchConfigs ?? 0} streams
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="compact"
                          loading={orgActionLoading === o.id}
                          onClick={() =>
                            o.package?.id &&
                            handleOrgAction(o.id, "PUT", { packageId: o.package.id, status: "TRIALING" }, "/subscription")
                          }
                          className="text-[11px]"
                          title="Grant a trialing subscription on the current package"
                        >
                          Extend Trial
                        </Button>
                        <Button
                          variant="secondary"
                          size="compact"
                          loading={orgActionLoading === o.id}
                          onClick={() =>
                            o.package?.id &&
                            handleOrgAction(o.id, "PUT", { packageId: o.package.id, status: "ACTIVE" }, "/subscription")
                          }
                          className="text-[11px]"
                          title="Grant an active subscription on the current package, bypassing billing"
                        >
                          Grant Access
                        </Button>
                        {o.subscription && (
                          <Button
                            variant="destructive"
                            size="compact"
                            loading={orgActionLoading === o.id}
                            onClick={() => handleOrgAction(o.id, "DELETE", undefined, "/subscription")}
                            className="text-[11px]"
                          >
                            Cancel Sub
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 4. PACKAGES & PLANS */}
      {activeTab === "packages" && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Button variant="primary" size="compact" onClick={() => setShowNewPackageForm((s) => !s)} className="text-xs">
              {showNewPackageForm ? "Cancel" : "+ New Package"}
            </Button>
          </div>

          {showNewPackageForm && (
            <Card padding="lg" className="border-line bg-[#FAFAF8] shadow-xs">
              <form onSubmit={handleCreatePackage} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[10px] font-bold text-ink-tertiary uppercase">Key</label>
                  <input required value={newPackage.key} onChange={(e) => setNewPackage((p) => ({ ...p, key: e.target.value.toUpperCase() }))} className="w-full text-xs border border-line rounded px-2 py-1.5" placeholder="ENTERPRISE" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink-tertiary uppercase">Name</label>
                  <input required value={newPackage.name} onChange={(e) => setNewPackage((p) => ({ ...p, name: e.target.value }))} className="w-full text-xs border border-line rounded px-2 py-1.5" placeholder="Enterprise" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink-tertiary uppercase">Price/mo ($)</label>
                  <input type="number" min="0" value={newPackage.priceUsd} onChange={(e) => setNewPackage((p) => ({ ...p, priceUsd: Number(e.target.value) }))} className="w-full text-xs border border-line rounded px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink-tertiary uppercase">Search Streams</label>
                  <input type="number" min="0" value={newPackage.maxSearchConfigs} onChange={(e) => setNewPackage((p) => ({ ...p, maxSearchConfigs: Number(e.target.value) }))} className="w-full text-xs border border-line rounded px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink-tertiary uppercase">Scheduled Searches</label>
                  <input type="number" min="0" value={newPackage.maxScheduledSearches} onChange={(e) => setNewPackage((p) => ({ ...p, maxScheduledSearches: Number(e.target.value) }))} className="w-full text-xs border border-line rounded px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink-tertiary uppercase">Tracked Shops</label>
                  <input type="number" min="0" value={newPackage.maxTrackedShops} onChange={(e) => setNewPackage((p) => ({ ...p, maxTrackedShops: Number(e.target.value) }))} className="w-full text-xs border border-line rounded px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-ink-tertiary uppercase">Prospects/mo</label>
                  <input type="number" min="0" value={newPackage.maxProspectsPerMonth} onChange={(e) => setNewPackage((p) => ({ ...p, maxProspectsPerMonth: Number(e.target.value) }))} className="w-full text-xs border border-line rounded px-2 py-1.5" />
                </div>
                <div>
                  <input type="number" min="0" value={newPackage.maxConnectors} onChange={(e) => setNewPackage((p) => ({ ...p, maxConnectors: Number(e.target.value) }))} className="hidden" />
                  <Button type="submit" variant="primary" size="compact" loading={packageCreating} className="text-xs w-full">Create</Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {packages.map((pkg) => {
              const draft = packageDrafts[pkg.id] ?? {};
              return (
                <Card key={pkg.id} padding="lg" className={`border-line bg-white shadow-xs space-y-3 flex flex-col justify-between ${!pkg.isActive ? "opacity-60" : ""}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <input
                        value={draft.name ?? pkg.name}
                        onChange={(e) => updatePackageDraft(pkg.id, "name", e.target.value)}
                        className="font-extrabold text-sm text-ink border-b border-transparent hover:border-line focus:border-[#0E8F5D] focus:outline-none bg-transparent w-2/3"
                      />
                      <Badge variant="neutral" className="font-mono text-[10px]">{pkg.key}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xl font-extrabold text-[#0E8F5D] font-mono">
                      $
                      <input
                        type="number"
                        min="0"
                        value={draft.priceUsd ?? pkg.priceUsd}
                        onChange={(e) => updatePackageDraft(pkg.id, "priceUsd", e.target.value)}
                        className="w-16 border-b border-transparent hover:border-line focus:border-[#0E8F5D] focus:outline-none bg-transparent"
                      />
                      <span className="text-xs font-normal text-ink-tertiary">/mo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-secondary">
                      <label className="flex flex-col gap-0.5">
                        Search Streams
                        <input type="number" min="0" value={draft.maxSearchConfigs ?? pkg.maxSearchConfigs} onChange={(e) => updatePackageDraft(pkg.id, "maxSearchConfigs", e.target.value)} className="border border-line rounded px-1.5 py-1 font-mono" />
                      </label>
                      <label className="flex flex-col gap-0.5">
                        Scheduled
                        <input type="number" min="0" value={draft.maxScheduledSearches ?? pkg.maxScheduledSearches} onChange={(e) => updatePackageDraft(pkg.id, "maxScheduledSearches", e.target.value)} className="border border-line rounded px-1.5 py-1 font-mono" />
                      </label>
                      <label className="flex flex-col gap-0.5">
                        Tracked Shops
                        <input type="number" min="0" value={draft.maxTrackedShops ?? pkg.maxTrackedShops} onChange={(e) => updatePackageDraft(pkg.id, "maxTrackedShops", e.target.value)} className="border border-line rounded px-1.5 py-1 font-mono" />
                      </label>
                      <label className="flex flex-col gap-0.5">
                        Prospects/mo
                        <input type="number" min="0" value={draft.maxProspectsPerMonth ?? pkg.maxProspectsPerMonth} onChange={(e) => updatePackageDraft(pkg.id, "maxProspectsPerMonth", e.target.value)} className="border border-line rounded px-1.5 py-1 font-mono" />
                      </label>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-line-subtle space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-ink-tertiary">
                      <span>{pkg._count?.organizations ?? 0} active workspaces</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePackageActive(pkg)}
                        className={`font-semibold ${pkg.isActive ? "text-[#0E8F5D]" : "text-ink-tertiary"}`}
                      >
                        {pkg.isActive ? "● Active" : "○ Hidden"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="compact"
                        loading={packageSaving === pkg.id}
                        disabled={!packageDrafts[pkg.id]}
                        onClick={() => handleSavePackage(pkg)}
                        className="text-[11px] flex-1 bg-[#0E8F5D] hover:bg-[#0C7A52]"
                      >
                        Save
                      </Button>
                      <Button
                        variant="destructive"
                        size="compact"
                        loading={packageSaving === pkg.id}
                        onClick={() => handleDeletePackage(pkg)}
                        className="text-[11px]"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. COUPONS */}
      {activeTab === "coupons" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Heading as="h2" size="h4">
                Discount Coupons
              </Heading>
              <Text size="body-sm" color="secondary" className="mt-0.5">
                Coupons discount only recurring monthly charges, never the $1.00 trial.
              </Text>
            </div>
            <Button
              variant="primary"
              size="compact"
              onClick={() => setShowNewCouponForm(!showNewCouponForm)}
              className="bg-[#0E8F5D] text-xs font-semibold"
            >
              + Create Coupon
            </Button>
          </div>

          {showNewCouponForm && (
            <form onSubmit={handleCreateCoupon} className="p-4 bg-[#FAFAF8] rounded-xl border border-line space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Coupon Code"
                  placeholder="e.g. LAUNCH50"
                  required
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                />
                <Select
                  label="Discount Type"
                  value={newCoupon.type}
                  onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value as any })}
                  options={[
                    { value: "PERCENT", label: "Percentage (%)" },
                    { value: "FIXED", label: "Fixed USD ($)" },
                  ]}
                />
                <Input
                  label="Discount Value"
                  type="number"
                  required
                  value={newCoupon.value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="compact" onClick={() => setShowNewCouponForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="compact" loading={couponSaving} className="bg-[#0E8F5D]">
                  Save Coupon
                </Button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto border border-line rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary font-semibold">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Discount</th>
                  <th className="p-3">Redemptions</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAF8]">
                    <td className="p-3 font-mono font-bold text-ink">{c.code}</td>
                    <td className="p-3 font-bold text-[#0E8F5D]">
                      {c.type === "PERCENT" ? `${c.value}% OFF` : `$${c.value} OFF`}
                    </td>
                    <td className="p-3">{c.redemptionCount} uses</td>
                    <td className="p-3">
                      <Badge variant={c.isActive ? "success" : "neutral"}>
                        {c.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 6. OFFICIAL PAYMENT GATEWAYS */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Stripe Connect Platform Card */}
            <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-extrabold">
                    S
                  </div>
                  <div>
                    <div className="font-bold text-sm text-ink">Stripe Platform Connect</div>
                    <div className="text-xs text-ink-tertiary">Credit / Debit Cards, Apple Pay, Google Pay</div>
                  </div>
                </div>
                <Badge variant="success">Priority 1</Badge>
              </div>

              <p className="text-xs text-ink-secondary leading-relaxed">
                Official Stripe Connect platform structure for recurring subscriptions and 3-day $1.00 USD trial authorizations.
              </p>

              <div className="p-3 bg-[#FAFAF8] rounded-lg border border-line-subtle text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-ink-tertiary">Live Secret Key:</span>
                  <span className="text-ink font-bold">••••••••_live_99f2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary">Webhook Signing:</span>
                  <span className="text-ink font-bold">••••••••_whsec_48a1</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0E8F5D]">✓ Platform Connected</span>
                <Button variant="secondary" size="compact" className="text-xs">
                  Re-authorize Stripe →
                </Button>
              </div>
            </Card>

            {/* PayPal Partner Onboarding Card */}
            <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-extrabold">
                    P
                  </div>
                  <div>
                    <div className="font-bold text-sm text-ink">PayPal Partner Platform</div>
                    <div className="text-xs text-ink-tertiary">PayPal Account & Buyer Protection</div>
                  </div>
                </div>
                <Badge variant="neutral">Priority 2</Badge>
              </div>

              <p className="text-xs text-ink-secondary leading-relaxed">
                PayPal official partner integration with automated recurring billing vault and webhook synchronization.
              </p>

              <div className="p-3 bg-[#FAFAF8] rounded-lg border border-line-subtle text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-ink-tertiary">Client ID:</span>
                  <span className="text-ink font-bold">••••••••_paypal_client</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary">Vault ID:</span>
                  <span className="text-ink font-bold">••••••••_vault_ok</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0E8F5D]">✓ Platform Connected</span>
                <Button variant="secondary" size="compact" className="text-xs">
                  Re-authorize PayPal →
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 7. EMAIL & 15 LIFECYCLE TEMPLATES */}
      {activeTab === "email" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-6">
          <div>
            <Heading as="h2" size="h4">
              Email System & 15 Lifecycle Templates Registry
            </Heading>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              Inspect branded responsive HTML templates, variables, and dispatch live test emails.
            </Text>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template Selector */}
            <div className="space-y-2 border-r border-line pr-4">
              <div className="text-xs font-bold text-ink-tertiary uppercase mb-2">Select Template</div>
              <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
                {emailTemplates.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedTemplateKey(t.key)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors ${
                      selectedTemplateKey === t.key
                        ? "bg-[#0E8F5D]/10 text-[#0E8F5D] font-bold border border-[#0E8F5D]/30"
                        : "hover:bg-[#FAFAF8] text-ink"
                    }`}
                  >
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-[10px] text-ink-tertiary truncate">{t.key}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Preview & Tester */}
            <div className="lg:col-span-2 space-y-4">
              {selectedTemplate && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#FAFAF8] rounded-xl border border-line">
                    <div>
                      <div className="font-bold text-xs text-ink">{selectedTemplate.name}</div>
                      <div className="text-[11px] text-ink-tertiary">Subject: {selectedTemplate.defaultSubject}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="test@example.com"
                        value={testRecipientEmail}
                        onChange={(e) => setTestRecipientEmail(e.target.value)}
                        className="text-xs w-48"
                      />
                      <Button
                        variant="primary"
                        size="compact"
                        disabled={!testRecipientEmail}
                        loading={testSending}
                        onClick={handleSendTestEmail}
                        className="bg-[#0E8F5D] text-xs shrink-0"
                      >
                        <Send className="h-3 w-3 mr-1" /> Send Test
                      </Button>
                    </div>
                  </div>

                  {testResult && (
                    <Alert variant={testResult.success ? "success" : "danger"}>
                      {testResult.success ? "Test email dispatched successfully!" : testResult.error}
                    </Alert>
                  )}

                  <div className="border border-line rounded-xl overflow-hidden shadow-2xs">
                    <div className="p-2 bg-[#FAFAF8] border-b border-line text-[11px] font-bold text-ink-tertiary">
                      Live HTML Output Preview
                    </div>
                    <div
                      className="p-4 bg-white max-h-[420px] overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: selectedTemplate.sampleHtml }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 8. APP BRANDING & SEO CONFIGURATION */}
      {activeTab === "branding" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-6">
          <div>
            <Heading as="h2" size="h4">
              Application Branding, Assistant & SEO Settings
            </Heading>
            <Text size="body-sm" color="secondary" className="mt-0.5">
              Change application identity, assistant name, logos, and SEO meta tags without redeploying code.
            </Text>
          </div>

          <div className="divide-y divide-line-subtle">
            {siteSettings.map((s) => (
              <div key={s.key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 sm:w-1/3">
                  <div className="font-bold text-xs text-ink">{s.label}</div>
                  <div className="font-mono text-[10px] text-ink-tertiary">{s.key}</div>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type={s.isSecret ? "password" : "text"}
                    value={settingDrafts[s.key] ?? ""}
                    onChange={(e) => setSettingDrafts({ ...settingDrafts, [s.key]: e.target.value })}
                    placeholder={s.isSecret && s.hasValue ? "••••••••" : `Enter ${s.label}`}
                    className="text-xs flex-1"
                  />
                  <Button
                    variant="secondary"
                    size="compact"
                    loading={settingSaving === s.key}
                    onClick={() => handleSaveSetting(s.key)}
                    className="text-xs shrink-0"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
