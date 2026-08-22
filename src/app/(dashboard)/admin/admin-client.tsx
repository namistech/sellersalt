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
  Eye,
  Filter,
  ArrowRight,
  UserCheck,
  UserX,
  Activity,
  Fingerprint,
  Clock,
  Key,
  Upload,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Badge,
  Button,
  IconButton,
  Input,
  Select,
  Alert,
} from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { checkPasswordStrength } from "@/lib/password-policy";
import { AdminSidebar, type AdminTabId } from "./components/AdminSidebar";
import { GeneralAppSettingsView } from "./views/GeneralAppSettingsView";
import { BrandingSeoView } from "./views/BrandingSeoView";
import { IntegrationsView } from "./views/IntegrationsView";
import { PlansQuotasView } from "./views/PlansQuotasView";
import { CouponsView } from "./views/CouponsView";
import { ApiProvidersView } from "./views/ApiProvidersView";
import { StorageMediaView } from "./views/StorageMediaView";
import { UserProvisioningView } from "./views/UserProvisioningView";
import { SecurityAbuseView } from "./views/SecurityAbuseView";
import { SystemHealthView } from "./views/SystemHealthView";
import { AnnouncementsView } from "./views/AnnouncementsView";
import { FreePlanConfigView } from "./views/FreePlanConfigView";

interface AdminMetrics {
  totalUsers: number;
  verifiedUsers?: number;
  unverifiedUsers?: number;
  suspendedUsers?: number;
  recentSignups7d?: number;
  totalOrgs: number;
  activeSubscriptions: number;
  connectedEtsyShops: number;
  totalProspects: number;
  totalSearchConfigs: number;
  estimatedMrr: number;
}

interface AuditLogEntry {
  id: string;
  event: string;
  actorEmail: string | null;
  targetEmail: string | null;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

interface UnverifiedUserSummary {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  verificationEmailCount: number;
  lastVerificationEmailAt: string | null;
}

// Exact credential field names each provider's client reads —
// src/lib/payment-providers/{stripe,paypal,safepay,payfast}-client.ts.
const PROVIDER_FIELDS: Record<string, Array<{ key: string; label: string; secret?: boolean }>> = {
  STRIPE: [
    { key: "secretKey", label: "Secret Key", secret: true },
    { key: "publishableKey", label: "Publishable Key" },
    { key: "webhookSecret", label: "Webhook Signing Secret", secret: true },
  ],
  PAYPAL: [
    { key: "clientId", label: "Client ID" },
    { key: "clientSecret", label: "Client Secret", secret: true },
    { key: "webhookId", label: "Webhook ID" },
  ],
  SAFEPAY: [
    { key: "apiKey", label: "API Key", secret: true },
    { key: "secretKey", label: "Secret Key", secret: true },
    { key: "merchantId", label: "Merchant ID" },
    { key: "webhookSecret", label: "Webhook Secret", secret: true },
  ],
  PAYFAST: [
    { key: "merchantId", label: "Merchant ID" },
    { key: "securedKey", label: "Secured Key", secret: true },
    { key: "currencyCode", label: "Currency Code (e.g. USD)" },
  ],
};

const PROVIDER_META: Record<string, { label: string; description: string; dashboardUrl: string }> = {
  STRIPE: { label: "Stripe", description: "Credit / Debit Cards, Apple Pay, Google Pay", dashboardUrl: "https://dashboard.stripe.com/apikeys" },
  PAYPAL: { label: "PayPal", description: "PayPal Account & Buyer Protection", dashboardUrl: "https://developer.paypal.com/dashboard/applications" },
  SAFEPAY: { label: "Safepay", description: "Pakistan-focused card & wallet gateway", dashboardUrl: "https://dashboard.getsafepay.com/" },
  PAYFAST: { label: "GoPayFast", description: "South Africa card & EFT gateway", dashboardUrl: "https://www.payfast.co.za/dashboard" },
};

interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  role: string;
  membershipId: string | null;
  organizationId: string | null;
  organizationName: string;
  planName: string;
  subscriptionStatus: string;
  memberSince: string;
  suspended: boolean;
  emailVerified: boolean;
  verificationEmailCount?: number;
  lastVerificationEmailAt?: string | null;
  authMethods: string[];
  lastLoginAt: string | null;
  etsyConnected: boolean;
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
  membersCount?: number;
  usage: { connectors: number; searchConfigs: number; prospects: number; trackedShops: number };
}

interface CouponRow {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  behavior?: string;
  duration?: string;
  durationMonths?: number | null;
  applicablePlanKey?: string | null;
  notes?: string | null;
  firstTimeOnly?: boolean;
  minPlanPrice?: number | null;
  isActive: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  startDate?: string | null;
  createdAt?: string;
}

interface PaymentProviderRow {
  id: string;
  provider: string;
  label: string;
  isActive: boolean;
  mode: "LIVE" | "SANDBOX";
  priority: number;
  updatedAt: string;
  hasLiveCredentials: boolean;
  hasSandboxCredentials: boolean;
}

interface AiModelRow {
  id: string;
  modelId: string;
  displayName: string;
  contextLength: number | null;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
  isFree: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
}

interface AiProviderRow {
  id: string;
  provider: "OPENROUTER" | "NVIDIA" | "GEMINI" | "OPENAI";
  label: string;
  isActive: boolean;
  hasApiKey: boolean;
  defaultModelId: string | null;
  priority: number;
  modelsLastFetchedAt: string | null;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  models: AiModelRow[];
}

// Keeps this list in sync with the server-side allowlist in
// src/app/api/admin/settings/upload-image/route.ts — only these settings
// get an "Upload" affordance instead of a plain URL field.
const IMAGE_SETTING_KEYS = [
  "app_logo_url",
  "app_favicon_url",
  "assistant_logo_url",
  "seo_og_image_url",
  "auth_page_logo_url",
  "auth_page_image_url",
];

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
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLogEntry[]>([]);
  const [needsAttentionUnverified, setNeedsAttentionUnverified] = useState<UnverifiedUserSummary[]>([]);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "verified" | "unverified" | "suspended">("all");
  const [usersLoading, setUsersLoading] = useState(false);

  // User Detail modal state
  const [selectedUserDetailId, setSelectedUserDetailId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<any | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetailError, setUserDetailError] = useState<string | null>(null);

  const [packages, setPackages] = useState<Package[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [orgSearch, setOrgSearch] = useState("");
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProviderRow[]>([]);
  const [aiProviders, setAiProviders] = useState<AiProviderRow[]>([]);
  const [aiKeyDrafts, setAiKeyDrafts] = useState<Record<string, string>>({});
  const [aiActionLoading, setAiActionLoading] = useState<string | null>(null);
  const [aiActionResult, setAiActionResult] = useState<Record<string, string>>({});
  const [siteSettings, setSiteSettings] = useState<SiteSettingRow[]>([]);
  const [settingDrafts, setSettingDrafts] = useState<Record<string, string>>({});
  const [settingSaving, setSettingSaving] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<Record<string, string>>({});

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
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);

  // Admin User Creation modal state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserName, setCreateUserName] = useState("");
  const [createUserEmail, setCreateUserEmail] = useState("");
  const [createUserPassword, setCreateUserPassword] = useState("");
  const [createUserOrgName, setCreateUserOrgName] = useState("");
  const [createUserRole, setCreateUserRole] = useState<"OWNER" | "ADMIN" | "MEMBER">("OWNER");
  const [createUserSendVerification, setCreateUserSendVerification] = useState(true);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);

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

  // Payment provider credentials
  const [providerMode, setProviderMode] = useState<Record<string, "LIVE" | "SANDBOX">>({});
  const [providerDrafts, setProviderDrafts] = useState<Record<string, Record<string, string>>>({});
  const [providerSaving, setProviderSaving] = useState<string | null>(null);
  const [providerTestResult, setProviderTestResult] = useState<Record<string, string>>({});
  const [pendingLiveConfirm, setPendingLiveConfirm] = useState<string | null>(null);

  // SMTP / email provider settings
  const [emailSettings, setEmailSettings] = useState<{
    id?: string; host: string; port: number; secure: boolean; username: string;
    fromEmail: string; fromName: string; isActive: boolean; hasPassword: boolean; updatedAt?: string;
  } | null>(null);
  const [emailSettingsDraft, setEmailSettingsDraft] = useState<Record<string, string>>({});
  const [emailSettingsSaving, setEmailSettingsSaving] = useState(false);
  const [emailSettingsResult, setEmailSettingsResult] = useState<string | null>(null);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);

  async function loadAll() {
    try {
      const [mRes, pRes, oRes, cRes, payRes, aiRes, setRes, tmplRes, emailRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/packages"),
        fetch("/api/admin/organizations"),
        fetch("/api/admin/coupons"),
        fetch("/api/admin/payment-providers"),
        fetch("/api/admin/ai-providers"),
        fetch("/api/admin/settings"),
        fetch("/api/admin/email-templates"),
        fetch("/api/admin/email-settings"),
      ]);

      const [mData, pData, oData, cData, payData, aiData, setData, tmplData, emailData] = await Promise.all([
        mRes.json(),
        pRes.json(),
        oRes.json(),
        cRes.json(),
        payRes.json(),
        aiRes.json(),
        setRes.json(),
        tmplRes.json(),
        emailRes.json(),
      ]);

      if (mData.metrics) setMetrics(mData.metrics);
      if (mData.recentAuditLogs) setRecentAuditLogs(mData.recentAuditLogs);
      if (mData.needsAttention?.unverifiedUsers) setNeedsAttentionUnverified(mData.needsAttention.unverifiedUsers);

      if (pData.packages) setPackages(pData.packages);
      if (oData.organizations) setOrgs(oData.organizations);
      if (cData.coupons) setCoupons(cData.coupons);
      if (payData.providers) setPaymentProviders(payData.providers);
      if (aiData.providers) setAiProviders(aiData.providers);
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
      if (emailData.settings !== undefined) {
        setEmailSettings(emailData.settings);
      }
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers(q: string, status?: string) {
    setUsersLoading(true);
    const filter = status !== undefined ? status : userStatusFilter;
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}&status=${encodeURIComponent(filter)}`);
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setUsersLoading(false);
    }
  }

  async function openUserDetail(userId: string) {
    setSelectedUserDetailId(userId);
    setUserDetailLoading(true);
    setUserDetailError(null);
    setUserDetail(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (!res.ok) {
        setUserDetailError(data.error || "Failed to load user details.");
        return;
      }
      setUserDetail(data.user);
    } catch {
      setUserDetailError("Network error loading user details.");
    } finally {
      setUserDetailLoading(false);
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

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateUserError(null);
    setCreateUserSuccess(null);

    const strength = checkPasswordStrength(createUserPassword);
    if (!strength.valid) {
      setCreateUserError(`Password must include: ${strength.errors.join(", ")}.`);
      return;
    }

    setCreateUserLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createUserName.trim() || undefined,
          email: createUserEmail.trim(),
          password: createUserPassword,
          organizationName: createUserOrgName.trim() || undefined,
          role: createUserRole,
          sendVerificationEmail: createUserSendVerification,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateUserError(data.error || "Failed to create user.");
        return;
      }
      setCreateUserSuccess(
        `User ${data.user.email} created successfully${data.user.verificationSent ? " and verification email sent." : "."}`
      );
      setCreateUserName("");
      setCreateUserEmail("");
      setCreateUserPassword("");
      setCreateUserOrgName("");
      setCreateUserRole("OWNER");
      searchUsers(userSearch);
      setTimeout(() => {
        setShowCreateUserModal(false);
        setCreateUserSuccess(null);
      }, 1500);
    } catch {
      setCreateUserError("Network error creating user.");
    } finally {
      setCreateUserLoading(false);
    }
  }

  async function handleSendVerification(userId: string) {
    setUserActionLoading(userId);
    setUserActionError(null);
    setUserActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/send-verification`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setUserActionError(data.error || "Failed to send verification email.");
        return;
      }
      setUserActionSuccess(data.message || "Verification email sent successfully.");
      setTimeout(() => setUserActionSuccess(null), 5000);
      await searchUsers(userSearch);
    } catch {
      setUserActionError("Network error sending verification email.");
    } finally {
      setUserActionLoading(null);
    }
  }

  async function handleChangeEmail(userId: string, currentEmail: string) {
    const newEmail = prompt(`Change login email for ${currentEmail} to:`);
    if (!newEmail || !newEmail.trim()) return;
    setUserActionLoading(userId);
    setUserActionError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/change-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUserActionError(data.error || "Failed to change email.");
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

  async function handleSavePackageLimitsDirect(pkgId: string, limits: any): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/packages/${pkgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(limits),
      });
      if (res.ok) {
        await loadAll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function handleSavePackageObject(pkg: any): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pkg),
      });
      if (res.ok) {
        await loadAll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function handleCreatePackageObject(pkg: any): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pkg),
      });
      if (res.ok) {
        await loadAll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function handleDeletePackageById(pkgId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/packages/${pkgId}`, { method: "DELETE" });
      if (res.ok) {
        await loadAll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function handleCreateCouponObject(coupon: any): Promise<boolean> {
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coupon),
      });
      if (res.ok) {
        await loadAll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function handleDeleteCouponById(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadAll();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function handleTogglePackageActive(pkg: any): Promise<boolean> {
    setPackageSaving(pkg.id);
    try {
      await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      await loadAll();
      return true;
    } catch {
      return false;
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

  function modeFor(provider: string, current: "LIVE" | "SANDBOX"): "LIVE" | "SANDBOX" {
    return providerMode[provider] ?? current;
  }

  function updateProviderDraft(provider: string, mode: "LIVE" | "SANDBOX", field: string, value: string) {
    const key = `${provider}_${mode}`;
    setProviderDrafts((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  async function handleSaveProviderCredentials(provider: string, mode: "LIVE" | "SANDBOX", label: string) {
    const draft = providerDrafts[`${provider}_${mode}`];
    if (!draft || Object.keys(draft).length === 0) return;
    setProviderSaving(provider);
    try {
      await fetch("/api/admin/payment-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, label, credentials: draft, credentialMode: mode }),
      });
      setProviderDrafts((prev) => {
        const next = { ...prev };
        delete next[`${provider}_${mode}`];
        return next;
      });
      await loadAll();
    } finally {
      setProviderSaving(null);
    }
  }

  async function handleToggleProviderActive(providerRow: PaymentProviderRow) {
    setProviderSaving(providerRow.provider);
    try {
      await fetch(`/api/admin/payment-providers/${providerRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !providerRow.isActive }),
      });
      await loadAll();
    } finally {
      setProviderSaving(null);
    }
  }

  function requestModeSwitch(provider: string, nextMode: "LIVE" | "SANDBOX") {
    if (nextMode === "LIVE") {
      setPendingLiveConfirm(provider);
      return;
    }
    setProviderMode((prev) => ({ ...prev, [provider]: nextMode }));
  }

  async function confirmSwitchToLive(providerRow: PaymentProviderRow) {
    setPendingLiveConfirm(null);
    setProviderMode((prev) => ({ ...prev, [providerRow.provider]: "LIVE" }));
    setProviderSaving(providerRow.provider);
    try {
      await fetch(`/api/admin/payment-providers/${providerRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "LIVE" }),
      });
      await loadAll();
    } finally {
      setProviderSaving(null);
    }
  }

  async function handleTestProviderConnection(providerRow: PaymentProviderRow, mode: "LIVE" | "SANDBOX") {
    setProviderSaving(providerRow.provider);
    setProviderTestResult((prev) => ({ ...prev, [providerRow.provider]: "Testing…" }));
    try {
      const res = await fetch(`/api/admin/payment-providers/${providerRow.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      setProviderTestResult((prev) => ({ ...prev, [providerRow.provider]: `${data.ok ? "✓" : "✗"} ${data.message}` }));
    } catch {
      setProviderTestResult((prev) => ({ ...prev, [providerRow.provider]: "✗ Network error." }));
    } finally {
      setProviderSaving(null);
    }
  }

  async function handleSaveAiKey(provider: AiProviderRow["provider"]) {
    const apiKey = aiKeyDrafts[provider];
    if (!apiKey) return;
    setAiActionLoading(provider);
    try {
      await fetch("/api/admin/ai-providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      setAiKeyDrafts((prev) => ({ ...prev, [provider]: "" }));
      await loadAll();
    } finally {
      setAiActionLoading(null);
    }
  }

  async function handleToggleAiActive(row: AiProviderRow) {
    setAiActionLoading(row.provider);
    try {
      await fetch("/api/admin/ai-providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: row.provider, isActive: !row.isActive }),
      });
      await loadAll();
    } finally {
      setAiActionLoading(null);
    }
  }

  async function handleSetAiPriority(row: AiProviderRow, priority: number) {
    setAiActionLoading(row.provider);
    try {
      await fetch("/api/admin/ai-providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: row.provider, priority }),
      });
      await loadAll();
    } finally {
      setAiActionLoading(null);
    }
  }

  async function handleSetAiDefaultModel(row: AiProviderRow, defaultModelId: string) {
    setAiActionLoading(row.provider);
    try {
      await fetch("/api/admin/ai-providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: row.provider, defaultModelId }),
      });
      await loadAll();
    } finally {
      setAiActionLoading(null);
    }
  }

  async function handleTestAiProvider(row: AiProviderRow) {
    setAiActionLoading(row.provider);
    setAiActionResult((prev) => ({ ...prev, [row.provider]: "Testing…" }));
    try {
      const res = await fetch(`/api/admin/ai-providers/${row.id}/test`, { method: "POST" });
      const data = await res.json();
      setAiActionResult((prev) => ({ ...prev, [row.provider]: `${data.ok ? "✓" : "✗"} ${data.message}` }));
      await loadAll();
    } catch {
      setAiActionResult((prev) => ({ ...prev, [row.provider]: "✗ Network error." }));
    } finally {
      setAiActionLoading(null);
    }
  }

  async function handleRefreshAiModels(row: AiProviderRow) {
    setAiActionLoading(row.provider);
    setAiActionResult((prev) => ({ ...prev, [row.provider]: "Refreshing…" }));
    try {
      const res = await fetch(`/api/admin/ai-providers/${row.id}/refresh-models`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setAiActionResult((prev) => ({ ...prev, [row.provider]: `✗ ${data.error || "Refresh failed."}` }));
        return;
      }
      setAiActionResult((prev) => ({
        ...prev,
        [row.provider]: `✓ ${data.modelCount} model(s) loaded${data.defaultChanged ? " — default model updated" : ""}.`,
      }));
      await loadAll();
    } catch {
      setAiActionResult((prev) => ({ ...prev, [row.provider]: "✗ Network error." }));
    } finally {
      setAiActionLoading(null);
    }
  }

  function timeAgo(iso: string | null): string {
    if (!iso) return "never";
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  async function handleSaveEmailSettings(e: React.FormEvent) {
    e.preventDefault();
    setEmailSettingsSaving(true);
    setEmailSettingsResult(null);
    try {
      const body: Record<string, unknown> = {
        host: emailSettingsDraft.host ?? emailSettings?.host,
        port: Number(emailSettingsDraft.port ?? emailSettings?.port ?? 587),
        secure: (emailSettingsDraft.secure ?? String(emailSettings?.secure ?? false)) === "true",
        username: emailSettingsDraft.username ?? emailSettings?.username,
        fromEmail: emailSettingsDraft.fromEmail ?? emailSettings?.fromEmail,
        fromName: emailSettingsDraft.fromName ?? emailSettings?.fromName ?? "SellerSalt",
        isActive: (emailSettingsDraft.isActive ?? String(emailSettings?.isActive ?? true)) === "true",
      };
      if (emailSettingsDraft.password) body.password = emailSettingsDraft.password;

      const res = await fetch("/api/admin/email-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailSettingsResult(data.error || "Could not save email settings.");
        return;
      }
      setEmailSettingsDraft({});
      setEmailSettingsResult("Saved.");
      await loadAll();
    } catch {
      setEmailSettingsResult("Network error.");
    } finally {
      setEmailSettingsSaving(false);
    }
  }

  async function handleTestSmtp() {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/admin/email-settings/test", { method: "POST" });
      const data = await res.json();
      setSmtpTestResult(res.ok ? "✓ Test email sent — check your inbox." : `✗ ${data.error || "Failed to send."}`);
    } catch {
      setSmtpTestResult("✗ Network error.");
    } finally {
      setSmtpTesting(false);
    }
  }

  async function handleSaveSetting(key: string) {
    const value = settingDrafts[key] ?? "";
    await handleSaveSettingDirect(key, value);
  }

  async function handleSaveSettingDirect(key: string, value: string): Promise<boolean> {
    setSettingSaving(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      setSettingSaving(null);
      if (res.ok) {
        await loadAll();
        return true;
      }
      return false;
    } catch {
      setSettingSaving(null);
      return false;
    }
  }

  async function handleUploadGenericImage(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append("key", "app_logo_url");
      formData.append("file", file);
      const res = await fetch("/api/admin/settings/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      await loadAll();
      return data.url as string;
    } catch {
      return null;
    }
  }

  async function handleUploadImageSetting(key: string, file: File) {
    setImageUploading(key);
    setImageUploadError((prev) => ({ ...prev, [key]: "" }));
    try {
      const formData = new FormData();
      formData.append("key", key);
      formData.append("file", file);
      const res = await fetch("/api/admin/settings/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setSettingDrafts((prev) => ({ ...prev, [key]: data.url }));
      await loadAll();
    } catch (err: any) {
      setImageUploadError((prev) => ({ ...prev, [key]: err.message || "Upload failed." }));
    } finally {
      setImageUploading(null);
    }
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

  const filteredOrgs = orgs.filter((o) => {
    if (!orgSearch.trim()) return true;
    const q = orgSearch.toLowerCase();
    return o.name.toLowerCase().includes(q) || (o.ownerEmail && o.ownerEmail.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <IconButton
              icon={sidebarCollapsed ? <PanelLeft className="w-4 h-4 text-[#0E8F5D]" /> : <PanelLeftClose className="w-4 h-4 text-ink-secondary" />}
              variant="tertiary"
              size="compact"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
              className="hidden lg:inline-flex bg-white border border-line shadow-xs"
            />
            <Heading as="h1" size="h2">
              Admin Operations Console
            </Heading>
            <Badge variant="neutral" className="bg-[#141B16] text-white border-[#2A362D] text-[10px] uppercase font-bold tracking-wider">
              Internal Surface
            </Badge>
          </div>
          <Text size="body-md" color="secondary" className="mt-1">
            Real-time platform telemetry, multi-tenant workspace management, user security, and operations command.
          </Text>
        </div>
        <Button
          variant="secondary"
          size="compact"
          onClick={() => {
            loadAll();
            searchUsers(userSearch);
          }}
          className="self-start sm:self-auto text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Telemetry
        </Button>
      </div>

      {/* 2-Column Responsive Layout with Sticky & Collapsible AdminSidebar */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          userCount={users.length}
          orgCount={orgs.length}
          unverifiedCount={needsAttentionUnverified.length}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* 1. OPERATIONS OVERVIEW */}
          {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Level 1 — Needs Attention / Operations Banner */}
          <div className="rounded-2xl border border-[#2A362D] bg-[#141B16] text-white p-6 shadow-md">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-[#0E8F5D] animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0E8F5D]">
                    Operations Command Center
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {needsAttentionUnverified.length > 0
                    ? `${needsAttentionUnverified.length} Account${needsAttentionUnverified.length === 1 ? "" : "s"} Require Verification Action`
                    : "All Platform Accounts Operational"}
                </h2>
                <p className="text-xs text-[#9EAA9F] leading-relaxed">
                  {needsAttentionUnverified.length > 0
                    ? "New accounts have been created and are awaiting email confirmation to unlock complete workspace features."
                    : "Zero pending verification alerts. All tenant workspaces and account security checks are healthy."}
                </p>
              </div>

              {needsAttentionUnverified.length > 0 ? (
                <div className="bg-[#1C261F] border border-[#2A362D] rounded-xl p-3.5 space-y-2.5 min-w-[280px]">
                  <div className="text-label-sm font-semibold text-[#9EAA9F] uppercase tracking-wider">
                    Pending Unverified Users
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {needsAttentionUnverified.slice(0, 3).map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#141B16] border border-[#2A362D] text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{u.email}</div>
                          <div className="text-meta text-[#9EAA9F]">
                            Sent {u.verificationEmailCount ?? 0} time(s) · Created {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="compact"
                          loading={userActionLoading === u.id}
                          disabled={userActionLoading !== null}
                          onClick={() => handleSendVerification(u.id)}
                          className="text-label-sm !py-1 !px-2 bg-white text-ink hover:bg-[#F4F3EF] shrink-0 disabled:opacity-50"
                        >
                          Resend
                        </Button>
                      </div>
                    ))}
                  </div>
                  {needsAttentionUnverified.length > 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("users");
                        setUserStatusFilter("unverified");
                        searchUsers("", "unverified");
                      }}
                      className="text-label-sm text-[#0E8F5D] hover:underline font-semibold block text-center w-full pt-1"
                    >
                      View all {needsAttentionUnverified.length} unverified users →
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-[#1C261F] border border-[#2A362D] rounded-xl p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#0E8F5D]/20 text-[#0E8F5D] flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Platform Health: 100%</div>
                    <div className="text-label-sm text-[#9EAA9F]">All accounts verified</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Level 2 — Platform Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Accounts */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between text-label-sm font-bold text-ink-tertiary uppercase">
                <span>Total Accounts</span>
                <Users className="h-4 w-4 text-[#0E8F5D]" />
              </div>
              <div className="text-2xl font-extrabold text-ink font-mono">
                {metrics?.totalUsers ?? 0}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-1.5 py-0.5 rounded text-label-sm font-semibold bg-[#E7FAF1] text-[#0E8F5D]">
                  {metrics?.verifiedUsers ?? 0} Verified
                </span>
                {(metrics?.unverifiedUsers ?? 0) > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-label-sm font-semibold bg-[#FFF8E6] text-[#B87D00]">
                    {metrics?.unverifiedUsers ?? 0} Unverified
                  </span>
                )}
                {(metrics?.recentSignups7d ?? 0) > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-label-sm font-medium bg-[#F4F3EF] text-ink-secondary">
                    +{metrics?.recentSignups7d} 7d
                  </span>
                )}
              </div>
            </Card>

            {/* Workspaces */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between text-label-sm font-bold text-ink-tertiary uppercase">
                <span>Tenant Workspaces</span>
                <Building className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-ink font-mono">
                {metrics?.totalOrgs ?? 0}
              </div>
              <div className="text-meta text-ink-secondary">
                {metrics?.totalUsers && metrics.totalOrgs
                  ? `~${(metrics.totalUsers / metrics.totalOrgs).toFixed(1)} users / workspace`
                  : "Multi-tenant workspace isolation"}
              </div>
            </Card>

            {/* Subscriptions & MRR */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between text-label-sm font-bold text-ink-tertiary uppercase">
                <span>Estimated MRR</span>
                <DollarSign className="h-4 w-4 text-[#0E8F5D]" />
              </div>
              <div className="text-2xl font-extrabold text-ink font-mono">
                ${metrics?.estimatedMrr?.toLocaleString() ?? 0}
              </div>
              <div className="text-meta text-ink-secondary">
                From {metrics?.activeSubscriptions ?? 0} active subscriptions
              </div>
            </Card>

            {/* Connected Etsy Shops */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between text-label-sm font-bold text-ink-tertiary uppercase">
                <span>Connected Etsy Stores</span>
                <Store className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-extrabold text-ink font-mono">
                {metrics?.connectedEtsyShops ?? 0}
              </div>
              <div className="text-meta text-ink-secondary">
                Active Etsy OAuth seller authorizations
              </div>
            </Card>
          </div>

          {/* Level 3 — Recent Platform Activity (Audit Log) */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Heading as="h2" size="h4" className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#0E8F5D]" /> Recent Platform Activity & Audit Trail
                </Heading>
                <Text size="body-sm" color="secondary" className="mt-0.5">
                  Chronological log of administrative actions, user creation, and security verifications.
                </Text>
              </div>
              <Button
                variant="secondary"
                size="compact"
                onClick={loadAll}
                className="text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
            </div>

            {recentAuditLogs.length > 0 ? (
              <div className="overflow-x-auto border border-line rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary font-semibold">
                    <tr>
                      <th className="p-3">Event</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle">
                    {recentAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FAFAF8]">
                        <td className="p-3 font-semibold text-ink">
                          <Badge
                            variant={
                              log.event.includes("VERIFIED")
                                ? "success"
                                : log.event.includes("ADMIN")
                                ? "neutral"
                                : "neutral"
                            }
                          >
                            {log.event}
                          </Badge>
                        </td>
                        <td className="p-3 text-ink-secondary">{log.actorEmail || "System / User"}</td>
                        <td className="p-3 text-ink-secondary">{log.targetEmail || "—"}</td>
                        <td className="p-3 text-ink-tertiary">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-line rounded-lg text-ink-secondary text-xs">
                No recent administrative activity recorded yet.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 2. USERS DIRECTORY */}
      {activeTab === "users" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <Heading as="h2" size="h4">
                User Management Directory
              </Heading>
              <Text size="body-sm" color="secondary" className="mt-0.5">
                Inspect accounts, manage workspace roles, send verification emails, or inspect security credentials.
              </Text>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Filter Tabs */}
              <div className="inline-flex rounded-lg border border-line p-0.5 bg-[#FAFAF8] text-xs">
                {(["all", "verified", "unverified", "suspended"] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => {
                      setUserStatusFilter(filterKey);
                      searchUsers(userSearch, filterKey);
                    }}
                    className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-colors ${
                      userStatusFilter === filterKey
                        ? "bg-white text-ink shadow-2xs"
                        : "text-ink-secondary hover:text-ink"
                    }`}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-56">
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

              <Button
                variant="primary"
                size="compact"
                onClick={() => {
                  setShowCreateUserModal(true);
                  setCreateUserError(null);
                  setCreateUserSuccess(null);
                }}
                className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold shrink-0 text-white"
              >
                + Create User
              </Button>
            </div>
          </div>

          {userActionError && <Alert variant="danger">{userActionError}</Alert>}
          {userActionSuccess && <Alert variant="success">{userActionSuccess}</Alert>}

          {users.length > 0 ? (
            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary font-semibold">
                  <tr>
                    <th className="p-3">User & Contact</th>
                    <th className="p-3">Verification</th>
                    <th className="p-3">Workspace & Role</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Security & Auth</th>
                    <th className="p-3">Joined</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {users.map((u) => {
                    const initials = (u.name || u.email || "U").substring(0, 2).toUpperCase();
                    return (
                      <tr key={u.id} className={`hover:bg-[#FAFAF8] ${u.suspended ? "bg-red-50/20" : ""}`}>
                        <td className="p-3">
                          <div className="flex flex-col gap-1.5 min-w-0">
                            <div className="flex items-center gap-2.5">
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt={u.name || u.email}
                                  className="h-8 w-8 rounded-lg object-cover border border-line shrink-0"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-[#141B16] text-[#0E8F5D] flex items-center justify-center font-bold text-xs shrink-0">
                                  {initials}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-ink flex items-center gap-1.5 text-sm">
                                  {u.name || "—"}
                                  {u.suspended && <Badge variant="danger">Suspended</Badge>}
                                </div>
                                <div className="text-ink-tertiary text-meta font-mono">{u.email}</div>
                              </div>
                            </div>

                            {/* Inline Second-Row Action Buttons */}
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              <button
                                type="button"
                                onClick={() => openUserDetail(u.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-[#F4F3EF] border border-line text-label-sm font-bold text-ink transition"
                                title="Inspect user dossier"
                              >
                                <Eye className="h-2.5 w-2.5 text-ink-tertiary" /> Inspect
                              </button>

                              {!u.emailVerified && (
                                <button
                                  type="button"
                                  disabled={userActionLoading !== null}
                                  onClick={() => handleSendVerification(u.id)}
                                  className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-label-sm font-bold text-amber-800 transition"
                                  title="Send verification email link"
                                >
                                  Send Verify
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleChangeEmail(u.id, u.email)}
                                className="px-2 py-0.5 rounded bg-white hover:bg-[#F4F3EF] border border-line text-label-sm font-bold text-ink transition"
                                title="Change email address"
                              >
                                Edit Email
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUserAction(u.id, { suspended: !u.suspended })}
                                className={`px-2 py-0.5 rounded border text-label-sm font-bold transition ${
                                  u.suspended
                                    ? "bg-[#E7FAF1] border-[#0E8F5D]/30 text-[#0E8F5D]"
                                    : "bg-white hover:bg-amber-50 border-line text-amber-700"
                                }`}
                                title={u.suspended ? "Unsuspend account" : "Suspend account"}
                              >
                                {u.suspended ? "Unsuspend" : "Suspend"}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                className="px-2 py-0.5 rounded bg-white hover:bg-red-50 border border-line text-label-sm font-bold text-red-600 transition"
                                title="Delete user"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {u.emailVerified ? (
                            <Badge variant="success">✓ Verified</Badge>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="warning">⚠ Unverified</Badge>
                              <span className="text-meta text-ink-tertiary">
                                Sent {u.verificationEmailCount ?? 0} time(s)
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-ink text-sm">{u.organizationName}</div>
                          <select
                            value={u.role}
                            disabled={!u.membershipId || userActionLoading === u.id}
                            onChange={(e) => handleUserAction(u.id, { role: e.target.value })}
                            className="font-mono text-label-sm border border-line rounded px-1.5 py-0.5 bg-white disabled:opacity-50 mt-1"
                          >
                            <option value="OWNER">OWNER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="MEMBER">MEMBER</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            value={packages.find((p) => p.name === u.planName)?.id ?? ""}
                            disabled={!u.organizationId || userActionLoading === u.id}
                            onChange={(e) => e.target.value && handleUserAction(u.id, { packageId: e.target.value })}
                            className="text-sm border border-line rounded px-1.5 py-1 bg-white disabled:opacity-50 max-w-[110px]"
                          >
                            <option value="" disabled>{u.planName}</option>
                            {packages.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <div className="mt-1">
                            <Badge variant={u.subscriptionStatus === "ACTIVE" || u.subscriptionStatus === "TRIALING" ? "success" : "warning"}>
                              {u.subscriptionStatus}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-0.5 text-sm">
                            <span className="text-ink-secondary capitalize">
                              {u.authMethods.length ? u.authMethods.join(", ") : "Password"}
                            </span>
                            <span className="text-meta text-ink-tertiary">
                              Last login: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                            </span>
                            {u.etsyConnected && (
                              <span className="text-label-sm text-[#0E8F5D] font-semibold">Etsy store connected</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-ink-tertiary text-sm">{new Date(u.memberSince).toLocaleDateString()}</td>
                        <td className="p-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <Button
                              variant="secondary"
                              size="compact"
                              onClick={() => openUserDetail(u.id)}
                              className="text-sm"
                              title="Inspect full user profile and security dossier"
                            >
                              <Eye className="h-3 w-3 mr-1" /> Inspect
                            </Button>
                            {!u.emailVerified && (
                              <Button
                                variant="secondary"
                                size="compact"
                                loading={userActionLoading === u.id}
                                disabled={userActionLoading !== null}
                                onClick={() => handleSendVerification(u.id)}
                                className="text-sm disabled:opacity-50"
                                title="Resend email verification link without cooldown"
                              >
                                Send Verify
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="compact"
                              loading={userActionLoading === u.id}
                              onClick={() => handleChangeEmail(u.id, u.email)}
                              className="text-sm"
                            >
                              Email
                            </Button>
                            <Button
                              variant="secondary"
                              size="compact"
                              loading={userActionLoading === u.id}
                              onClick={() => handleUserAction(u.id, { suspended: !u.suspended })}
                              className={`text-sm ${u.suspended ? "text-[#0E8F5D]" : "text-amber-700"}`}
                            >
                              {u.suspended ? "Unsuspend" : "Suspend"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="compact"
                              loading={userActionLoading === u.id}
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="text-sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center border border-dashed border-line rounded-lg space-y-3">
              <Users className="h-8 w-8 text-ink-tertiary mx-auto" />
              <div className="text-sm font-semibold text-ink">
                No users found matching your search or filter
              </div>
              <p className="text-xs text-ink-secondary max-w-sm mx-auto">
                Try resetting your search query or switching from &quot;{userStatusFilter}&quot; to &quot;all&quot;.
              </p>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => {
                  setUserSearch("");
                  setUserStatusFilter("all");
                  searchUsers("", "all");
                }}
                className="text-xs"
              >
                Reset Search & Filters
              </Button>
            </div>
          )}

          {/* Manually Create User Dialog */}
          <Dialog
            open={showCreateUserModal}
            onClose={() => setShowCreateUserModal(false)}
            title="Create New User Account"
            description="Manually provision a tenant workspace and user account. Follows standard security policies."
          >
            <form onSubmit={handleCreateUser} className="space-y-4 pt-1">
              {createUserSuccess && <Alert variant="success">{createUserSuccess}</Alert>}
              {createUserError && <Alert variant="danger">{createUserError}</Alert>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Full Name"
                  placeholder="e.g. Sarah Connor"
                  value={createUserName}
                  onChange={(e) => setCreateUserName(e.target.value)}
                />
                <Input
                  label="Email Address"
                  type="email"
                  required
                  placeholder="sarah@example.com"
                  value={createUserEmail}
                  onChange={(e) => setCreateUserEmail(e.target.value)}
                />
              </div>

              <div>
                <Input
                  label="Initial Password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={createUserPassword}
                  onChange={(e) => setCreateUserPassword(e.target.value)}
                />
                <p className="text-[11px] text-ink-tertiary mt-1">
                  Use at least 8 characters, including an uppercase letter, a number, and a symbol.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Workspace Name"
                  placeholder="Defaults to Name's Workspace"
                  value={createUserOrgName}
                  onChange={(e) => setCreateUserOrgName(e.target.value)}
                />
                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">
                    Workspace Role
                  </label>
                  <select
                    value={createUserRole}
                    onChange={(e) => setCreateUserRole(e.target.value as any)}
                    className="w-full h-9 rounded-lg border border-line bg-white px-3 text-xs text-ink focus:outline-hidden"
                  >
                    <option value="OWNER">OWNER (Full control)</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sendVerification"
                  checked={createUserSendVerification}
                  onChange={(e) => setCreateUserSendVerification(e.target.checked)}
                  className="rounded border-line text-[#0E8F5D] focus:ring-[#0E8F5D] h-4 w-4"
                />
                <label htmlFor="sendVerification" className="text-xs text-ink-secondary">
                  Send verification email immediately to user
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line-subtle">
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={() => setShowCreateUserModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="compact"
                  loading={createUserLoading}
                  className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold text-white"
                >
                  Create User
                </Button>
              </div>
            </form>
          </Dialog>

          {/* User Detail & Dossier Modal (Task 4) */}
          <Dialog
            open={Boolean(selectedUserDetailId)}
            onClose={() => {
              setSelectedUserDetailId(null);
              setUserDetail(null);
            }}
            title="User Account & Security Dossier"
            description="Complete operational inspection of identity, tenancy, security credentials, and audit logs."
            size="lg"
          >
            {userDetailLoading ? (
              <div className="p-8 text-center text-xs text-ink-secondary">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#0E8F5D]" />
                Loading user dossier...
              </div>
            ) : userDetailError ? (
              <Alert variant="danger">{userDetailError}</Alert>
            ) : userDetail ? (
              <div className="space-y-6 pt-2 max-h-[75vh] overflow-y-auto pr-1">
                {/* Header Identity */}
                <div className="flex items-start justify-between p-4 rounded-xl bg-[#FAFAF8] border border-line">
                  <div className="flex items-center gap-3.5">
                    {userDetail.avatarUrl ? (
                      <img
                        src={userDetail.avatarUrl}
                        alt={userDetail.name || userDetail.email}
                        className="h-14 w-14 rounded-xl object-cover border border-line"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-[#141B16] text-[#0E8F5D] flex items-center justify-center font-bold text-lg">
                        {(userDetail.name || userDetail.email || "U").substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-base font-bold text-ink flex items-center gap-2">
                        {userDetail.name || "SellerSalt User"}
                        {userDetail.suspended && <Badge variant="danger">Suspended</Badge>}
                        {userDetail.emailVerified ? (
                          <Badge variant="success">✓ Verified</Badge>
                        ) : (
                          <Badge variant="warning">⚠ Unverified</Badge>
                        )}
                      </div>
                      <div className="text-xs text-ink-secondary">{userDetail.email}</div>
                      <div className="text-[11px] text-ink-tertiary mt-1">
                        Member since {new Date(userDetail.createdAt).toLocaleDateString()} · Account ID: {userDetail.id}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workspace Tenancy */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-ink uppercase tracking-wider">
                    Workspace Tenancy ({userDetail.memberships?.length || 0})
                  </div>
                  {userDetail.memberships?.map((m: any) => (
                    <div key={m.id} className="p-3.5 rounded-xl border border-line bg-white space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-ink">{m.organization?.name}</div>
                        <Badge variant="neutral">{m.role}</Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-ink-secondary pt-1 border-t border-line-subtle">
                        <div>
                          <span className="text-ink-tertiary block">Plan Tier:</span>
                          <span className="font-semibold text-ink">{m.organization?.package?.name || "Started"}</span>
                        </div>
                        <div>
                          <span className="text-ink-tertiary block">Subscription:</span>
                          <span className="font-semibold text-ink">{m.organization?.subscription?.status || "INCOMPLETE"}</span>
                        </div>
                        <div>
                          <span className="text-ink-tertiary block">Connected Store:</span>
                          <span className="font-semibold text-ink">
                            {m.organization?.sellerChannels?.[0]?.status === "ACTIVE" ? "✓ Etsy Active" : "None"}
                          </span>
                        </div>
                        <div>
                          <span className="text-ink-tertiary block">Hunting Usage:</span>
                          <span className="font-semibold text-ink">
                            {m.organization?.usage?.prospects ?? 0} prospects
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sign-In Security & Passkeys */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-ink uppercase tracking-wider">
                    Sign-In Security & Passkeys
                  </div>
                  <div className="p-3.5 rounded-xl border border-line bg-white space-y-3 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-ink-secondary">Sign-in methods used:</span>
                      <span className="font-semibold text-ink capitalize">
                        {userDetail.authMethods?.length ? userDetail.authMethods.join(", ") : "Password credentials"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-ink-secondary">Last login timestamp:</span>
                      <span className="font-semibold text-ink">
                        {userDetail.lastLoginAt ? new Date(userDetail.lastLoginAt).toLocaleString() : "Never recorded"}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-line-subtle">
                      <div className="text-[11px] font-semibold text-ink mb-1.5">
                        Registered Passkey Hardware / Biometrics ({userDetail.passkeys?.length || 0})
                      </div>
                      {userDetail.passkeys && userDetail.passkeys.length > 0 ? (
                        <div className="space-y-1.5">
                          {userDetail.passkeys.map((pk: any) => (
                            <div key={pk.id} className="p-2 rounded-lg bg-[#FAFAF8] border border-line text-[11px] flex items-center justify-between">
                              <span className="font-semibold text-ink">{pk.name || "Device Passkey"}</span>
                              <span className="text-ink-tertiary">
                                Added {new Date(pk.createdAt).toLocaleDateString()}
                                {pk.lastUsedAt ? ` · Last used ${new Date(pk.lastUsedAt).toLocaleDateString()}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-ink-tertiary">No passkeys registered on this account.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification Lifecycle */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-ink uppercase tracking-wider">
                    Verification History
                  </div>
                  <div className="p-3.5 rounded-xl border border-line bg-white grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-ink-tertiary text-[11px] block">Status:</span>
                      <span className="font-semibold text-ink">
                        {userDetail.emailVerified ? "✓ Verified" : "⚠ Pending Confirmation"}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-tertiary text-[11px] block">Emails Sent:</span>
                      <span className="font-semibold text-ink">
                        {userDetail.verificationEmailCount ?? 0} time(s) (Unrestricted Admin Resend)
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-tertiary text-[11px] block">Last Email Sent:</span>
                      <span className="font-semibold text-ink">
                        {userDetail.lastVerificationEmailAt
                          ? new Date(userDetail.lastVerificationEmailAt).toLocaleString()
                          : "Never"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit History */}
                {userDetail.recentAuditLogs && userDetail.recentAuditLogs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-ink uppercase tracking-wider">
                      Audit Trail for User
                    </div>
                    <div className="overflow-x-auto border border-line rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary">
                          <tr>
                            <th className="p-2">Event</th>
                            <th className="p-2">Actor</th>
                            <th className="p-2">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line-subtle text-[11px]">
                          {userDetail.recentAuditLogs.map((log: any) => (
                            <tr key={log.id}>
                              <td className="p-2 font-semibold text-ink">{log.event}</td>
                              <td className="p-2 text-ink-secondary">{log.actorEmail || "System"}</td>
                              <td className="p-2 text-ink-tertiary">{new Date(log.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line">
                  <div className="flex items-center gap-2">
                    {!userDetail.emailVerified && (
                      <Button
                        variant="secondary"
                        size="compact"
                        loading={userActionLoading === userDetail.id}
                        disabled={userActionLoading !== null}
                        onClick={async () => {
                          await handleSendVerification(userDetail.id);
                          openUserDetail(userDetail.id);
                        }}
                        className="text-xs disabled:opacity-50"
                      >
                        Resend Verification Email
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="compact"
                      loading={userActionLoading === userDetail.id}
                      onClick={async () => {
                        await handleUserAction(userDetail.id, { suspended: !userDetail.suspended });
                        openUserDetail(userDetail.id);
                      }}
                      className="text-xs"
                    >
                      {userDetail.suspended ? "Unsuspend User" : "Suspend User"}
                    </Button>
                  </div>
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => {
                      setSelectedUserDetailId(null);
                      setUserDetail(null);
                    }}
                    className="text-xs"
                  >
                    Close Dossier
                  </Button>
                </div>
              </div>
            ) : null}
          </Dialog>
        </Card>
      )}

      {/* 3. WORKSPACES */}
      {activeTab === "orgs" && (
        <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Heading as="h2" size="h4">
                Tenant Workspaces ({orgs.length})
              </Heading>
              <Text size="body-sm" color="secondary" className="mt-0.5">
                Overview of all multi-tenant organizations, subscribed plan tiers, and platform load.
              </Text>
            </div>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search workspace or owner..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {orgActionError && <Alert variant="danger">{orgActionError}</Alert>}

          {filteredOrgs.length > 0 ? (
            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAF8] border-b border-line text-ink-secondary font-semibold">
                  <tr>
                    <th className="p-3">Workspace</th>
                    <th className="p-3">Owner Contact</th>
                    <th className="p-3">Members</th>
                    <th className="p-3">Plan Tier</th>
                    <th className="p-3">Subscription</th>
                    <th className="p-3">Hunting & Search Usage</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {filteredOrgs.map((o) => (
                    <tr key={o.id} className="hover:bg-[#FAFAF8]">
                      <td className="p-3 font-bold text-ink">
                        <div>{o.name}</div>
                        <div className="text-[10px] text-ink-tertiary font-mono">{o.id}</div>
                      </td>
                      <td className="p-3 text-ink-secondary">{o.ownerEmail || "—"}</td>
                      <td className="p-3 font-semibold text-ink">{o.membersCount ?? 1}</td>
                      <td className="p-3">
                        <select
                          value={o.package?.id ?? ""}
                          disabled={orgActionLoading === o.id}
                          onChange={(e) => e.target.value && handleOrgAction(o.id, "PATCH", { packageId: e.target.value })}
                          className="text-[11px] border border-line rounded px-1.5 py-1 bg-white disabled:opacity-50 max-w-[110px]"
                        >
                          <option value="" disabled>{o.package?.name ?? "Starter"}</option>
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
                        {o.usage?.prospects ?? 0} prospects · {o.usage?.searchConfigs ?? 0} streams · {o.usage?.trackedShops ?? 0} tracked
                      </td>
                      <td className="p-3 text-ink-tertiary">{new Date(o.createdAt).toLocaleDateString()}</td>
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
          ) : (
            <div className="p-10 text-center border border-dashed border-line rounded-lg space-y-2">
              <Building className="h-8 w-8 text-ink-tertiary mx-auto" />
              <div className="text-sm font-semibold text-ink">No workspaces found matching &quot;{orgSearch}&quot;</div>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setOrgSearch("")}
                className="text-xs mt-2"
              >
                Clear Search
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* 4. PACKAGES & PLANS */}
      {activeTab === "packages" && (
        <PlansQuotasView
          packages={packages}
          onSavePackage={handleSavePackageObject}
          onCreatePackage={handleCreatePackageObject}
          onDeletePackage={handleDeletePackageById}
          onToggleActive={handleTogglePackageActive}
        />
      )}

      {/* 5. COUPONS */}
      {activeTab === "coupons" && (
        <CouponsView
          coupons={coupons}
          onCreateCoupon={handleCreateCouponObject}
          onDeleteCoupon={handleDeleteCouponById}
        />
      )}

      {/* 5.1 API PROVIDERS DIRECTORY */}
      {activeTab === "ai" && (
        <ApiProvidersView />
      )}

      {/* 6. OFFICIAL PAYMENT GATEWAYS */}
      {activeTab === "payments" && (
        <div className="space-y-5">
          <Text size="body-sm" color="secondary">
            SellerSalt is the merchant of record — these are your own gateway credentials (from each provider's dashboard), not a marketplace/Connect authorization. Live and Sandbox credentials are stored separately; switching to Live requires confirmation.
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(["STRIPE", "PAYPAL", "SAFEPAY", "PAYFAST"] as const).map((providerKey) => {
              const meta = PROVIDER_META[providerKey];
              const row = paymentProviders.find((p) => p.provider === providerKey);
              const currentMode = row ? modeFor(providerKey, row.mode) : "SANDBOX";
              const hasCredsForMode = row
                ? currentMode === "LIVE" ? row.hasLiveCredentials : row.hasSandboxCredentials
                : false;
              const draft = providerDrafts[`${providerKey}_${currentMode}`] ?? {};

              return (
                <Card key={providerKey} padding="lg" className="border-line bg-white shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[#F4F3EF] flex items-center justify-center text-ink font-extrabold">
                        {meta.label[0]}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-ink">{meta.label}</div>
                        <div className="text-xs text-ink-tertiary">{meta.description}</div>
                      </div>
                    </div>
                    <a href={meta.dashboardUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink-tertiary hover:text-ink flex items-center gap-1">
                      Dashboard <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => requestModeSwitch(providerKey, "SANDBOX")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${currentMode === "SANDBOX" ? "bg-[#141B16] text-white" : "bg-surface-muted text-ink-secondary"}`}
                    >
                      Sandbox
                    </button>
                    <button
                      type="button"
                      onClick={() => requestModeSwitch(providerKey, "LIVE")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${currentMode === "LIVE" ? "bg-[#B42318] text-white" : "bg-surface-muted text-ink-secondary"}`}
                    >
                      Live
                    </button>
                    {row && (
                      <Badge variant={row.isActive ? "success" : "neutral"} className="ml-auto">
                        {row.isActive ? `Active (${row.mode})` : "Inactive"}
                      </Badge>
                    )}
                  </div>

                  {pendingLiveConfirm === providerKey && (
                    <Alert variant="warning">
                      Switching to LIVE will process real charges once active. Confirm?
                      <div className="flex gap-2 mt-2">
                        <Button size="compact" variant="destructive" onClick={() => row && confirmSwitchToLive(row)} className="text-[11px]">Confirm Live</Button>
                        <Button size="compact" variant="secondary" onClick={() => setPendingLiveConfirm(null)} className="text-[11px]">Cancel</Button>
                      </div>
                    </Alert>
                  )}

                  <div className="p-3 bg-[#FAFAF8] rounded-lg border border-line-subtle space-y-2">
                    {PROVIDER_FIELDS[providerKey]!.map((field) => (
                      <div key={field.key} className="flex items-center gap-2">
                        <label className="text-[11px] text-ink-tertiary w-32 shrink-0">{field.label}</label>
                        <input
                          type={field.secret ? "password" : "text"}
                          value={draft[field.key] ?? ""}
                          onChange={(e) => updateProviderDraft(providerKey, currentMode, field.key, e.target.value)}
                          placeholder={hasCredsForMode ? "••••••••" : `Enter ${field.label}`}
                          className="flex-1 text-xs border border-line rounded px-2 py-1 font-mono"
                        />
                      </div>
                    ))}
                  </div>

                  {providerTestResult[providerKey] && (
                    <p className="text-[11px] text-ink-secondary">{providerTestResult[providerKey]}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="compact"
                      loading={providerSaving === providerKey}
                      disabled={Object.keys(draft).length === 0}
                      onClick={() => handleSaveProviderCredentials(providerKey, currentMode, meta.label)}
                      className="text-[11px] bg-[#0E8F5D] hover:bg-[#0C7A52]"
                    >
                      Save {currentMode}
                    </Button>
                    <Button
                      variant="secondary"
                      size="compact"
                      loading={providerSaving === providerKey}
                      disabled={!hasCredsForMode && Object.keys(draft).length === 0}
                      onClick={() => row && handleTestProviderConnection(row, currentMode)}
                      className="text-[11px]"
                    >
                      Test Connection
                    </Button>
                    {row && (
                      <Button
                        variant="secondary"
                        size="compact"
                        loading={providerSaving === providerKey}
                        onClick={() => handleToggleProviderActive(row)}
                        className="text-[11px] ml-auto"
                      >
                        {row.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* AI PROVIDERS — SaltBot LLM fallback chain */}
      {activeTab === "ai" && (
        <div className="space-y-5">
          <Text size="body-sm" color="secondary">
            SaltBot tries active providers in priority order (lowest number first), using whichever model is selected below. Models are fetched live from each provider's own catalog — never hardcoded — so "Refresh Models" is how a broken/renamed model ID gets fixed.
          </Text>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...aiProviders].sort((a, b) => a.priority - b.priority).map((row) => {
              const result = aiActionResult[row.provider];
              const busy = aiActionLoading === row.provider;
              return (
                <Card key={row.provider} padding="lg" className="border-line bg-white shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-ink">{row.label}</div>
                      <div className="text-[11px] text-ink-tertiary mt-0.5">
                        Models last updated: {timeAgo(row.modelsLastFetchedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-ink-tertiary uppercase">Priority</label>
                      <input
                        type="number"
                        min="1"
                        value={row.priority}
                        disabled={busy}
                        onChange={(e) => handleSetAiPriority(row, Number(e.target.value))}
                        className="w-14 text-xs border border-line rounded px-1.5 py-1"
                      />
                      <Badge variant={row.isActive && row.hasApiKey ? "success" : "neutral"}>
                        {row.isActive && row.hasApiKey ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={aiKeyDrafts[row.provider] ?? ""}
                      onChange={(e) => setAiKeyDrafts((prev) => ({ ...prev, [row.provider]: e.target.value }))}
                      placeholder={row.hasApiKey ? "••••••••••••" : "Enter API key"}
                      className="flex-1 text-xs border border-line rounded px-2 py-1.5 font-mono"
                    />
                    <Button
                      variant="secondary"
                      size="compact"
                      loading={busy}
                      disabled={!aiKeyDrafts[row.provider]}
                      onClick={() => handleSaveAiKey(row.provider)}
                      className="text-[11px] shrink-0"
                    >
                      Save Key
                    </Button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-ink-tertiary uppercase">Default Model</label>
                    <select
                      value={row.defaultModelId ?? ""}
                      disabled={busy || row.models.length === 0}
                      onChange={(e) => handleSetAiDefaultModel(row, e.target.value)}
                      className="w-full text-xs border border-line rounded px-2 py-1.5 bg-white mt-1 disabled:opacity-50"
                    >
                      {row.models.length === 0 ? (
                        <option value="">No models loaded yet — click Refresh Models</option>
                      ) : (
                        row.models.map((m) => (
                          <option key={m.modelId} value={m.modelId}>
                            {m.displayName}
                            {m.isFree ? " (free)" : m.inputPricePerMillion != null ? ` ($${m.inputPricePerMillion.toFixed(2)}/1M in)` : ""}
                            {m.contextLength ? ` · ${(m.contextLength / 1000).toFixed(0)}k ctx` : ""}
                          </option>
                        ))
                      )}
                    </select>
                    {row.models.length > 0 && (
                      <div className="text-[11px] text-ink-tertiary mt-1">{row.models.length} model(s) available</div>
                    )}
                  </div>

                  {result && <p className="text-[11px] text-ink-secondary">{result}</p>}
                  {!result && row.lastTestMessage && (
                    <p className="text-[11px] text-ink-tertiary">
                      Last check ({timeAgo(row.lastTestedAt)}): {row.lastTestOk ? "✓" : "✗"} {row.lastTestMessage}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="compact" loading={busy} onClick={() => handleTestAiProvider(row)} className="text-[11px]">
                      Test Connection
                    </Button>
                    <Button variant="secondary" size="compact" loading={busy} onClick={() => handleRefreshAiModels(row)} className="text-[11px]">
                      Refresh Models
                    </Button>
                    <Button
                      variant="secondary"
                      size="compact"
                      loading={busy}
                      onClick={() => handleToggleAiActive(row)}
                      className="text-[11px] ml-auto"
                    >
                      {row.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. EMAIL & 15 LIFECYCLE TEMPLATES */}
      {activeTab === "email" && (
        <div className="space-y-6">
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Heading as="h2" size="h4">SMTP / Email Provider</Heading>
                <Text size="body-sm" color="secondary" className="mt-0.5">
                  Configure the outbound mail server used for transactional and lifecycle emails.
                </Text>
              </div>
              {emailSettings && (
                <Badge variant={emailSettings.isActive ? "success" : "neutral"}>
                  {emailSettings.isActive ? "Active" : "Inactive"}
                </Badge>
              )}
            </div>

            <form onSubmit={handleSaveEmailSettings} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-ink-tertiary uppercase">Host</label>
                <input
                  required
                  value={emailSettingsDraft.host ?? emailSettings?.host ?? ""}
                  onChange={(e) => setEmailSettingsDraft((p) => ({ ...p, host: e.target.value }))}
                  className="w-full text-xs border border-line rounded px-2 py-1.5"
                  placeholder="smtp.titan.email"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-tertiary uppercase">Port</label>
                <input
                  required
                  type="number"
                  value={emailSettingsDraft.port ?? emailSettings?.port ?? 587}
                  onChange={(e) => setEmailSettingsDraft((p) => ({ ...p, port: e.target.value }))}
                  className="w-full text-xs border border-line rounded px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-tertiary uppercase">Encryption</label>
                <select
                  value={emailSettingsDraft.secure ?? String(emailSettings?.secure ?? false)}
                  onChange={(e) => setEmailSettingsDraft((p) => ({ ...p, secure: e.target.value }))}
                  className="w-full text-xs border border-line rounded px-2 py-1.5 bg-white"
                >
                  <option value="true">SSL/TLS (secure)</option>
                  <option value="false">STARTTLS</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-tertiary uppercase">Username</label>
                <input
                  required
                  value={emailSettingsDraft.username ?? emailSettings?.username ?? ""}
                  onChange={(e) => setEmailSettingsDraft((p) => ({ ...p, username: e.target.value }))}
                  className="w-full text-xs border border-line rounded px-2 py-1.5"
                  placeholder="notifications@sellersalt.com"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-tertiary uppercase">Password</label>
                <input
                  type="password"
                  value={emailSettingsDraft.password ?? ""}
                  onChange={(e) => setEmailSettingsDraft((p) => ({ ...p, password: e.target.value }))}
                  className="w-full text-xs border border-line rounded px-2 py-1.5"
                  placeholder={emailSettings?.hasPassword ? "••••••••" : "Required"}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-tertiary uppercase">From Email</label>
                <input
                  required
                  type="email"
                  value={emailSettingsDraft.fromEmail ?? emailSettings?.fromEmail ?? ""}
                  onChange={(e) => setEmailSettingsDraft((p) => ({ ...p, fromEmail: e.target.value }))}
                  className="w-full text-xs border border-line rounded px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ink-tertiary uppercase">From Name</label>
                <input
                  value={emailSettingsDraft.fromName ?? emailSettings?.fromName ?? "SellerSalt"}
                  onChange={(e) => setEmailSettingsDraft((p) => ({ ...p, fromName: e.target.value }))}
                  className="w-full text-xs border border-line rounded px-2 py-1.5"
                />
              </div>
              <div className="flex items-end gap-2 col-span-2 sm:col-span-1">
                <label className="flex items-center gap-1.5 text-xs text-ink-secondary">
                  <input
                    type="checkbox"
                    checked={(emailSettingsDraft.isActive ?? String(emailSettings?.isActive ?? true)) === "true"}
                    onChange={(e) => setEmailSettingsDraft((p) => ({ ...p, isActive: String(e.target.checked) }))}
                  />
                  Active
                </label>
              </div>

              <div className="col-span-2 sm:col-span-3 flex items-center gap-2 pt-1">
                <Button type="submit" variant="primary" size="compact" loading={emailSettingsSaving} className="text-xs bg-[#0E8F5D] hover:bg-[#0C7A52]">
                  Save
                </Button>
                <Button type="button" variant="secondary" size="compact" loading={smtpTesting} disabled={!emailSettings} onClick={handleTestSmtp} className="text-xs">
                  Send Test Email
                </Button>
                {emailSettingsResult && <span className="text-[11px] text-ink-secondary">{emailSettingsResult}</span>}
                {smtpTestResult && <span className="text-[11px] text-ink-secondary">{smtpTestResult}</span>}
              </div>
            </form>
          </Card>

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
        </div>
      )}

      {/* 8. APP BRANDING & SEO CONFIGURATION */}
      {activeTab === "branding" && (
        <BrandingSeoView
          settings={siteSettings}
          onSaveSetting={handleSaveSettingDirect}
          onRefreshSettings={loadAll}
        />
      )}

      {/* 2. DEDICATED APP SETTINGS */}
      {activeTab === "app-settings" && (
        <GeneralAppSettingsView
          settings={siteSettings}
          onSaveSetting={handleSaveSettingDirect}
        />
      )}

      {/* 3. MEDIA STORAGE LIBRARY */}
      {activeTab === "storage" && (
        <StorageMediaView
          onUploadAsset={handleUploadGenericImage}
          activeLogoUrl={settingDrafts["app_logo_url"] || siteSettings.find((s: SiteSettingRow) => s.key === "app_logo_url")?.value}
          activeFaviconUrl={settingDrafts["app_favicon_url"] || siteSettings.find((s: SiteSettingRow) => s.key === "app_favicon_url")?.value}
          activeAuthImageUrl={settingDrafts["auth_page_image_url"] || siteSettings.find((s: SiteSettingRow) => s.key === "auth_page_image_url")?.value}
        />
      )}

      {/* 4. USER PROVISIONING */}
      {activeTab === "user-provisioning" && (
        <UserProvisioningView
          packages={packages}
          onUserCreated={loadAll}
        />
      )}

      {/* 5. INTEGRATION HUB */}
      {activeTab === "integrations" && (
        <IntegrationsView
          settings={siteSettings}
          onSaveSetting={handleSaveSettingDirect}
          onRefreshSettings={loadAll}
          appBaseUrl={typeof window !== "undefined" ? window.location.origin : "https://sellersalt.com"}
        />
      )}

      {/* 6. SECURITY & ABUSE TELEMETRY */}
      {activeTab === "security" && (
        <SecurityAbuseView
          auditLogs={recentAuditLogs}
          onRefreshAuditLogs={loadAll}
          disposableDomainsVal={settingDrafts["disposable_email_domains_custom"] || siteSettings.find((s: SiteSettingRow) => s.key === "disposable_email_domains_custom")?.value || ""}
          allowedFreeDomainsVal={settingDrafts["free_plan_allowed_domains_custom"] || siteSettings.find((s: SiteSettingRow) => s.key === "free_plan_allowed_domains_custom")?.value || ""}
          maxFreePerBusinessVal={settingDrafts["max_free_accounts_per_business_domain"] || siteSettings.find((s: SiteSettingRow) => s.key === "max_free_accounts_per_business_domain")?.value || "2"}
          onSaveSetting={handleSaveSettingDirect}
        />
      )}

      {/* 7. AUDIT LOGS */}
      {activeTab === "audit-logs" && (
        <SecurityAbuseView
          auditLogs={recentAuditLogs}
          onRefreshAuditLogs={loadAll}
          disposableDomainsVal={settingDrafts["disposable_email_domains_custom"] || siteSettings.find((s: SiteSettingRow) => s.key === "disposable_email_domains_custom")?.value || ""}
          allowedFreeDomainsVal={settingDrafts["free_plan_allowed_domains_custom"] || siteSettings.find((s: SiteSettingRow) => s.key === "free_plan_allowed_domains_custom")?.value || ""}
          maxFreePerBusinessVal={settingDrafts["max_free_accounts_per_business_domain"] || siteSettings.find((s: SiteSettingRow) => s.key === "max_free_accounts_per_business_domain")?.value || "2"}
          onSaveSetting={handleSaveSettingDirect}
        />
      )}

      {/* 8. SYSTEM HEALTH & DIAGNOSTICS */}
      {(activeTab === "diagnostics" || activeTab === "storage-config") && (
        <SystemHealthView
          s3BucketVal={settingDrafts["s3_bucket"] || siteSettings.find((s: SiteSettingRow) => s.key === "s3_bucket")?.value || ""}
          s3RegionVal={settingDrafts["s3_region"] || siteSettings.find((s: SiteSettingRow) => s.key === "s3_region")?.value || ""}
          s3EndpointVal={settingDrafts["s3_endpoint"] || siteSettings.find((s: SiteSettingRow) => s.key === "s3_endpoint")?.value || ""}
          s3PublicBaseVal={settingDrafts["s3_public_base_url"] || siteSettings.find((s: SiteSettingRow) => s.key === "s3_public_base_url")?.value || ""}
          hasS3Secret={Boolean(siteSettings.find((s: SiteSettingRow) => s.key === "s3_secret_access_key")?.hasValue)}
          onSaveSetting={handleSaveSettingDirect}
        />
      )}

      {/* 9. ANNOUNCEMENTS & ALERTS */}
      {activeTab === "notifications" && (
        <AnnouncementsView
          urgentBannerActive={settingDrafts["announcement_urgent_active"] === "true" || siteSettings.find((s: SiteSettingRow) => s.key === "announcement_urgent_active")?.value === "true"}
          urgentBannerText={settingDrafts["announcement_urgent_text"] || siteSettings.find((s: SiteSettingRow) => s.key === "announcement_urgent_text")?.value || ""}
          urgentBannerLink={settingDrafts["announcement_urgent_link"] || siteSettings.find((s: SiteSettingRow) => s.key === "announcement_urgent_link")?.value || ""}
          onSaveSetting={handleSaveSettingDirect}
        />
      )}

      {/* 10. DEDICATED FREE EXPLORER PLAN */}
      {activeTab === "free-plan" && (
        <FreePlanConfigView
          freePackage={packages.find((p) => p.key === "FREE" || p.priceUsd === 0)}
          onSavePackageLimits={handleSavePackageLimitsDirect}
          freePlanEnabled={settingDrafts["free_plan_enabled"] !== "false" && siteSettings.find((s: SiteSettingRow) => s.key === "free_plan_enabled")?.value !== "false"}
          onSaveSetting={handleSaveSettingDirect}
        />
      )}

        </div>
      </div>
    </div>
  );
}
