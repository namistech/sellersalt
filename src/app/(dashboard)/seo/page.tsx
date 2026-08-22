"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  ExternalLink,
  Bookmark,
  Check,
  AlertTriangle,
  SlidersHorizontal,
  Compass,
  Store,
  FileText,
  Layers,
  Sparkles,
  Tag,
  Image as ImageIcon,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Input, Button, Heading, Text, Badge } from "@/components/ui";
import { MarketplaceSelector, type MarketplaceSelectValue } from "@/components/ui/MarketplaceSelector";
import { MARKETPLACE_LABELS } from "@/components/intelligence/MarketplaceStatusCard";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { auditListing, auditShopSeo, addSeoAuditToPlanner } from "@/services/seo-engine-client";
import { getOptimizationRules } from "@/marketplaces/core/optimization-rules";
import { marketplaceFromSellerChannelPlatform, type MarketplaceId } from "@/marketplaces/core/types";
import { parseEtsyListingInput } from "@/lib/etsy-listing-parser";
import { parseEtsyShopInput } from "@/lib/etsy-url-parser";
import type { CompleteListingSeoAudit, SeoIssueSeverity, SeoGrade } from "@/types/seo";
import type { CompleteShopSeoAudit } from "@/types/shop-seo-audit";

type AuditTab = "LIVE_LISTING" | "DRAFT_PLAYGROUND" | "SHOP_SEO";

const SEVERITY_COLORS: Record<SeoIssueSeverity, string> = {
  CRITICAL: "text-[#E02424] bg-[#FDF2F2] border-[#F98080]/30",
  HIGH: "text-amber-800 bg-amber-50 border-amber-300",
  MEDIUM: "text-[#B37800] bg-[#FFF8E6] border-[#FFB020]/30",
  LOW: "text-ink-secondary bg-surface-muted border-line",
  INFO: "text-blue-800 bg-blue-50 border-blue-200",
};

const GRADE_COLORS: Record<SeoGrade, string> = {
  A: "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/40",
  B: "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/30",
  C: "text-[#B37800] bg-[#FFF8E6] border-[#FFB020]/30",
  D: "text-amber-800 bg-amber-50 border-amber-300",
  F: "text-[#E02424] bg-[#FDF2F2] border-[#F98080]/30",
};

function SeoAuditContent() {
  const searchParams = useSearchParams();
  const initialListingId = searchParams.get("listingId") || "";
  const initialShopQuery = searchParams.get("shop") || "";
  const initialTab = (searchParams.get("tab") as AuditTab) || (initialShopQuery ? "SHOP_SEO" : "LIVE_LISTING");

  const [activeTab, setActiveTab] = useState<AuditTab>(initialTab);

  // Live listing input
  const [listingQuery, setListingQuery] = useState(initialListingId);

  // Shop SEO input
  const [shopQuery, setShopQuery] = useState(initialShopQuery);

  // Draft playground inputs
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTagsString, setDraftTagsString] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftMaterialsString, setDraftMaterialsString] = useState("");
  const [draftTaxonomyId, setDraftTaxonomyId] = useState("");
  // Which marketplace's title/tag rules to score the draft against — a
  // single draft, not a fan-out, so "All Marketplaces" isn't offered here.
  // See src/marketplaces/core/optimization-rules.ts's getOptimizationRules().
  const [draftMarketplace, setDraftMarketplace] = useState<MarketplaceSelectValue>("etsy");
  // A connected seller channel, when picked, is authoritative over the
  // manual MarketplaceSelector above — the draft is being scored for a real
  // store, so its real platform decides the marketplace, not a guess.
  const [connectedChannels, setConnectedChannels] = useState<
    { id: string; platform: string; label: string; storeUrl: string }[]
  >([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const effectiveDraftMarketplace: MarketplaceId = (() => {
    if (selectedChannelId) {
      const channel = connectedChannels.find((c) => c.id === selectedChannelId);
      const fromChannel = channel && marketplaceFromSellerChannelPlatform(channel.platform);
      if (fromChannel) return fromChannel;
    }
    return (draftMarketplace === "all" ? "etsy" : draftMarketplace) as MarketplaceId;
  })();
  const draftRules = getOptimizationRules(effectiveDraftMarketplace);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/seller-channels")
      .then((res) => res.json())
      .then((data: { channels?: { id: string; platform: string; label: string; storeUrl: string }[] }) => {
        if (!cancelled) setConnectedChannels(data.channels || []);
      })
      .catch(() => {
        // Fail closed to "no connected stores" rather than blocking the
        // Draft Playground's manual marketplace picker.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Audit States
  const [auditResult, setAuditResult] = useState<CompleteListingSeoAudit | null>(null);
  const [resultMarketplace, setResultMarketplace] = useState<MarketplaceId>("etsy");
  const [shopAuditResult, setShopAuditResult] = useState<CompleteShopSeoAudit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopRedirectHint, setShopRedirectHint] = useState<string | null>(null);

  // Planner state
  const [savingPlanner, setSavingPlanner] = useState(false);
  const [savedPlanner, setSavedPlanner] = useState(false);

  async function runAuditById(id: number | string) {
    setLoading(true);
    setError(null);
    setShopRedirectHint(null);
    setSavedPlanner(false);

    try {
      const res = await auditListing({ listingId: String(id) });
      setAuditResult(res.audit);
      setResultMarketplace((res.marketplace as MarketplaceId) || "etsy");
      setShopAuditResult(null);
    } catch (err: any) {
      setError(err.message || "Failed to audit Etsy listing.");
      setAuditResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function runShopAudit(query: string) {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSavedPlanner(false);

    try {
      const res = await auditShopSeo({ shopQuery: query.trim() });
      setShopAuditResult(res.audit);
      setAuditResult(null);
    } catch (err: any) {
      setError(err.message || "Failed to audit Etsy shop.");
      setShopAuditResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialListingId) {
      const parsed = parseEtsyListingInput(initialListingId);
      if (parsed.listingId) {
        runAuditById(parsed.listingId);
      }
    } else if (initialShopQuery) {
      runShopAudit(initialShopQuery);
    }
  }, [initialListingId, initialShopQuery]);

  async function handleAuditLiveListing(e: React.FormEvent) {
    e.preventDefault();
    if (!listingQuery.trim()) return;

    const parsed = parseEtsyListingInput(listingQuery);
    if (parsed.isShopUrl && parsed.shopName) {
      // Direct user into Shop SEO audit tab smoothly
      setActiveTab("SHOP_SEO");
      setShopQuery(parsed.shopName);
      runShopAudit(parsed.shopName);
      return;
    }

    if (!parsed.listingId) {
      setError(parsed.error || "Please enter a valid Etsy listing URL or numeric listing ID.");
      setShopRedirectHint(null);
      setAuditResult(null);
      return;
    }

    runAuditById(parsed.listingId);
  }

  async function handleAuditShop(e: React.FormEvent) {
    e.preventDefault();
    if (!shopQuery.trim()) return;
    runShopAudit(shopQuery);
  }

  async function handleAuditDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draftTitle.trim()) return;

    setLoading(true);
    setError(null);
    setSavedPlanner(false);

    const tags = draftTagsString
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const materials = draftMaterialsString
      .split(/[,;\n]/)
      .map((m) => m.trim())
      .filter(Boolean);

    try {
      const res = await auditListing({
        title: draftTitle,
        tags,
        description: draftDescription,
        materials,
        taxonomyId: draftTaxonomyId ? Number(draftTaxonomyId) : undefined,
        // A selected connected store is authoritative server-side too (the
        // route re-resolves it from sellerChannelId) — sending marketplace
        // as well just keeps a sane fallback if the channel lookup misses.
        sellerChannelId: selectedChannelId || undefined,
        marketplace: draftMarketplace === "all" ? "etsy" : draftMarketplace,
      });
      setAuditResult(res.audit);
      setResultMarketplace((res.marketplace as MarketplaceId) || "etsy");
      setShopAuditResult(null);
    } catch (err: any) {
      setError(err.message || "Failed to audit draft.");
      setAuditResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToPlanner() {
    if (!auditResult) return;
    setSavingPlanner(true);
    try {
      await addSeoAuditToPlanner(auditResult);
      setSavedPlanner(true);
    } catch (err: any) {
      alert(err.message || "Failed to add SEO task to Planner");
    } finally {
      setSavingPlanner(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Listing Optimization & SEO Audit"
        description="Run deterministic 0–100 algorithmic listing-optimization audits on active listings, drafts, or whole shops — scored against each marketplace's real ranking rules (Etsy's are fully live today; the Draft Playground supports scoring against any registered marketplace)."
      />

      {/* Bespoke Dark Surface Composition for SEO Audit Section (Part 22) */}
      <div className="rounded-2xl bg-[#141B16] border border-[#2A362D] p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#0E8F5D] text-white text-xs font-bold">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#16C784]">
                {activeTab === "DRAFT_PLAYGROUND"
                  ? `${MARKETPLACE_LABELS[effectiveDraftMarketplace] ?? effectiveDraftMarketplace} Listing Optimization Rubric`
                  : "Etsy Algorithmic Ranking Rubric"}
              </span>
              <DataProvenanceBadge type="SELLERSALT_SCORE" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Deterministic 6-Pillar Listing Quality Breakdown
            </h2>
            <p className="text-xs text-[#D1DCD2] leading-relaxed">
              {activeTab === "DRAFT_PLAYGROUND" ? (
                <>
                  Audits title character utilization
                  {draftRules.titleMaxLength !== null ? ` (${draftRules.titleMaxLength} max)` : ""}
                  {draftRules.tagCount !== null ? `, ${draftRules.tagCount}-tag completeness` : ", tag completeness"},
                  tag-to-title synergy, and keyword density
                  {draftRules.titleMaxLength === null && draftRules.tagCount === null
                    ? ` — ${MARKETPLACE_LABELS[effectiveDraftMarketplace] ?? effectiveDraftMarketplace} has no published title/tag limits yet, so those checks are skipped rather than guessed.`
                    : "."}
                </>
              ) : (
                "Audits title character utilization (140 max), 13-tag completeness, tag-to-title synergy, keyword density, and shop-level merchandising."
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#1C261F] border border-[#2A362D] rounded-xl px-4 py-3 text-center">
              <div className="text-label-sm text-[#A6B2A8] uppercase font-bold tracking-wider">Tag Target</div>
              <div className="text-lg font-mono font-extrabold text-[#16C784]">
                {activeTab === "DRAFT_PLAYGROUND" ? (draftRules.tagCount !== null ? `${draftRules.tagCount}/${draftRules.tagCount}` : "N/A") : "13/13"}
              </div>
            </div>
            <div className="bg-[#1C261F] border border-[#2A362D] rounded-xl px-4 py-3 text-center">
              <div className="text-label-sm text-[#A6B2A8] uppercase font-bold tracking-wider">Title Target</div>
              <div className="text-lg font-mono font-extrabold text-white">
                {activeTab === "DRAFT_PLAYGROUND"
                  ? draftRules.titleMinRecommended !== null && draftRules.titleMaxLength !== null
                    ? `${draftRules.titleMinRecommended}–${draftRules.titleMaxLength}c`
                    : "N/A"
                  : "120–140c"}
              </div>
            </div>
            <div className="bg-[#1C261F] border border-[#2A362D] rounded-xl px-4 py-3 text-center">
              <div className="text-label-sm text-[#A6B2A8] uppercase font-bold tracking-wider">Synergy</div>
              <div className="text-lg font-mono font-extrabold text-[#FBBF24]">Exact Match</div>
            </div>
          </div>
        </div>
      </div>

      {/* Input / Workbench Card */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-line pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("LIVE_LISTING");
              setError(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === "LIVE_LISTING"
                ? "bg-[#0E8F5D] text-white shadow-xs"
                : "text-ink-secondary hover:text-ink hover:bg-surface-muted"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Audit Live Etsy Listing
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("SHOP_SEO");
              setError(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === "SHOP_SEO"
                ? "bg-[#0E8F5D] text-white shadow-xs"
                : "text-ink-secondary hover:text-ink hover:bg-surface-muted"
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            Shop SEO Audit
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("DRAFT_PLAYGROUND");
              setError(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === "DRAFT_PLAYGROUND"
                ? "bg-[#0E8F5D] text-white shadow-xs"
                : "text-ink-secondary hover:text-ink hover:bg-surface-muted"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Audit Listing Draft / Playground
          </button>
        </div>

        {/* Tab 1: Live Listing */}
        {activeTab === "LIVE_LISTING" && (
          <form onSubmit={handleAuditLiveListing} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                value={listingQuery}
                onChange={(e) => setListingQuery(e.target.value)}
                placeholder="Enter Etsy Listing ID or URL (e.g. 1729482012 or https://www.etsy.com/listing/...)..."
                className="pl-10 h-11 text-sm font-medium"
              />
              <Search className="h-4 w-4 text-ink-tertiary absolute left-3.5 top-3.5 pointer-events-none" />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="h-11 px-6 text-sm font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white shrink-0"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Run Listing Audit
            </Button>
          </form>
        )}

        {/* Tab 2: Shop SEO Audit (Part 16) */}
        {activeTab === "SHOP_SEO" && (
          <form onSubmit={handleAuditShop} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                value={shopQuery}
                onChange={(e) => setShopQuery(e.target.value)}
                placeholder="Enter Etsy Shop URL or Shop Name (e.g. PlannerStudioCo or https://www.etsy.com/shop/...)..."
                className="pl-10 h-11 text-sm font-medium"
              />
              <Store className="h-4 w-4 text-ink-tertiary absolute left-3.5 top-3.5 pointer-events-none" />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="h-11 px-6 text-sm font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white shrink-0"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Run Shop SEO Audit
            </Button>
          </form>
        )}

        {/* Tab 3: Draft Playground */}
        {activeTab === "DRAFT_PLAYGROUND" && (
          <form onSubmit={handleAuditDraft} className="space-y-4">
            {connectedChannels.length > 0 && (
              <div className="space-y-1.5">
                <label className="font-bold text-xs text-ink">Connected Store (optional)</label>
                <select
                  value={selectedChannelId}
                  onChange={(e) => setSelectedChannelId(e.target.value)}
                  className="w-full sm:w-auto bg-[#FAFAF8] border border-line rounded-lg px-2.5 py-2 text-xs font-medium text-ink"
                >
                  <option value="">— Manual marketplace (below) —</option>
                  {connectedChannels.map((c) => {
                    const mp = marketplaceFromSellerChannelPlatform(c.platform);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.label} ({mp ? MARKETPLACE_LABELS[mp] ?? mp : c.platform})
                      </option>
                    );
                  })}
                </select>
                {selectedChannelId && (
                  <p className="text-meta text-ink-tertiary">
                    Scoring against {MARKETPLACE_LABELS[effectiveDraftMarketplace] ?? effectiveDraftMarketplace}'s real rules —
                    determined by this connected store, not the marketplace picker below.
                  </p>
                )}
              </div>
            )}

            <div className={`space-y-1.5 ${selectedChannelId ? "opacity-50 pointer-events-none" : ""}`}>
              <label className="font-bold text-xs text-ink">Score Draft Against</label>
              <MarketplaceSelector
                className="w-fit"
                selectedId={draftMarketplace}
                onChange={(id) => setDraftMarketplace(id)}
                allowAll={false}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-ink">
                  Listing Title {draftRules.titleMaxLength !== null ? `(${draftTitle.length}/${draftRules.titleMaxLength} chars)` : `(${draftTitle.length} chars)`}
                </label>
                <span className={`font-mono text-meta ${draftRules.titleMaxLength !== null && draftTitle.length > draftRules.titleMaxLength ? "text-red-600 font-bold" : "text-ink-tertiary"}`}>
                  {draftRules.titleMaxLength !== null
                    ? `${draftRules.titleMaxLength - draftTitle.length} chars left`
                    : `No published limit yet for ${MARKETPLACE_LABELS[draftRules.marketplace] ?? draftRules.marketplace}`}
                </span>
              </div>
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Enter listing title (e.g. Personalized Leather Passport Holder | Travel Wallet...)"
                className="h-10 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-xs text-ink">
                  {draftRules.tagCount !== null
                    ? `Tags (Comma or line separated, up to ${draftRules.tagCount} tags)`
                    : "Tags (Comma or line separated)"}
                </label>
                <textarea
                  rows={3}
                  value={draftTagsString}
                  onChange={(e) => setDraftTagsString(e.target.value)}
                  placeholder="leather passport, travel wallet, custom cover, gift for him..."
                  className="w-full rounded-lg border border-line p-2.5 text-xs text-ink focus:border-[#0E8F5D] focus:ring-1 focus:ring-[#0E8F5D]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-xs text-ink">Materials & Taxonomy ID</label>
                <div className="space-y-2">
                  <Input
                    value={draftMaterialsString}
                    onChange={(e) => setDraftMaterialsString(e.target.value)}
                    placeholder="Materials: Full Grain Leather, Brass..."
                    className="h-9 text-xs"
                  />
                  <Input
                    value={draftTaxonomyId}
                    onChange={(e) => setDraftTaxonomyId(e.target.value)}
                    placeholder="Taxonomy ID (e.g. 6889)..."
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-xs text-ink">Listing Description (First 160 chars evaluated as search snippet)</label>
              <textarea
                rows={4}
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Detailed listing description including product specs, sizing, care instructions, and customer FAQ..."
                className="w-full rounded-lg border border-line p-2.5 text-xs text-ink focus:border-[#0E8F5D] focus:ring-1 focus:ring-[#0E8F5D]"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-semibold"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Evaluate Draft SEO Score
            </Button>
          </form>
        )}

        {/* Error / Redirect Prompt */}
        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">{error}</p>
              {shopRedirectHint && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("SHOP_SEO");
                    setShopQuery(shopRedirectHint);
                    runShopAudit(shopRedirectHint);
                  }}
                  className="font-bold underline hover:text-red-900"
                >
                  Audit "{shopRedirectHint}" in Shop SEO Audit →
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ================================================================ */}
      {/* SHOP SEO AUDIT RESULTS VIEW (Part 16)                            */}
      {/* ================================================================ */}
      {shopAuditResult && (
        <div className="space-y-6">
          {/* Shop Header Banner */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6">
              <div className="flex items-start gap-4">
                {shopAuditResult.iconUrl ? (
                  <img
                    src={shopAuditResult.iconUrl}
                    alt={shopAuditResult.shopName}
                    className="w-14 h-14 rounded-xl object-cover border border-line shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-surface-muted border border-line flex items-center justify-center text-ink-tertiary">
                    <Store className="h-6 w-6" />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Heading as="h1" size="h3" className="text-xl font-bold text-ink">
                      {shopAuditResult.shopName}
                    </Heading>
                    <a
                      href={shopAuditResult.shopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-ink-secondary hover:text-[#0E8F5D] flex items-center gap-1"
                    >
                      View on Etsy <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {shopAuditResult.title && (
                    <p className="text-xs text-ink-secondary font-medium line-clamp-1">
                      {shopAuditResult.title}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
                    <span className="text-meta text-ink-tertiary">
                      {shopAuditResult.actualData.sampleListingsAudited} listings analyzed
                    </span>
                  </div>
                </div>
              </div>

              {/* Overall Score Badge */}
              <div className="flex items-center gap-4 bg-[#FAFAF8] border border-line p-4 rounded-xl shrink-0">
                <div className="text-right">
                  <div className="text-label-sm uppercase font-bold text-ink-tertiary tracking-wider">
                    Shop SEO Health
                  </div>
                  <div className="text-sm font-semibold text-ink-secondary">
                    {shopAuditResult.overallShopSeoScore >= 80 ? "Optimized" : "Needs Attention"}
                  </div>
                </div>
                <div className="text-3xl font-extrabold font-mono text-[#0E8F5D] bg-[#E7FAF1] border border-[#16C784]/30 px-3.5 py-1.5 rounded-xl">
                  {shopAuditResult.overallShopSeoScore}<span className="text-sm font-normal text-ink-tertiary">/100</span>
                </div>
              </div>
            </div>

            {/* 4 Score Breakdown Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                <div className="text-label-sm font-bold text-ink-tertiary uppercase flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-[#0E8F5D]" /> Branding & Icon
                </div>
                <div className="text-xl font-bold font-mono text-ink">
                  {shopAuditResult.brandingScore}%
                </div>
                <div className="text-meta text-ink-secondary">
                  {shopAuditResult.actualData.hasIcon ? "✓ Icon" : "✗ Missing Icon"} · {shopAuditResult.actualData.hasBanner ? "✓ Banner" : "✗ Missing Banner"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                <div className="text-label-sm font-bold text-ink-tertiary uppercase flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-[#0E8F5D]" /> 13-Tag Utilization
                </div>
                <div className="text-xl font-bold font-mono text-ink">
                  {shopAuditResult.catalogMetrics.perfect13TagListingPercent}%
                </div>
                <div className="text-meta text-ink-secondary">
                  {shopAuditResult.catalogMetrics.avgTagsPerListing}/13 average tags per listing
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                <div className="text-label-sm font-bold text-ink-tertiary uppercase flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#0E8F5D]" /> Title Quality
                </div>
                <div className="text-xl font-bold font-mono text-ink">
                  {shopAuditResult.titleQualityScore}%
                </div>
                <div className="text-meta text-ink-secondary">
                  {shopAuditResult.catalogMetrics.avgTitleLength} average character length
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                <div className="text-label-sm font-bold text-ink-tertiary uppercase flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-[#0E8F5D]" /> Image Completeness
                </div>
                <div className="text-xl font-bold font-mono text-ink">
                  {shopAuditResult.imageCompletenessScore}%
                </div>
                <div className="text-meta text-ink-secondary">
                  {shopAuditResult.catalogMetrics.listingsWithImageGapsCount} listings with &lt; 5 images
                </div>
              </div>
            </div>

            {/* Keyword Density & Opportunities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line space-y-2">
                <div className="text-sm font-bold text-ink flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-[#0E8F5D]" /> Top Catalog Keyword Density
                </div>
                <p className="text-meta text-ink-secondary">
                  Most recurring search phrases across this shop's listing tags.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {shopAuditResult.catalogMetrics.topRepeatedKeywords.map((kw) => (
                    <span
                      key={kw.keyword}
                      className="px-2 py-0.5 rounded bg-white text-label-sm font-medium text-ink border border-line"
                    >
                      {kw.keyword} <strong className="text-[#0E8F5D]">({kw.frequencyPercent}%)</strong>
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line space-y-2">
                <div className="text-sm font-bold text-ink flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#B37800]" /> Missing Keyword Opportunities
                </div>
                <p className="text-meta text-ink-secondary">
                  High-intent buyer search tags not yet targeted in this shop's active catalog.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {shopAuditResult.catalogMetrics.missingKeywordOpportunities.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded bg-amber-50 text-label-sm font-medium text-amber-900 border border-amber-200"
                    >
                      + {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Explainable Recommendations (Part 16) */}
          {shopAuditResult.recommendations.length > 0 && (
            <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Heading as="h2" size="h4">
                    Shop SEO Action Recommendations
                  </Heading>
                  <p className="text-xs text-ink-secondary">
                    Algorithmic improvement actions prioritized by search ranking impact.
                  </p>
                </div>
                <DataProvenanceBadge type="SELLERSALT_SCORE" />
              </div>

              <div className="space-y-3">
                {shopAuditResult.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl border border-line bg-[#FAFAF8] space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-ink flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#0E8F5D] shrink-0" />
                          {rec.title}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#0E8F5D] bg-[#E7FAF1] px-2 py-0.5 rounded border border-[#16C784]/20 shrink-0">
                        +{rec.impactScore} pts
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1 border-t border-line-subtle">
                      <div>
                        <div className="text-label-sm uppercase font-bold text-ink-tertiary tracking-wider">
                          Observed Signal
                        </div>
                        <div className="text-ink-secondary mt-0.5">{rec.observedSignal}</div>
                      </div>
                      <div>
                        <div className="text-label-sm uppercase font-bold text-ink-tertiary tracking-wider">
                          Why It Matters
                        </div>
                        <div className="text-ink-secondary mt-0.5">{rec.whyItMatters}</div>
                      </div>
                      <div>
                        <div className="text-label-sm uppercase font-bold text-ink-tertiary tracking-wider">
                          Recommended Action
                        </div>
                        <div className="text-ink font-medium mt-0.5">{rec.recommendedAction}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* LISTING SEO AUDIT RESULTS VIEW                                   */}
      {/* ================================================================ */}
      {auditResult && (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-6">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${GRADE_COLORS[auditResult.grade]}`}>
                    Grade {auditResult.grade}
                  </span>
                  <Badge variant="neutral">{MARKETPLACE_LABELS[resultMarketplace] ?? resultMarketplace}</Badge>
                  <DataProvenanceBadge type="SELLERSALT_SCORE" />
                  {auditResult.listingId && (
                    <span className="text-xs text-ink-tertiary font-mono">
                      Listing #{auditResult.listingId}
                    </span>
                  )}
                </div>

                <Heading as="h1" size="h3" className="text-xl font-bold text-ink line-clamp-2">
                  {auditResult.title}
                </Heading>

                {auditResult.listingUrl && (
                  <a
                    href={auditResult.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink-secondary hover:text-[#0E8F5D] inline-flex items-center gap-1 font-medium"
                  >
                    View on Etsy <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={handleAddToPlanner}
                  disabled={savingPlanner || savedPlanner}
                  className="text-xs shadow-2xs"
                >
                  {savedPlanner ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#0E8F5D] mr-1" /> Added to Planner
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5 mr-1" /> Save to Planner
                    </>
                  )}
                </Button>

                <div className="text-right">
                  <div className="text-3xl font-extrabold font-mono text-[#0E8F5D]">
                    {auditResult.overallScore}<span className="text-sm font-normal text-ink-tertiary">/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rubric Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line text-center space-y-1">
                <div className="text-label-sm font-bold text-ink-tertiary uppercase">Title</div>
                <div className="text-lg font-bold font-mono text-ink">{auditResult.breakdown.titleScore}/30</div>
                <div className="text-meta text-ink-secondary">{auditResult.titleAnalysis.characterCount} chars</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line text-center space-y-1">
                <div className="text-label-sm font-bold text-ink-tertiary uppercase">13 Tags</div>
                <div className="text-lg font-bold font-mono text-ink">{auditResult.breakdown.tagScore}/30</div>
                <div className="text-meta text-ink-secondary">{auditResult.tagAnalysis.tagCount}/13 used</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line text-center space-y-1">
                <div className="text-label-sm font-bold text-ink-tertiary uppercase">Synergy</div>
                <div className="text-lg font-bold font-mono text-ink">{auditResult.breakdown.keywordSynergyScore}/15</div>
                <div className="text-meta text-ink-secondary">{auditResult.synergyAnalysis.matchingPhrases.length} in title</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line text-center space-y-1">
                <div className="text-label-sm font-bold text-ink-tertiary uppercase">Description</div>
                <div className="text-lg font-bold font-mono text-ink">{auditResult.breakdown.descriptionScore}/15</div>
                <div className="text-meta text-ink-secondary">{auditResult.descriptionAnalysis.hasFirst160Keyword ? "Hook ✓" : "No Hook"}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line text-center space-y-1">
                <div className="text-label-sm font-bold text-ink-tertiary uppercase">Taxonomy</div>
                <div className="text-lg font-bold font-mono text-ink">{auditResult.breakdown.taxonomyScore}/5</div>
                <div className="text-meta text-ink-secondary">{auditResult.taxonomyAnalysis.isDeepTaxonomy ? "Mapped ✓" : "Generic"}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line text-center space-y-1">
                <div className="text-label-sm font-bold text-ink-tertiary uppercase">Attributes</div>
                <div className="text-lg font-bold font-mono text-ink">{auditResult.breakdown.attributeScore}/5</div>
                <div className="text-meta text-ink-secondary">Complete</div>
              </div>
            </div>
          </Card>

          {/* Diagnostic Issues List */}
          {auditResult.diagnostics.length > 0 && (
            <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Heading as="h2" size="h4">
                  Diagnostic Issues ({auditResult.diagnostics.length})
                </Heading>
                <DataProvenanceBadge type="SELLERSALT_SCORE" />
              </div>

              <div className="space-y-3">
                {auditResult.diagnostics.map((diag, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-label-sm font-bold border ${SEVERITY_COLORS[diag.severity]}`}>
                          {diag.severity}
                        </span>
                        <span className="font-bold text-xs text-ink">{diag.title}</span>
                      </div>
                      <p className="text-xs text-ink-secondary">{diag.message}</p>
                      <p className="text-xs text-[#0E8F5D] font-medium pt-1">
                        ↳ Recommendation: {diag.recommendation}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-red-600">
                        -{diag.pointsDeducted} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tag Synergy Inspection */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <Heading as="h2" size="h4">
              Tag & Keyword Synergy Breakdown
            </Heading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-2">
                <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#0E8F5D]" /> Matching Phrases in Title & Tags ({auditResult.synergyAnalysis.matchingPhrases.length})
                </div>
                <p className="text-meta text-ink-secondary">
                  Exact keywords appearing in both title and tags maximize ranking power on {MARKETPLACE_LABELS[resultMarketplace] ?? resultMarketplace}.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {auditResult.synergyAnalysis.matchingPhrases.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded bg-[#E7FAF1] text-label-sm font-semibold text-[#0E8F5D] border border-[#16C784]/30">
                      {p}
                    </span>
                  ))}
                  {auditResult.synergyAnalysis.matchingPhrases.length === 0 && (
                    <span className="text-xs italic text-amber-800">No matching tag phrases found in title.</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-2">
                <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4 text-ink-tertiary" /> Tags Not in Title ({auditResult.synergyAnalysis.missingFromTitle.length})
                </div>
                <p className="text-meta text-ink-secondary">
                  Secondary search tags providing broader discovery.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                  {auditResult.synergyAnalysis.missingFromTitle.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded bg-white text-label-sm font-medium text-ink-secondary border border-line">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Actionable Recommendations Checklist */}
          {auditResult.recommendations.length > 0 && (
            <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Heading as="h2" size="h4">
                  Step-by-Step Optimization Roadmap
                </Heading>
                <DataProvenanceBadge type="SELLERSALT_SCORE" />
              </div>

              <div className="space-y-2.5">
                {auditResult.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl border border-line bg-[#FAFAF8] flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="font-bold text-xs text-ink">{rec.title}</div>
                      <div className="text-xs text-ink-secondary">{rec.action}</div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-[#0E8F5D]">
                        +{rec.impactScore} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Initial Empty State */}
      {!auditResult && !shopAuditResult && !loading && !error && (
        <Card padding="lg" className="border-line bg-white shadow-xs text-center py-16 space-y-3">
          <ShieldCheck className="h-10 w-10 text-ink-tertiary mx-auto" />
          <Heading as="h3" size="h4">
            Audit Any Listing, Draft, or Shop
          </Heading>
          <Text size="body-sm" color="secondary" className="max-w-md mx-auto">
            Paste an active Etsy Listing ID, URL, or Shop Name above to pull live data — or use Draft Playground to score listing content against any registered marketplace's optimization rules.
          </Text>
        </Card>
      )}
    </div>
  );
}

export default function SeoAuditPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-ink-tertiary">Loading SEO Engine...</div>}>
      <SeoAuditContent />
    </Suspense>
  );
}
