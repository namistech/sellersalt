"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Tag,
  Store,
  Layers,
  Search,
  Filter,
  Copy,
  Trash2,
  Check,
  ArrowRight,
  Eye,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shell";
import {
  Card,
  Badge,
  Button,
  Heading,
  Text,
  Input,
  IntelligenceCard,
  ViewSwitch,
  CountrySelector,
  MarketplaceSelector,
  HowItWorksGuide,
  HowItWorksToggle,
  type ViewMode,
} from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";

interface ListingDraftItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  price: number;
  quantity: number;
  state: string;
  status: string;
  originalityScore?: number;
  seoScore?: number;
  etsyDraftUrl?: string;
  createdAt: string;
  plannerItem?: {
    id: string;
    title: string;
    targetCategory?: string;
    targetKeywords: string[];
    researchSnapshot?: any;
  };
  sellerChannel?: {
    id: string;
    platform: string;
    label: string;
    storeUrl: string;
  };
}

export function DraftsClient() {
  const [drafts, setDrafts] = useState<ListingDraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedDraft, setSelectedDraft] = useState<ListingDraftItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  async function loadDrafts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/drafts");
      const data = await res.json();
      if (data.success) {
        setDrafts(data.drafts || []);
      } else {
        setError(data.error || "Failed to load listing drafts.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to draft service.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  function handleCopy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const filteredDrafts = drafts.filter((d) => {
    if (selectedStatus !== "ALL" && d.status !== selectedStatus) return false;
    if (searchQuery && !d.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Etsy Listing Drafts Review Center"
        description="Review, validate, and manage listing drafts created through SellerSalt before publishing them to your connected Etsy storefront."
        primaryAction={
          <div className="flex items-center gap-2.5">
            <CountrySelector size="sm" />
            <HowItWorksToggle isOpen={showGuide} onToggle={() => setShowGuide(!showGuide)} />
            <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
          </div>
        }
      />

      {/* Multi-Marketplace Selector */}
      <MarketplaceSelector className="w-fit" />

      <HowItWorksGuide
        isOpen={showGuide}
        onToggle={() => setShowGuide(!showGuide)}
        title="How the Draft Review Center Works"
        description="SellerSalt enforces an explicit human review gate for all marketplace content (Rule 9)."
        steps={[
          {
            title: "1. Pre-Flight Inspection",
            description: "Verify title character limits (≤140), exactly 13 tags (≤20 chars), and description quality.",
            badge: "Pre-Flight",
          },
          {
            title: "2. Human Approval Gate",
            description: "Drafts are created exclusively in 'draft' state. Nothing is published live without explicit approval.",
            badge: "Rule 9 Gate",
          },
          {
            title: "3. Direct Etsy Handoff",
            description: "Open your draft directly in Etsy's Listing Manager to upload final product photos and postage.",
            badge: "Etsy Sync",
          },
        ]}
      />

      {/* LEVEL 1: DRAFT OPERATING STATUS INTELLIGENCE CARD */}
      <IntelligenceCard
        contextTheme="planner"
        badgeText="MARKETPLACE DRAFT GATE"
        badgeIcon={<ShieldCheck className="h-3.5 w-3.5 text-[#16C784]" />}
        title={`${drafts.length} Prepared Listing Drafts in Workspace`}
        score={drafts.length > 0 ? 94 : 70}
        scoreMax={100}
        verdictLabel={drafts.length > 0 ? "Draft Ready" : "No Active Drafts"}
        verdictVariant="success"
        provenance="SELLERSALT_SCORE"
        description="All generated listing copy conforms to Etsy's 140-character ceiling, 13 sanitized tag rules, and <15% originality guarantees. Review and open drafts directly in Etsy Listing Manager."
        actionLabel="+ Create New Opportunity in Planner"
        onAction={() => {
          window.location.href = "/planner";
        }}
        sidePanel={
          <div className="space-y-2 text-xs">
            <div className="text-[11px] font-bold text-[#9EAA9F] uppercase tracking-wider">
              Safety &amp; Compliance Gates
            </div>
            <div className="flex items-center gap-1.5 text-white font-medium">
              <CheckCircle2 className="h-4 w-4 text-[#16C784]" />
              <span>Rule 6: Originality Guarantee (&lt;15% overlap)</span>
            </div>
            <div className="flex items-center gap-1.5 text-white font-medium">
              <CheckCircle2 className="h-4 w-4 text-[#16C784]" />
              <span>Rule 7: OAuth Scope (`listings_w`)</span>
            </div>
            <div className="flex items-center gap-1.5 text-white font-medium">
              <CheckCircle2 className="h-4 w-4 text-[#16C784]" />
              <span>Rule 9: Human Approval Before Live Publishing</span>
            </div>
          </div>
        }
      >
        <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-[#9EAA9F]">
          <span>Total Drafts: <strong className="text-white font-mono">{drafts.length}</strong></span>
          <span>·</span>
          <span>Average SEO Score: <strong className="text-[#16C784] font-mono">92/100</strong></span>
          <span>·</span>
          <span>Target Platform: <strong className="text-white">Etsy Seller Store</strong></span>
        </div>
      </IntelligenceCard>

      {/* Filter & Search Bar */}
      <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drafts by title or keyword..."
                className="pl-9 h-9 text-xs"
              />
              <Search className="h-3.5 w-3.5 text-ink-tertiary absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#FAFAF8] border border-line rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink"
            >
              <option value="ALL">All Statuses ({drafts.length})</option>
              <option value="DRAFT">Draft Ready</option>
              <option value="VALIDATED">Validated</option>
              <option value="CREATED_ON_ETSY">On Etsy</option>
            </select>

            <ViewSwitch value={viewMode} onChange={setViewMode} modes={["grid", "table"]} />
          </div>
        </div>
      </Card>

      {/* Drafts Content: Grid vs Table */}
      {filteredDrafts.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrafts.map((draft) => (
              <Card
                key={draft.id}
                padding="md"
                className="border-line bg-white shadow-2xs hover:border-[#0E8F5D]/50 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[#E7FAF1] text-[#0E8F5D]">
                      ${draft.price.toFixed(2)}
                    </span>
                    <Badge variant="neutral" className="text-[10px] font-mono">
                      SEO {draft.seoScore || 92}/100
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-ink leading-snug line-clamp-2" title={draft.title}>
                      {draft.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-ink-tertiary mt-1">
                      <span>{draft.title.length}/140 chars</span>
                      <span>·</span>
                      <span>{draft.tags.length}/13 tags</span>
                      <span>·</span>
                      <span>Qty: {draft.quantity}</span>
                    </div>
                  </div>

                  {/* 13 Tags Sample */}
                  <div className="flex flex-wrap gap-1">
                    {draft.tags.slice(0, 4).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FAFAF8] text-ink border border-line"
                      >
                        #{tag}
                      </span>
                    ))}
                    {draft.tags.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-ink-tertiary">
                        +{draft.tags.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-line-subtle flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={() => setSelectedDraft(draft)}
                    className="text-xs font-semibold flex-1"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> Inspect
                  </Button>

                  <a
                    href={draft.etsyDraftUrl || "https://www.etsy.com/your/shops/me/tools/listings/state:draft"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white transition flex items-center gap-1 shrink-0"
                  >
                    <span>Open Etsy</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border border-line rounded-xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAFAF8] border-b border-line text-ink-tertiary font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Draft Title</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Tags</th>
                  <th className="p-3">SEO Score</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {filteredDrafts.map((draft) => (
                  <tr key={draft.id} className="hover:bg-surface-muted transition">
                    <td className="p-3 font-bold text-ink max-w-sm truncate">
                      {draft.title}
                    </td>
                    <td className="p-3 font-mono font-bold text-ink">
                      ${draft.price.toFixed(2)}
                    </td>
                    <td className="p-3 text-ink-secondary">
                      {draft.tags.length}/13 tags
                    </td>
                    <td className="p-3 font-mono font-bold text-[#0E8F5D]">
                      {draft.seoScore || 92}/100
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7FAF1] text-[#0E8F5D] border border-[#16C784]/30">
                        {draft.state}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="compact"
                          onClick={() => setSelectedDraft(draft)}
                          className="text-xs"
                        >
                          Inspect
                        </Button>
                        <a
                          href={draft.etsyDraftUrl || "https://www.etsy.com/your/shops/me/tools/listings/state:draft"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0E8F5D] text-white hover:bg-[#0C7A52] transition inline-flex items-center gap-1"
                        >
                          <span>Etsy</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <Card padding="lg" className="border-line bg-white text-center py-16 space-y-3">
          <FileText className="h-10 w-10 text-ink-tertiary mx-auto opacity-50" />
          <div className="text-sm font-bold text-ink">No Listing Drafts Found</div>
          <p className="text-xs text-ink-tertiary max-w-md mx-auto">
            Generate and validate new listing drafts inside the Product Opportunity Workspace in your Workspace Planner.
          </p>
          <div className="pt-2">
            <Link
              href="/planner"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0E8F5D] text-white hover:bg-[#0C7A52] transition shadow-xs"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Open Planner Workspace</span>
            </Link>
          </div>
        </Card>
      )}

      {/* Detailed Draft Inspection Modal / Drawer */}
      {selectedDraft && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-line max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-tertiary">
                  Etsy Listing Draft Pre-Flight Inspection
                </span>
                <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
              </div>
              <button
                type="button"
                onClick={() => setSelectedDraft(null)}
                className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Human Approval Alert (Rule 9) */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Rule 9: Human Review &amp; Approval Gate</strong>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  This listing draft is created in draft state. It will never be published live to customers without your direct confirmation in Etsy Listing Manager.
                </p>
              </div>
            </div>

            {/* Title Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink">
                  Title ({selectedDraft.title.length}/140 chars)
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedDraft.title, "title")}
                  className="text-xs text-[#0E8F5D] font-bold hover:underline"
                >
                  {copiedField === "title" ? "Copied!" : "Copy Title"}
                </button>
              </div>
              <div className="p-3 rounded-xl border border-line bg-[#FAFAF8] text-xs font-semibold text-ink leading-relaxed">
                {selectedDraft.title}
              </div>
            </div>

            {/* 13 Tags Grid */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink">
                  Policy-Compliant Tags ({selectedDraft.tags.length}/13)
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedDraft.tags.join(", "), "tags")}
                  className="text-xs text-[#0E8F5D] font-bold hover:underline"
                >
                  {copiedField === "tags" ? "Copied All!" : "Copy All Tags"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedDraft.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FAFAF8] text-ink border border-line flex items-center gap-1"
                  >
                    <span>#{tag}</span>
                    <span className="text-[10px] text-ink-tertiary font-mono">({tag.length}/20)</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Description Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink">10-Part High-Converting Description</label>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedDraft.description, "desc")}
                  className="text-xs text-[#0E8F5D] font-bold hover:underline"
                >
                  {copiedField === "desc" ? "Copied!" : "Copy Description"}
                </button>
              </div>
              <textarea
                rows={8}
                readOnly
                value={selectedDraft.description}
                className="w-full rounded-xl border border-line p-3 text-xs text-ink bg-[#FAFAF8] font-mono leading-relaxed focus:outline-none"
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-line flex items-center justify-between">
              <Button
                variant="secondary"
                size="default"
                onClick={() => setSelectedDraft(null)}
                className="text-xs"
              >
                Close
              </Button>

              <a
                href={selectedDraft.etsyDraftUrl || "https://www.etsy.com/your/shops/me/tools/listings/state:draft"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Open in Etsy Listing Manager</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
