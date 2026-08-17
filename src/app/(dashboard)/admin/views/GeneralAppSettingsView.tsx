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
  Image as ImageIcon,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ExternalLink,
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
  onUploadImage: (file: File) => Promise<string | null>;
}

export function GeneralAppSettingsView({
  settings,
  onSaveSetting,
  onUploadImage,
}: GeneralAppSettingsViewProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successKey, setSuccessKey] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

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

  const handleFileUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(key);
    const uploadedUrl = await onUploadImage(file);
    setUploadingField(null);
    if (uploadedUrl) {
      updateDraft(key, uploadedUrl);
      await onSaveSetting(key, uploadedUrl);
      setSuccessKey(key);
      setTimeout(() => setSuccessKey(null), 2500);
    }
  };

  const posX = Number(getVal("auth_page_image_position_x", "50"));
  const posY = Number(getVal("auth_page_image_position_y", "50"));
  const authImage = getVal("auth_page_image_url", "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&auto=format&fit=crop&q=80");

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
          Configure application-level identity, global URLs, default timezone/currency, feature switches, and login artwork.
        </Text>
      </div>

      {/* 1. CORE APPLICATION IDENTITY */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Application Identity & URLs</h3>
            <p className="text-xs text-ink-tertiary">Brand name, canonical web addresses, and support contact.</p>
          </div>
          <Badge variant="neutral">Core Identity</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Application Name</span>
              {successKey === "app_name" && <span className="text-[10px] text-[#0E8F5D] font-bold">Saved!</span>}
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
            <span className="text-[11px] text-ink-tertiary">Used in page titles and navigation.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Canonical App URL</span>
              {successKey === "app_url" && <span className="text-[10px] text-[#0E8F5D] font-bold">Saved!</span>}
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
            <span className="text-[11px] text-ink-tertiary">Primary domain used for OAuth callbacks and emails.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Public Support Email</span>
              {successKey === "support_email" && <span className="text-[10px] text-[#0E8F5D] font-bold">Saved!</span>}
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
            <span className="text-[11px] text-ink-tertiary">Contact address displayed in footers and alerts.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Default Timezone</span>
              {successKey === "default_timezone" && <span className="text-[10px] text-[#0E8F5D] font-bold">Saved!</span>}
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
            <span className="text-[11px] text-ink-tertiary">Baseline timezone for scheduled tracking snapshots.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Default Currency</span>
              {successKey === "default_currency" && <span className="text-[10px] text-[#0E8F5D] font-bold">Saved!</span>}
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
            <span className="text-[11px] text-ink-tertiary">Default unit economics display currency.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Default Signup Plan</span>
              {successKey === "default_signup_plan" && <span className="text-[10px] text-[#0E8F5D] font-bold">Saved!</span>}
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
            <span className="text-[11px] text-ink-tertiary">Assigned to newly registering organic users.</span>
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
              <p className="text-[11px] text-ink-secondary">
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
              <p className="text-[11px] text-ink-secondary">
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
              <p className="text-[11px] text-ink-secondary">
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

      {/* 3. LOGOS, FAVICONS & APPLICATION ASSETS */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Application Logos & Icons</h3>
            <p className="text-xs text-ink-tertiary">Manage header logo, square app icon, favicon, and assistant avatars.</p>
          </div>
          <Badge variant="neutral">Visual Brand Assets</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { key: "app_logo_url", label: "Primary App Logo", desc: "Navbar and header brand logo (PNG/SVG)." },
            { key: "app_favicon_url", label: "Favicon / Browser Icon", desc: "Browser tab icon (ICO/PNG/SVG)." },
            { key: "app_icon_square_url", label: "Square App Icon", desc: "App store & PWA square tile (512x512)." },
            { key: "assistant_logo_url", label: "SaltBot Assistant Icon", desc: "Floating AI assistant avatar icon." },
          ].map((asset) => {
            const currentUrl = getVal(asset.key);
            return (
              <div key={asset.key} className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">{asset.label}</span>
                    {successKey === asset.key && <span className="text-[10px] text-[#0E8F5D] font-bold">Saved!</span>}
                  </div>

                  <div className="h-20 w-full rounded-lg border border-line bg-white flex items-center justify-center p-2 overflow-hidden">
                    {currentUrl ? (
                      <img src={currentUrl} alt={asset.label} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-ink-tertiary">No asset set</span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={currentUrl}
                    onChange={(e) => updateDraft(asset.key, e.target.value)}
                    placeholder="https://..."
                    className="w-full text-[11px] border border-line rounded px-2 py-1 bg-white"
                  />
                  <p className="text-[10px] text-ink-tertiary">{asset.desc}</p>
                </div>

                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="inline-flex items-center justify-center w-full px-2 py-1.5 rounded-lg border border-line bg-white text-[11px] font-semibold text-ink hover:bg-[#F4F3EF] cursor-pointer">
                      <Upload className="h-3 w-3 mr-1" />
                      {uploadingField === asset.key ? "Uploading..." : "Upload"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(asset.key, e)}
                      className="hidden"
                    />
                  </label>

                  <Button
                    variant="secondary"
                    size="compact"
                    loading={savingKey === asset.key}
                    onClick={() => handleSave(asset.key)}
                    className="text-xs"
                  >
                    Save
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 4. LOGIN PAGE SIDE IMAGE & DYNAMIC POSITIONING */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Login / Auth Page Artwork & Alignment</h3>
            <p className="text-xs text-ink-tertiary">Adjust side cover image and customize its focal alignment dynamically.</p>
          </div>
          <Badge variant="neutral">Auth Artwork</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Controls */}
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Side Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={getVal("auth_page_image_url", authImage)}
                  onChange={(e) => updateDraft("auth_page_image_url", e.target.value)}
                  className="flex-1 text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink"
                  placeholder="https://..."
                />
                <label className="shrink-0">
                  <span className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-line bg-white text-xs font-semibold text-ink hover:bg-[#F4F3EF] cursor-pointer">
                    <Upload className="h-3.5 w-3.5 mr-1" /> Upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload("auth_page_image_url", e)}
                    className="hidden"
                  />
                </label>
                <Button
                  variant="secondary"
                  size="compact"
                  loading={savingKey === "auth_page_image_url"}
                  onClick={() => handleSave("auth_page_image_url")}
                  className="text-xs"
                >
                  Save URL
                </Button>
              </div>
            </div>

            {/* Horizontal Position Slider */}
            <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-ink">Horizontal Focal Alignment (X)</span>
                <span className="text-xs font-mono font-bold text-[#0E8F5D]">{posX}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={posX}
                onChange={(e) => updateDraft("auth_page_image_position_x", e.target.value)}
                className="w-full accent-[#0E8F5D]"
              />
              <div className="flex justify-between text-[10px] text-ink-tertiary">
                <span>Left (0%)</span>
                <span>Center (50%)</span>
                <span>Right (100%)</span>
              </div>
            </div>

            {/* Vertical Position Slider */}
            <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-ink">Vertical Focal Alignment (Y)</span>
                <span className="text-xs font-mono font-bold text-[#0E8F5D]">{posY}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={posY}
                onChange={(e) => updateDraft("auth_page_image_position_y", e.target.value)}
                className="w-full accent-[#0E8F5D]"
              />
              <div className="flex justify-between text-[10px] text-ink-tertiary">
                <span>Top (0%)</span>
                <span>Center (50%)</span>
                <span>Bottom (100%)</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="default"
              loading={savingKey === "auth_page_image_position_x"}
              onClick={async () => {
                setSavingKey("auth_page_image_position_x");
                await onSaveSetting("auth_page_image_position_x", String(posX));
                await onSaveSetting("auth_page_image_position_y", String(posY));
                await onSaveSetting("auth_page_image_url", getVal("auth_page_image_url", authImage));
                setSavingKey(null);
                setSuccessKey("auth_artwork_all");
                setTimeout(() => setSuccessKey(null), 2500);
              }}
              className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold text-xs w-full"
            >
              {successKey === "auth_artwork_all" ? "✓ Saved Artwork & Alignment!" : "Save Artwork & Alignment"}
            </Button>
          </div>

          {/* Interactive Live Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-ink">Live Auth Page Preview</span>
              <span className="text-[10px] text-ink-tertiary">Simulated 16:10 container</span>
            </div>
            <div className="h-72 w-full rounded-2xl border-2 border-line bg-[#141B16] overflow-hidden relative shadow-sm">
              <img
                src={getVal("auth_page_image_url", authImage)}
                alt="Auth Artwork Preview"
                style={{ objectPosition: `${posX}% ${posY}%` }}
                className="w-full h-full object-cover transition-all duration-150"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                <div className="text-xs font-bold text-[#16C784]">SellerSalt Intelligence</div>
                <div className="text-sm font-extrabold">Data-Driven Commerce Operating System</div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
