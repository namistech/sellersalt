"use client";

import React, { useState } from "react";
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
import { SafeImage } from "@/components/ui/SafeImage";
import { resolveAssetUrl } from "@/lib/asset-url";
import { ImageDisplaySettingsCard } from "@/components/admin/ImageDisplaySettingsCard";

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
    const resolvedUrl = resolveAssetUrl(currentUrl);
    const isUploading = uploadingKey === key;

    return (
      <div className="p-5 rounded-2xl border border-line bg-white shadow-xs space-y-3.5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-ink">{label}</h4>
            <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">{description}</p>
          </div>
          <Badge variant="neutral" className="text-[10px] shrink-0">
            {aspectHint}
          </Badge>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div
            className={`relative rounded-xl border border-line bg-[#FAFAF8] flex items-center justify-center overflow-hidden shrink-0 ${previewClass}`}
          >
            {resolvedUrl ? (
              <SafeImage
                src={resolvedUrl}
                alt={label}
                fallbackType="product"
                className="object-contain p-1.5 w-full h-full"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-ink-tertiary opacity-40" />
            )}
          </div>

          <div className="flex-1 min-w-[200px] space-y-2">
            <input
              type="text"
              value={formData[key] || ""}
              placeholder="https://assets.sellersalt.com/branding/..."
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-1.5 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
            />

            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#FAFAF8] border border-line hover:bg-white text-ink transition-colors">
                <Upload className="w-3.5 h-3.5 text-ink-secondary" />
                <span>{isUploading ? "Uploading to Storage..." : "Upload Asset"}</span>
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
              {resolvedUrl && (
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0E8F5D] font-semibold hover:underline inline-flex items-center gap-1"
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
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-ink">Branding & SEO Configuration</h2>
            <Badge variant="success">
              Visual Identity & Search
            </Badge>
          </div>
          <p className="text-sm text-ink-secondary mt-1">
            Manage application visual identity, browser icons, authentication artwork, and search metadata.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSaveAll} disabled={saveStatus === "saving"} className="text-xs px-5 h-9 font-semibold">
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
        <div className="p-3.5 rounded-xl bg-[#E7FAF1] text-[#0E8F5D] border border-[#16C784]/40 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#0E8F5D] shrink-0" />
          <span>Branding and SEO configurations saved successfully.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("brand")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "brand"
              ? "bg-[#141B16] text-white shadow-xs"
              : "text-ink-secondary hover:text-ink hover:bg-[#F4F3EF]"
          }`}
        >
          Brand Assets & Artwork
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("seo")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "seo"
              ? "bg-[#141B16] text-white shadow-xs"
              : "text-ink-secondary hover:text-ink hover:bg-[#F4F3EF]"
          }`}
        >
          Search Engine Optimization (SEO)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("schema")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "schema"
              ? "bg-[#141B16] text-white shadow-xs"
              : "text-ink-secondary hover:text-ink hover:bg-[#F4F3EF]"
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
              "240x60 PNG / SVG",
              "h-16 w-36"
            )}

            {renderAssetUploader(
              "app_icon_square_url",
              "Square App Icon",
              "Used for mobile web icons, app shortcuts, and square representations.",
              "512x512 PNG",
              "h-16 w-16"
            )}

            {renderAssetUploader(
              "app_favicon_url",
              "Browser Favicon",
              "Displayed in browser tabs and bookmark bars.",
              "32x32 ICO/PNG",
              "h-16 w-16"
            )}

            {renderAssetUploader(
              "extension_icon_url",
              "Browser Extension Icon",
              "Displayed in Chrome / Edge toolbar and extension stores.",
              "128x128 PNG",
              "h-16 w-16"
            )}

            {renderAssetUploader(
              "assistant_logo_url",
              "SaltBot Assistant Avatar",
              "Displayed next to AI responses and intelligence suggestions.",
              "256x256 Circle",
              "h-16 w-16"
            )}

            {renderAssetUploader(
              "seo_og_image_url",
              "OpenGraph / Social Card Image",
              "Preview thumbnail when sharing SellerSalt links on Twitter, LinkedIn, etc.",
              "1200x630 PNG / WebP",
              "h-16 w-32"
            )}
          </div>

          {/* Auth Artwork & Layout Spacing Section */}
          <div className="space-y-4">
            <div className="p-6 rounded-2xl border border-line bg-white shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-base text-ink">Get Started & Auth Page Side Artwork Asset</h3>
                <p className="text-xs text-ink-secondary mt-0.5">
                  High-resolution marketing illustration displayed on desktop login, registration, and onboarding flows.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderAssetUploader(
                  "auth_page_image_url",
                  "Side Artwork Graphic",
                  "Upload high-resolution illustration or product dashboard screenshot.",
                  "1080x1920 PNG / WebP",
                  "h-24 w-32"
                )}

                {renderAssetUploader(
                  "auth_page_logo_url",
                  "Auth Screen Logo Override",
                  "Optional dark-background logo mark displayed inside the side artwork pane.",
                  "240x60 PNG / SVG",
                  "h-24 w-32"
                )}
              </div>
            </div>

            {/* Generic Reusable Image Spacing, Padding, Dimensions, and Alignment Component */}
            <ImageDisplaySettingsCard
              title="Get Started / Auth Artwork Spacing & Display Layout"
              description="Control container padding, outer margins, frame scale, alignment, focal point, and border radius to eliminate unwanted surrounding space."
              prefix="auth_page_image"
              formData={formData}
              onChange={handleChange}
              imageUrl={formData["auth_page_image_url"]}
              defaultBgColor="#0B2B22"
              defaultWidth="85%"
              defaultHeight="80%"
            />
          </div>
        </div>
      )}

      {/* SEO Tab */}
      {activeTab === "seo" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-line bg-white shadow-xs space-y-4">
            <h3 className="font-bold text-base text-ink">Global Search Metadata Defaults</h3>
            <p className="text-xs text-ink-secondary">
              These fallback values are injected into all public landing pages, pricing tables, and blog previews.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Default SEO Title Template
                </label>
                <input
                  type="text"
                  value={formData["seo_default_title"] || ""}
                  onChange={(e) => handleChange("seo_default_title", e.target.value)}
                  placeholder="SellerSalt — The Operating System for High-Volume Etsy Sellers"
                  className="w-full text-xs bg-[#FAFAF8] border border-line px-3.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Default Meta Description
                </label>
                <textarea
                  rows={3}
                  value={formData["seo_default_description"] || ""}
                  onChange={(e) => handleChange("seo_default_description", e.target.value)}
                  placeholder="Comprehensive competitor intelligence, SEO keyword research, and shop analytics..."
                  className="w-full text-xs bg-[#FAFAF8] border border-line px-3.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Canonical Base URL Override
                </label>
                <input
                  type="url"
                  value={formData["seo_canonical_url"] || ""}
                  onChange={(e) => handleChange("seo_canonical_url", e.target.value)}
                  placeholder="https://sellersalt.com"
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-ink">Search Engine & Third-Party Verification</h3>
                <p className="text-xs text-ink-secondary">
                  Meta verification tags injected into the &lt;head&gt; across all public and application pages.
                </p>
              </div>
              <Badge variant="neutral">Domain Ownership</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Google Search Console Verification
                </label>
                <input
                  type="text"
                  value={formData["seo_google_site_verification"] || ""}
                  onChange={(e) => handleChange("seo_google_site_verification", e.target.value)}
                  placeholder="e.g. google-site-verification token or full tag"
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
                <p className="text-[11px] text-ink-tertiary mt-1">Renders &lt;meta name=&quot;google-site-verification&quot; content=&quot;...&quot; /&gt;</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Bing Webmaster Tools Verification
                </label>
                <input
                  type="text"
                  value={formData["seo_bing_site_verification"] || ""}
                  onChange={(e) => handleChange("seo_bing_site_verification", e.target.value)}
                  placeholder="e.g. msvalidate.01 token or XML code"
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
                <p className="text-[11px] text-ink-tertiary mt-1">Renders &lt;meta name=&quot;msvalidate.01&quot; content=&quot;...&quot; /&gt;</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Meta (Facebook/Instagram) Domain Verification
                </label>
                <input
                  type="text"
                  value={formData["seo_meta_domain_verification"] || ""}
                  onChange={(e) => handleChange("seo_meta_domain_verification", e.target.value)}
                  placeholder="e.g. facebook-domain-verification token"
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
                <p className="text-[11px] text-ink-tertiary mt-1">Renders &lt;meta name=&quot;facebook-domain-verification&quot; content=&quot;...&quot; /&gt;</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Pinterest Domain Verification
                </label>
                <input
                  type="text"
                  value={formData["seo_pinterest_site_verification"] || ""}
                  onChange={(e) => handleChange("seo_pinterest_site_verification", e.target.value)}
                  placeholder="e.g. p:domain_verify token"
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
                <p className="text-[11px] text-ink-tertiary mt-1">Renders &lt;meta name=&quot;p:domain_verify&quot; content=&quot;...&quot; /&gt;</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                Custom Verification &amp; Header &lt;meta&gt; Tags
              </label>
              <textarea
                rows={3}
                value={formData["seo_custom_meta_tags"] || ""}
                onChange={(e) => handleChange("seo_custom_meta_tags", e.target.value)}
                placeholder={'<meta name="custom-verification" content="xyz" />\nor name=content pairs'}
                className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
              />
              <p className="text-[11px] text-ink-tertiary mt-1">
                Optional custom meta tags for unlisted verification providers, search engines, or domain audits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Schema Tab */}
      {activeTab === "schema" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-line bg-white shadow-xs space-y-4">
            <h3 className="font-bold text-base text-ink">Structured Data (JSON-LD) Entities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Organization Schema Name</label>
                <input
                  type="text"
                  value={formData["seo_schema_org_name"] || ""}
                  onChange={(e) => handleChange("seo_schema_org_name", e.target.value)}
                  placeholder="SellerSalt Technologies Inc."
                  className="w-full text-xs bg-[#FAFAF8] border border-line px-3.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">WebSite Schema Name</label>
                <input
                  type="text"
                  value={formData["seo_schema_website_name"] || ""}
                  onChange={(e) => handleChange("seo_schema_website_name", e.target.value)}
                  placeholder="SellerSalt"
                  className="w-full text-xs bg-[#FAFAF8] border border-line px-3.5 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-ink">Robots & Sitemap Verification</h3>
                <p className="text-xs text-ink-secondary">Live crawler routes served dynamically.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink">/robots.txt</p>
                  <p className="text-[11px] text-ink-secondary">Allows search indexing for public paths.</p>
                </div>
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0E8F5D] font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>View Route</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink">/sitemap.xml</p>
                  <p className="text-[11px] text-ink-secondary">Dynamic XML sitemap of all public pages.</p>
                </div>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#0E8F5D] font-semibold hover:underline inline-flex items-center gap-1"
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
