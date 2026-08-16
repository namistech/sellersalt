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
} from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Input, Button, Heading, Text } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import { auditListing, addSeoAuditToPlanner } from "@/services/seo-engine-client";
import type { CompleteListingSeoAudit, SeoIssueSeverity, SeoGrade } from "@/types/seo";

type AuditTab = "LIVE_LISTING" | "DRAFT_PLAYGROUND";

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

  const [activeTab, setActiveTab] = useState<AuditTab>("LIVE_LISTING");

  // Live listing input
  const [listingQuery, setListingQuery] = useState(initialListingId);

  // Draft playground inputs
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTagsString, setDraftTagsString] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftMaterialsString, setDraftMaterialsString] = useState("");
  const [draftTaxonomyId, setDraftTaxonomyId] = useState("");

  // State
  const [auditResult, setAuditResult] = useState<CompleteListingSeoAudit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Planner state
  const [savingPlanner, setSavingPlanner] = useState(false);
  const [savedPlanner, setSavedPlanner] = useState(false);

  function parseListingId(input: string): string {
    const trimmed = input.trim();
    const match = trimmed.match(/\/listing\/(\d+)/);
    if (match && match[1]) return match[1];
    return trimmed;
  }

  async function runAuditById(id: string) {
    if (!id) return;
    setLoading(true);
    setError(null);
    setSavedPlanner(false);

    try {
      const res = await auditListing({ listingId: id });
      setAuditResult(res.audit);
    } catch (err: any) {
      setError(err.message || "Failed to audit Etsy listing.");
      setAuditResult(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialListingId) {
      runAuditById(initialListingId);
    }
  }, [initialListingId]);

  async function handleAuditLiveListing(e: React.FormEvent) {
    e.preventDefault();
    const id = parseListingId(listingQuery);
    if (!id) return;
    runAuditById(id);
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
      });
      setAuditResult(res.audit);
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
        title="SEO Research & Audit Engine"
        description="Run deterministic 0–100 algorithmic audits on any Etsy listing or listing draft based on Etsy's ranking factors."
      />

      {/* Input / Workbench Card */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("LIVE_LISTING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === "LIVE_LISTING"
                ? "bg-[#0E8F5D] text-white"
                : "text-ink-secondary hover:text-ink hover:bg-surface-muted"
            }`}
          >
            Audit Live Etsy Listing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("DRAFT_PLAYGROUND")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === "DRAFT_PLAYGROUND"
                ? "bg-[#0E8F5D] text-white"
                : "text-ink-secondary hover:text-ink hover:bg-surface-muted"
            }`}
          >
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
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Run SEO Audit
            </Button>
          </form>
        )}

        {/* Tab 2: Draft Playground */}
        {activeTab === "DRAFT_PLAYGROUND" && (
          <form onSubmit={handleAuditDraft} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-ink">Listing Title ({draftTitle.length}/140 chars)</label>
                <span className={`font-mono text-[11px] ${draftTitle.length > 140 ? "text-red-600 font-bold" : "text-ink-tertiary"}`}>
                  {140 - draftTitle.length} chars left
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
                  Etsy Tags (Comma or line separated, up to 13 tags)
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
                    placeholder="Taxonomy Category ID (e.g. 100)"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-xs text-ink">Listing Description</label>
              <textarea
                rows={3}
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Enter product description..."
                className="w-full rounded-lg border border-line p-2.5 text-xs text-ink focus:border-[#0E8F5D] focus:ring-1 focus:ring-[#0E8F5D]"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="h-10 px-6 text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Evaluate Draft SEO Score
            </Button>
          </form>
        )}
      </Card>

      {/* Error View */}
      {error && (
        <Card padding="md" className="border-red-200 bg-red-50 text-red-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="h-4 w-4 text-red-600" /> SEO Audit Error
          </div>
          <p className="text-xs">{error}</p>
        </Card>
      )}

      {/* Audit Report View */}
      {auditResult && (
        <div className="space-y-6">
          {/* Header Score Banner */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line-subtle">
              <div className="flex items-start sm:items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-[#141B16] text-[#FFB020] flex items-center justify-center font-extrabold text-2xl shadow-sm shrink-0">
                  {auditResult.overallScore}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-ink">SellerSalt SEO Score</span>
                    <DataProvenanceBadge type="SELLERSALT_SCORE" />
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${GRADE_COLORS[auditResult.grade]}`}>
                      Grade {auditResult.grade} ({auditResult.overallScore}/100)
                    </div>
                  </div>
                  <div className="font-bold text-xs text-ink line-clamp-1">
                    {auditResult.title || "Listing Draft"}
                  </div>
                  {auditResult.listingId && (
                    <div className="text-[11px] text-ink-tertiary">
                      Etsy Listing ID: <strong className="font-mono text-ink">{auditResult.listingId}</strong>
                      {auditResult.shopName && ` · Shop: ${auditResult.shopName}`}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {auditResult.listingUrl && (
                  <a
                    href={auditResult.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-line bg-white hover:bg-[#FAFAF8] text-ink text-xs font-medium inline-flex items-center gap-1 shadow-2xs transition-colors"
                  >
                    <span>View on Etsy</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <Button
                  variant={savedPlanner ? "secondary" : "primary"}
                  size="default"
                  loading={savingPlanner}
                  disabled={savedPlanner}
                  onClick={handleAddToPlanner}
                  className="text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white disabled:bg-surface-muted disabled:text-ink-tertiary"
                >
                  {savedPlanner ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" /> Added to Planner
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5 mr-1" /> Add SEO Task to Planner
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 5-Dimension Metric Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                <div className="text-[10px] font-bold text-ink-tertiary uppercase">Title Audit</div>
                <div className="text-lg font-mono font-extrabold text-ink">
                  {auditResult.breakdown.titleScore}<span className="text-xs text-ink-tertiary font-normal">/30 pts</span>
                </div>
                <div className="text-[10px] text-ink-tertiary">{auditResult.titleAnalysis.characterCount} characters</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                <div className="text-[10px] font-bold text-ink-tertiary uppercase">13-Tag Audit</div>
                <div className="text-lg font-mono font-extrabold text-ink">
                  {auditResult.breakdown.tagScore}<span className="text-xs text-ink-tertiary font-normal">/35 pts</span>
                </div>
                <div className="text-[10px] text-ink-tertiary">{auditResult.tagAnalysis.tagCount}/13 tags used</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                <div className="text-[10px] font-bold text-ink-tertiary uppercase">Keyword Synergy</div>
                <div className="text-lg font-mono font-extrabold text-ink">
                  {auditResult.breakdown.keywordSynergyScore}<span className="text-xs text-ink-tertiary font-normal">/15 pts</span>
                </div>
                <div className="text-[10px] text-ink-tertiary">{auditResult.synergyAnalysis.exactMatchesCount} title matches</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
                <div className="text-[10px] font-bold text-ink-tertiary uppercase">Description</div>
                <div className="text-lg font-mono font-extrabold text-ink">
                  {auditResult.breakdown.descriptionScore}<span className="text-xs text-ink-tertiary font-normal">/10 pts</span>
                </div>
                <div className="text-[10px] text-ink-tertiary">{auditResult.descriptionAnalysis.wordCount} words</div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold text-ink-tertiary uppercase">Taxonomy & Attr</div>
                <div className="text-lg font-mono font-extrabold text-ink">
                  {auditResult.breakdown.taxonomyScore + auditResult.breakdown.attributeScore}
                  <span className="text-xs text-ink-tertiary font-normal">/10 pts</span>
                </div>
                <div className="text-[10px] text-ink-tertiary">{auditResult.taxonomyAnalysis.materialsCount} materials</div>
              </div>
            </div>
          </Card>

          {/* Diagnostic Issues List */}
          {auditResult.diagnostics.length > 0 && (
            <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heading as="h2" size="h4">
                    Diagnostic Issues Detected ({auditResult.diagnostics.length})
                  </Heading>
                  <DataProvenanceBadge type="SELLERSALT_SCORE" />
                </div>
              </div>

              <div className="divide-y divide-line-subtle border-t border-line-subtle">
                {auditResult.diagnostics.map((diag, idx) => (
                  <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${SEVERITY_COLORS[diag.severity]}`}>
                          {diag.severity}
                        </span>
                        <span className="font-bold text-xs text-ink">{diag.title}</span>
                      </div>
                      <p className="text-xs text-ink-secondary leading-relaxed">{diag.message}</p>
                      <div className="text-[11px] text-[#0E8F5D] font-medium pt-0.5">
                        Fix: {diag.recommendation}
                      </div>
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

          {/* Title Detailed Audit Panel */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heading as="h2" size="h4">
                  Title Analysis & Keyword Coverage
                </Heading>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>
              <span className="text-xs font-mono font-bold text-ink">
                {auditResult.titleAnalysis.score}/30 points
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-2">
              <div className="text-xs font-bold text-ink leading-relaxed">
                &quot;{auditResult.title}&quot;
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-tertiary pt-1 border-t border-line-subtle">
                <span>Length: <strong className="text-ink font-mono">{auditResult.titleAnalysis.characterCount} / 140 chars</strong></span>
                <span>·</span>
                <span className={auditResult.titleAnalysis.isOptimalLength ? "text-[#0E8F5D] font-bold" : "text-amber-700"}>
                  {auditResult.titleAnalysis.isOptimalLength ? "✓ Optimal Length (120-140)" : "Needs Length Optimization"}
                </span>
                <span>·</span>
                <span className={auditResult.titleAnalysis.hasHighIntentStart ? "text-[#0E8F5D] font-bold" : "text-ink-secondary"}>
                  {auditResult.titleAnalysis.hasHighIntentStart ? "✓ High-Intent Opening" : "Weak Opening Phrase"}
                </span>
              </div>
            </div>

            {auditResult.titleAnalysis.detectedKeywords.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-ink-tertiary uppercase">Extracted Primary Title Keywords:</span>
                <div className="flex flex-wrap gap-1.5">
                  {auditResult.titleAnalysis.detectedKeywords.map((k) => (
                    <span
                      key={k}
                      className="px-2 py-0.5 rounded-md bg-surface-muted text-[10px] font-medium text-ink border border-line"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* 13-Tag Utilization Panel */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heading as="h2" size="h4">
                  13-Tag Utilization & Structure ({auditResult.tagAnalysis.tagCount}/13)
                </Heading>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>
              <span className="text-xs font-mono font-bold text-ink">
                {auditResult.tagAnalysis.score}/35 points
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {Array.from({ length: 13 }).map((_, idx) => {
                const item = auditResult.tagAnalysis.tags[idx];
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all ${
                      item
                        ? item.isCompliant
                          ? "bg-[#FAFAF8] border-line"
                          : "bg-red-50 border-red-200"
                        : "bg-surface-muted/40 border-dashed border-line text-ink-tertiary"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-ink-tertiary">
                      <span>Tag #{idx + 1}</span>
                      {item && (
                        <span className={item.isCompliant ? "text-[#0E8F5D]" : "text-red-600"}>
                          {item.charCount}/20 chars
                        </span>
                      )}
                    </div>

                    {item ? (
                      <div className="mt-1 space-y-1">
                        <div className="font-bold text-xs text-ink truncate">{item.tag}</div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="text-ink-tertiary">{item.wordCount} words</span>
                          {item.isInTitle && (
                            <span className="text-[#0E8F5D] font-bold">· In Title</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs italic text-ink-tertiary">
                        Unused Tag Slot
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Title ↔ Tag Keyword Synergy Panel */}
          <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heading as="h2" size="h4">
                  Title & Tag Keyword Synergy
                </Heading>
                <DataProvenanceBadge type="SELLERSALT_SCORE" />
              </div>
              <span className="text-xs font-mono font-bold text-ink">
                {auditResult.synergyAnalysis.score}/15 points
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-[#E7FAF1] border border-[#16C784]/30 space-y-2">
                <div className="text-xs font-bold text-[#0E8F5D] flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Matching Phrases ({auditResult.synergyAnalysis.exactMatchesCount})
                </div>
                <p className="text-[11px] text-[#0C7A52]">
                  These tags appear in your title, giving your listing exact-match query boost in Etsy search.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {auditResult.synergyAnalysis.matchingPhrases.length > 0 ? (
                    auditResult.synergyAnalysis.matchingPhrases.map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded bg-white text-xs font-semibold text-[#0E8F5D] border border-[#16C784]/30">
                        {p}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs italic text-amber-800">No matching tag phrases found in title.</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-2">
                <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4 text-ink-tertiary" /> Tags Not in Title ({auditResult.synergyAnalysis.missingFromTitle.length})
                </div>
                <p className="text-[11px] text-ink-secondary">
                  Secondary search tags providing broader discovery.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-24 overflow-y-auto">
                  {auditResult.synergyAnalysis.missingFromTitle.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded bg-white text-[11px] font-medium text-ink-secondary border border-line">
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
      {!auditResult && !loading && !error && (
        <Card padding="lg" className="border-line bg-white shadow-xs text-center py-16 space-y-3">
          <ShieldCheck className="h-10 w-10 text-ink-tertiary mx-auto" />
          <Heading as="h3" size="h4">
            Audit Any Etsy Listing or Draft
          </Heading>
          <Text size="body-sm" color="secondary" className="max-w-md mx-auto">
            Paste any active Etsy Listing ID or URL above to audit title character utilization, 13-tag slots, keyword synergy, and description hooks.
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
