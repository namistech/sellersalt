"use client";

import React, { useState } from "react";
import {
  Settings,
  Globe,
  Mail,
  Clock,
  DollarSign,
  ShieldCheck,
  Power,
  UserCheck,
  Layers,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Loader2,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Badge,
  Button,
} from "@/components/ui";

interface SettingItem {
  key: string;
  label: string;
  isSecret: boolean;
  hasValue: boolean;
  value?: string;
  updatedAt?: string | null;
}

interface GeneralAppSettingsViewProps {
  settings: SettingItem[];
  onSaveSetting: (key: string, value: string) => Promise<boolean>;
}

export function GeneralAppSettingsView({
  settings,
  onSaveSetting,
}: GeneralAppSettingsViewProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successKey, setSuccessKey] = useState<string | null>(null);

  const getVal = (key: string, fallback = ""): string => {
    if (drafts[key] !== undefined) return drafts[key];
    const item = settings.find((s) => s.key === key);
    return item?.value ?? fallback;
  };

  const updateDraft = (key: string, val: string) => {
    setDrafts((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (key: string) => {
    const val = getVal(key);
    setSavingKey(key);
    const ok = await onSaveSetting(key, val);
    setSavingKey(null);
    if (ok) {
      setSuccessKey(key);
      setTimeout(() => setSuccessKey(null), 2500);
    }
  };

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
            <Settings className="h-4 w-4" />
          </span>
          <Heading as="h2" size="h3" className="text-xl font-bold text-ink">
            App Settings & Application Core
          </Heading>
        </div>
        <Text size="body-sm" className="text-ink-secondary mt-1">
          Global application configuration, default timezone and currency, platform feature switches, and educational portal links.
        </Text>
      </div>

      {/* 1. CORE APPLICATION IDENTITY */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Application Parameters & URLs</h3>
            <p className="text-xs text-ink-tertiary">Brand name, canonical web addresses, and support contact.</p>
          </div>
          <Badge variant="neutral">Core Identity</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Application Name</span>
              {successKey === "app_name" && <span className="text-label-sm text-[#0E8F5D] font-bold">Saved!</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={getVal("app_name", "SellerSalt")}
                onChange={(e) => updateDraft("app_name", e.target.value)}
                className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
                placeholder="SellerSalt"
              />
              <Button
                variant="secondary"
                size="compact"
                loading={savingKey === "app_name"}
                onClick={() => handleSave("app_name")}
                className="text-xs"
              >
                Save
              </Button>
            </div>
            <span className="text-meta text-ink-tertiary">Used in page titles and navigation.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Canonical App URL</span>
              {successKey === "app_url" && <span className="text-label-sm text-[#0E8F5D] font-bold">Saved!</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={getVal("app_url", "https://sellersalt.com")}
                onChange={(e) => updateDraft("app_url", e.target.value)}
                className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
                placeholder="https://sellersalt.com"
              />
              <Button
                variant="secondary"
                size="compact"
                loading={savingKey === "app_url"}
                onClick={() => handleSave("app_url")}
                className="text-xs"
              >
                Save
              </Button>
            </div>
            <span className="text-meta text-ink-tertiary">Primary domain used for OAuth callbacks and emails.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Public Support Email</span>
              {successKey === "support_email" && <span className="text-label-sm text-[#0E8F5D] font-bold">Saved!</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={getVal("support_email", "support@sellersalt.com")}
                onChange={(e) => updateDraft("support_email", e.target.value)}
                className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
                placeholder="support@sellersalt.com"
              />
              <Button
                variant="secondary"
                size="compact"
                loading={savingKey === "support_email"}
                onClick={() => handleSave("support_email")}
                className="text-xs"
              >
                Save
              </Button>
            </div>
            <span className="text-meta text-ink-tertiary">Contact address displayed in footers and alerts.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Default Timezone</span>
              {successKey === "default_timezone" && <span className="text-label-sm text-[#0E8F5D] font-bold">Saved!</span>}
            </label>
            <div className="flex gap-2">
              <select
                value={getVal("default_timezone", "UTC")}
                onChange={(e) => {
                  updateDraft("default_timezone", e.target.value);
                  onSaveSetting("default_timezone", e.target.value);
                }}
                className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
              >
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
              </select>
            </div>
            <span className="text-meta text-ink-tertiary">Baseline timezone for scheduled tracking snapshots.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Default Currency</span>
              {successKey === "default_currency" && <span className="text-label-sm text-[#0E8F5D] font-bold">Saved!</span>}
            </label>
            <div className="flex gap-2">
              <select
                value={getVal("default_currency", "USD")}
                onChange={(e) => {
                  updateDraft("default_currency", e.target.value);
                  onSaveSetting("default_currency", e.target.value);
                }}
                className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
              >
                <option value="USD">USD ($ United States Dollar)</option>
                <option value="EUR">EUR (€ Euro)</option>
                <option value="GBP">GBP (£ British Pound)</option>
                <option value="CAD">CAD ($ Canadian Dollar)</option>
                <option value="AUD">AUD ($ Australian Dollar)</option>
              </select>
            </div>
            <span className="text-meta text-ink-tertiary">Default unit economics display currency.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Default Signup Plan</span>
              {successKey === "default_signup_plan" && <span className="text-label-sm text-[#0E8F5D] font-bold">Saved!</span>}
            </label>
            <div className="flex gap-2">
              <select
                value={getVal("default_signup_plan", "FREE")}
                onChange={(e) => {
                  updateDraft("default_signup_plan", e.target.value);
                  onSaveSetting("default_signup_plan", e.target.value);
                }}
                className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
              >
                <option value="FREE">Free Explorer ($0/mo)</option>
                <option value="STARTED">Starter Plan</option>
                <option value="PRO">Pro Plan</option>
                <option value="AGENCY">Agency Plan</option>
              </select>
            </div>
            <span className="text-meta text-ink-tertiary">Assigned to newly registering organic users.</span>
          </div>
        </div>
      </Card>

      {/* 2. SYSTEM SWITCHES & PLATFORM TOGGLES */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Platform Switches & Gateways</h3>
            <p className="text-xs text-ink-tertiary">Control user registration, free plan availability, and maintenance mode.</p>
          </div>
          <Badge variant="neutral">Feature Flags</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-ink">User Registration</span>
                <Badge variant={getVal("registration_enabled", "true") === "true" ? "success" : "danger"}>
                  {getVal("registration_enabled", "true") === "true" ? "ENABLED" : "DISABLED"}
                </Badge>
              </div>
              <p className="text-meta text-ink-secondary">
                Allow new visitors to register accounts via `/signup` and Google login.
              </p>
            </div>
            <Button
              variant={getVal("registration_enabled", "true") === "true" ? "secondary" : "primary"}
              size="compact"
              onClick={() => {
                const next = getVal("registration_enabled", "true") === "true" ? "false" : "true";
                updateDraft("registration_enabled", next);
                onSaveSetting("registration_enabled", next);
              }}
              className="text-xs w-full"
            >
              {getVal("registration_enabled", "true") === "true" ? "Disable Registration" : "Enable Registration"}
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-ink">Free Explorer Tier</span>
                <Badge variant={getVal("free_plan_enabled", "true") === "true" ? "success" : "warning"}>
                  {getVal("free_plan_enabled", "true") === "true" ? "ACTIVE" : "HIDDEN"}
                </Badge>
              </div>
              <p className="text-meta text-ink-secondary">
                Display Free Explorer ($0/mo) on homepage and checkout without forcing trial checkout.
              </p>
            </div>
            <Button
              variant={getVal("free_plan_enabled", "true") === "true" ? "secondary" : "primary"}
              size="compact"
              onClick={() => {
                const next = getVal("free_plan_enabled", "true") === "true" ? "false" : "true";
                updateDraft("free_plan_enabled", next);
                onSaveSetting("free_plan_enabled", next);
              }}
              className="text-xs w-full"
            >
              {getVal("free_plan_enabled", "true") === "true" ? "Hide Free Tier" : "Show Free Tier"}
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-ink">Maintenance Mode</span>
                <Badge variant={getVal("maintenance_mode", "false") === "true" ? "danger" : "neutral"}>
                  {getVal("maintenance_mode", "false") === "true" ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>
              <p className="text-meta text-ink-secondary">
                Render a maintenance barrier to non-admin visitors during major migrations.
              </p>
            </div>
            <Button
              variant={getVal("maintenance_mode", "false") === "true" ? "secondary" : "destructive"}
              size="compact"
              onClick={() => {
                const next = getVal("maintenance_mode", "false") === "true" ? "false" : "true";
                updateDraft("maintenance_mode", next);
                onSaveSetting("maintenance_mode", next);
              }}
              className="text-xs w-full"
            >
              {getVal("maintenance_mode", "false") === "true" ? "Deactivate Maintenance" : "Activate Maintenance"}
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. SELLER EDUCATION & UNIVERSITY */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">SellerSalt University & Knowledge Base</h3>
            <p className="text-xs text-ink-tertiary">Configure the educational portal integration shown in navigation.</p>
          </div>
          <Badge variant="neutral">Education Portal</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-ink">Show in Navigation</span>
                <Badge variant={getVal("university_enabled", "true") === "true" ? "success" : "neutral"}>
                  {getVal("university_enabled", "true") === "true" ? "SHOWN" : "HIDDEN"}
                </Badge>
              </div>
              <p className="text-meta text-ink-secondary">
                Display the &quot;University&quot; link in top navigation and sidebar for all logged-in sellers.
              </p>
            </div>
            <Button
              variant={getVal("university_enabled", "true") === "true" ? "secondary" : "primary"}
              size="compact"
              onClick={() => {
                const next = getVal("university_enabled", "true") === "true" ? "false" : "true";
                updateDraft("university_enabled", next);
                onSaveSetting("university_enabled", next);
              }}
              className="text-xs w-full"
            >
              {getVal("university_enabled", "true") === "true" ? "Hide University Link" : "Show University Link"}
            </Button>
          </div>

          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>University Destination URL</span>
              {successKey === "university_url" && <span className="text-label-sm text-[#0E8F5D] font-bold">Saved!</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={getVal("university_url", "https://university.sellersalt.com")}
                onChange={(e) => updateDraft("university_url", e.target.value)}
                className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
                placeholder="https://university.sellersalt.com"
              />
              <Button
                variant="secondary"
                size="compact"
                loading={savingKey === "university_url"}
                onClick={() => handleSave("university_url")}
                className="text-xs"
              >
                Save
              </Button>
            </div>
            <span className="text-meta text-ink-tertiary">External academy or Notion knowledge base portal.</span>
          </div>
        </div>
      </Card>

      {/* 4. ABUSE CONTROLS & BUSINESS DOMAIN QUOTAS */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Abuse Prevention & Multi-Free Account Rules</h3>
            <p className="text-xs text-ink-tertiary">Configure disposable email blocking and multi-account policy per domain.</p>
          </div>
          <Badge variant="neutral">Risk Rules</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Custom Disposable Email Domains (Comma-separated)</span>
              {successKey === "disposable_email_domains_custom" && <span className="text-label-sm text-[#0E8F5D] font-bold">Saved!</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={getVal("disposable_email_domains_custom", "")}
                onChange={(e) => updateDraft("disposable_email_domains_custom", e.target.value)}
                className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
                placeholder="tempmail.com, discard.email, 10minutemail.net"
              />
              <Button
                variant="secondary"
                size="compact"
                loading={savingKey === "disposable_email_domains_custom"}
                onClick={() => handleSave("disposable_email_domains_custom")}
                className="text-xs"
              >
                Save
              </Button>
            </div>
            <span className="text-meta text-ink-tertiary">Additional domains to block during signup.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Max Free Accounts Per Business Domain</span>
              {successKey === "max_free_accounts_per_business_domain" && <span className="text-label-sm text-[#0E8F5D] font-bold">Saved!</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="20"
                value={getVal("max_free_accounts_per_business_domain", "2")}
                onChange={(e) => updateDraft("max_free_accounts_per_business_domain", e.target.value)}
                className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink focus:outline-none focus:border-[#0E8F5D]"
                placeholder="2"
              />
              <Button
                variant="secondary"
                size="compact"
                loading={savingKey === "max_free_accounts_per_business_domain"}
                onClick={() => handleSave("max_free_accounts_per_business_domain")}
                className="text-xs"
              >
                Save
              </Button>
            </div>
            <span className="text-meta text-ink-tertiary">Limits multiple free trial accounts created under a corporate domain.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
