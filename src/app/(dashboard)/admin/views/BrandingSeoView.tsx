"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  Image as ImageIcon,
  Upload,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sliders,
  Code2,
  Search,
  Eye,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface SettingItem {
  key: string;
  label: string;
  isSecret?: boolean;
  value?: string;
  hasValue?: boolean;
}

interface BrandingSeoViewProps {
  settings: SettingItem[];
  onSaveSetting: (key: string, value: string) => Promise<boolean>;
  onRefreshSettings: () => Promise<void>;
}

export function BrandingSeoView({ settings, onSaveSetting, onRefreshSettings }: BrandingSeoViewProps) {
  const getVal = (key: string) => settings.find((s) => s.key === key)?.value || "";

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value || "";
    }
    return map;
  });

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"brand" | "seo" | "schema">("brand");

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    setSaveStatus("saving");
    try {
      const keysToSave = Object.keys(formData);
      for (const key of keysToSave) {
        if (formData[key] !== getVal(key)) {
          await onSaveSetting(key, formData[key]);
        }
      }
      await onRefreshSettings();
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus("error");
    }
  };

  const handleFileUpload = async (key: string, file: File) => {
    setUploadingKey(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("key", key);
      fd.append("folder", "branding");

      const res = await fetch("/api/admin/settings/upload-image", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setFormData((prev) => ({ ...prev, [key]: data.url }));
      await onRefreshSettings();
    } catch (err: any) {
      alert(err.message || "Failed to upload image.");
    } finally {
      setUploadingKey(null);
    }
  };

  const renderAssetUploader = (
    key: string,
    label: string,
    description: string,
    aspectHint: string,
    previewClass = "h-16 w-32"
  ) => {
    const currentUrl = formData[key] || getVal(key);
    const isUploading = uploadingKey === key;

    return (
      <div className="p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-ink)]">{label}</h4>
            <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{description}</p>
          </div>
          <Badge variant="neutral">
            {aspectHint}
          </Badge>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div
            className={`relative rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] flex items-center justify-center overflow-hidden shrink-0 ${previewClass}`}
          >
            {currentUrl ? (
              <Image
                src={currentUrl}
                alt={label}
                width={128}
                height={64}
                className="object-contain p-1 w-full h-full"
                unoptimized
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-[var(--color-ink-muted)] opacity-50" />
            )}
          </div>

          <div className="flex-1 min-w-[200px] space-y-2">
            <input
              type="url"
              value={formData[key] || ""}
              placeholder="https://assets.sellersalt.com/branding/..."
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-line)] px-3 py-1.5 rounded-lg text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
            />

            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] hover:bg-[var(--color-paper)] text-[var(--color-ink)] transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? "Uploading to R2..." : "Upload File"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(key, e.target.files[0]);
                  }}
                />
              </label>
              {currentUrl && (
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-[var(--color-line)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--color-ink)]">Branding & SEO Configuration</h2>
            <Badge variant="success">
              Canonical Brand Assets
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Manage application visual identity, browser icons, authentication artwork, and search metadata.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSaveAll} disabled={saveStatus === "saving"} className="text-sm px-5 h-9">
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Saving Changes...
              </>
            ) : (
              "Save All Changes"
            )}
          </Button>
        </div>
      </div>

      {saveStatus === "success" && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Branding and SEO configurations saved successfully.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] pb-2">
        <button
          onClick={() => setActiveTab("brand")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "brand"
              ? "bg-[var(--color-surface)] text-[var(--color-brand-primary)] border border-[var(--color-line)] shadow-sm"
              : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          Brand Assets & Artwork
        </button>
        <button
          onClick={() => setActiveTab("seo")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "seo"
              ? "bg-[var(--color-surface)] text-[var(--color-brand-primary)] border border-[var(--color-line)] shadow-sm"
              : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          Search Engine Optimization (SEO)
        </button>
        <button
          onClick={() => setActiveTab("schema")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "schema"
              ? "bg-[var(--color-surface)] text-[var(--color-brand-primary)] border border-[var(--color-line)] shadow-sm"
              : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          Structured Data & Robots
        </button>
      </div>

      {/* Brand Tab */}
      {activeTab === "brand" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderAssetUploader(
              "app_logo_url",
              "Primary Application Logo",
              "Rendered in navigation header, emails, and brand headers.",
              "Recommended: 240x60 PNG / SVG",
              "h-16 w-36"
            )}

            {renderAssetUploader(
              "app_icon_square_url",
              "Square App Icon",
              "Used for mobile web icons, app shortcuts, and square representations.",
              "Recommended: 512x512 PNG",
              "h-16 w-16"
            )}

            {renderAssetUploader(
              "app_favicon_url",
              "Browser Favicon",
              "Displayed in browser tabs and bookmark bars.",
              "Recommended: 32x32 / 48x48 ICO/PNG",
              "h-16 w-16"
            )}

            {renderAssetUploader(
              "extension_icon_url",
              "Browser Extension Icon",
              "Displayed in Chrome / Edge toolbar and extension stores.",
              "Recommended: 128x128 PNG",
              "h-16 w-16"
            )}

            {renderAssetUploader(
              "assistant_logo_url",
              "SaltBot Assistant Avatar",
              "Displayed next to AI responses and intelligence suggestions.",
              "Recommended: 256x256 Circle / PNG",
              "h-16 w-16"
            )}

            {renderAssetUploader(
              "seo_og_image_url",
              "OpenGraph / Social Card Image",
              "Preview thumbnail when sharing SellerSalt links on Twitter, LinkedIn, etc.",
              "Recommended: 1200x630 PNG / WebP",
              "h-16 w-32"
            )}
          </div>

          {/* Auth Artwork & Focal Position Section */}
          <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[var(--color-ink)]">Login & Signup Page Marketing Artwork</h3>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                  Side illustration displayed on desktop login, registration, and password recovery pages.
                </p>
              </div>
              <Badge variant="neutral">
                Focal Alignment Controls
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {renderAssetUploader(
                  "auth_page_image_url",
                  "Side Artwork Image URL",
                  "Upload high-resolution marketing graphic.",
                  "Recommended: 1080x1920 (9:16) PNG/JPG",
                  "h-32 w-20"
                )}

                <div className="p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-line)] space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-ink)]">
                    <Sliders className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    <span>Artwork Focal Positioning</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[var(--color-ink-muted)]">
                      <span>Horizontal Alignment (X-Axis)</span>
                      <span className="font-mono">{formData["auth_page_image_position_x"] || "50"}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData["auth_page_image_position_x"] || "50"}
                      onChange={(e) => handleChange("auth_page_image_position_x", e.target.value)}
                      className="w-full h-1.5 bg-[var(--color-surface)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-[var(--color-ink-muted)]">
                      <span>Vertical Alignment (Y-Axis)</span>
                      <span className="font-mono">{formData["auth_page_image_position_y"] || "50"}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData["auth_page_image_position_y"] || "50"}
                      onChange={(e) => handleChange("auth_page_image_position_y", e.target.value)}
                      className="w-full h-1.5 bg-[var(--color-surface)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="rounded-xl border border-[var(--color-line)] bg-zinc-950 p-4 text-white flex flex-col justify-between overflow-hidden relative min-h-[260px]">
                <div
                  className="absolute inset-0 bg-cover opacity-80"
                  style={{
                    backgroundImage: `url(${formData["auth_page_image_url"] || "/images/login-artwork.png"})`,
                    backgroundPosition: `${formData["auth_page_image_position_x"] || 50}% ${
                      formData["auth_page_image_position_y"] || 50
                    }%`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative z-10 flex items-center justify-between">
                  <Badge tone="dark" variant="neutral">
                    Live Frame Preview
                  </Badge>
                </div>
                <div className="relative z-10">
                  <p className="text-xs font-semibold">SellerSalt Intelligence</p>
                  <p className="text-[11px] text-zinc-300">Live positioning simulates viewport alignment.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEO Tab */}
      {activeTab === "seo" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] space-y-4">
            <h3 className="font-semibold text-base text-[var(--color-ink)]">Global Search Metadata Defaults</h3>
            <p className="text-xs text-[var(--color-ink-muted)]">
              These fallback values are injected into all public landing pages, pricing tables, and blog previews.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Default SEO Title Template
                </label>
                <input
                  type="text"
                  value={formData["seo_default_title"] || ""}
                  onChange={(e) => handleChange("seo_default_title", e.target.value)}
                  placeholder="SellerSalt — The Operating System for High-Volume Etsy Sellers"
                  className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Default Meta Description
                </label>
                <textarea
                  rows={3}
                  value={formData["seo_default_description"] || ""}
                  onChange={(e) => handleChange("seo_default_description", e.target.value)}
                  placeholder="Comprehensive competitor intelligence, SEO keyword research, and shop analytics..."
                  className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Canonical Base URL Override
                </label>
                <input
                  type="url"
                  value={formData["seo_canonical_url"] || ""}
                  onChange={(e) => handleChange("seo_canonical_url", e.target.value)}
                  placeholder="https://sellersalt.com"
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] space-y-4">
            <h3 className="font-semibold text-base text-[var(--color-ink)]">Search Engine Verification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Google Search Console Verification Token
                </label>
                <input
                  type="text"
                  value={formData["seo_google_site_verification"] || ""}
                  onChange={(e) => handleChange("seo_google_site_verification", e.target.value)}
                  placeholder="google-site-verification=xxxx..."
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Bing Webmaster Tools Verification Token
                </label>
                <input
                  type="text"
                  value={formData["seo_bing_site_verification"] || ""}
                  onChange={(e) => handleChange("seo_bing_site_verification", e.target.value)}
                  placeholder="msvalidate.01=xxxx..."
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schema Tab */}
      {activeTab === "schema" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] space-y-4">
            <h3 className="font-semibold text-base text-[var(--color-ink)]">Structured Data (JSON-LD) Entities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Organization Schema Name</label>
                <input
                  type="text"
                  value={formData["seo_schema_org_name"] || ""}
                  onChange={(e) => handleChange("seo_schema_org_name", e.target.value)}
                  placeholder="SellerSalt Technologies Inc."
                  className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">WebSite Schema Name</label>
                <input
                  type="text"
                  value={formData["seo_schema_website_name"] || ""}
                  onChange={(e) => handleChange("seo_schema_website_name", e.target.value)}
                  placeholder="SellerSalt"
                  className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-[var(--color-ink)]">Robots & Sitemap Verification</h3>
                <p className="text-xs text-[var(--color-ink-muted)]">Live crawler routes served dynamically.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-line)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-ink)]">/robots.txt</p>
                  <p className="text-[11px] text-[var(--color-ink-muted)]">Allows search indexing for public paths.</p>
                </div>
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1"
                >
                  <span>View Route</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-line)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[var(--color-ink)]">/sitemap.xml</p>
                  <p className="text-[11px] text-[var(--color-ink-muted)]">Dynamic XML sitemap of all public pages.</p>
                </div>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1"
                >
                  <span>View Route</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
