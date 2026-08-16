"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Tag,
  DollarSign,
  Layers,
  ExternalLink,
  RotateCcw,
  Save,
  Trash2,
  Copy,
  Check,
  Plus,
  Compass,
  ArrowRight,
  Info,
  Send,
  UploadCloud,
  History,
  Store,
  Clock,
  Radio,
} from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Input, Button, Badge, Heading, Text } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import {
  generateListingDraft,
  fetchListingDrafts,
  fetchListingDraft,
  updateListingDraft,
  deleteListingDraft,
  validateListingDraft,
} from "@/services/listing-generation-client";
import {
  approveListingDraft,
  pushDraftToEtsy,
  publishListingToEtsy,
  fetchDraftExecutionLogs,
  fetchConnectedEtsyChannels,
  type ConnectedChannel,
} from "@/services/etsy-execution-client";
import { fetchPlannerItemDetail } from "@/services/planner-client";
import { ListingDraftStatus } from "@prisma/client";
import type { CompleteListingSeoAudit } from "@/types/seo";
import type { OriginalityCheckResult } from "@/types/originality";

export function StudioClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plannerItemIdFromUrl = searchParams.get("plannerItemId");
  const draftIdFromUrl = searchParams.get("draftId");

  // Multi-Tenant Draft & Concept State
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(draftIdFromUrl);
  const [activeDraft, setActiveDraft] = useState<any | null>(null);
  const [plannerItem, setPlannerItem] = useState<any | null>(null);
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Loading & Action States
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [pushingToEtsy, setPushingToEtsy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form State for Active Draft
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [newMaterial, setNewMaterial] = useState("");
  const [price, setPrice] = useState<string>("25.00");
  const [quantity, setQuantity] = useState<string>("999");
  const [status, setStatus] = useState<ListingDraftStatus>(ListingDraftStatus.DRAFT);

  // Generation Modal State
  const [showGenModal, setShowGenModal] = useState(false);
  const [genTitle, setGenTitle] = useState("");
  const [genCategory, setGenCategory] = useState("");
  const [genPrice, setGenPrice] = useState("");
  const [genKeywords, setGenKeywords] = useState("");
  const [genMaterials, setGenMaterials] = useState("");
  const [genFacts, setGenFacts] = useState("");

  // Execution & Audit Modals
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Live SEO & Originality Results
  const [seoAudit, setSeoAudit] = useState<CompleteListingSeoAudit | null>(null);
  const [originality, setOriginality] = useState<OriginalityCheckResult | null>(null);

  // Load drafts, channels, and URL planner item context
  async function loadInitialData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch existing drafts
      const { drafts: fetchedDrafts } = await fetchListingDrafts();
      setDrafts(fetchedDrafts || []);

      // 2. Fetch connected Etsy channels
      const { channels: fetchedChannels } = await fetchConnectedEtsyChannels();
      setChannels(fetchedChannels || []);
      if (fetchedChannels && fetchedChannels.length > 0) {
        setSelectedChannelId(fetchedChannels[0].id);
      }

      // 3. If draftId in URL, load it
      if (draftIdFromUrl) {
        const { draft } = await fetchListingDraft(draftIdFromUrl);
        loadDraftIntoEditor(draft);
      } else if (fetchedDrafts && fetchedDrafts.length > 0) {
        const { draft } = await fetchListingDraft(fetchedDrafts[0].id);
        loadDraftIntoEditor(draft);
      }

      // 4. If plannerItemId in URL, preload prompt facts
      if (plannerItemIdFromUrl) {
        const { item } = await fetchPlannerItemDetail(plannerItemIdFromUrl);
        setPlannerItem(item);
        if (item) {
          setGenTitle(item.title || "");
          setGenCategory(item.targetCategory || "");
          setGenPrice(item.targetPrice ? item.targetPrice.toString() : "");
          setGenKeywords(item.targetKeywords ? item.targetKeywords.join(", ") : "");
          if (!draftIdFromUrl && (!fetchedDrafts || fetchedDrafts.length === 0)) {
            setShowGenModal(true);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load Listing Studio data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, [plannerItemIdFromUrl, draftIdFromUrl]);

  function loadDraftIntoEditor(draft: any) {
    setActiveDraft(draft);
    setSelectedDraftId(draft.id);
    setTitle(draft.title || "");
    setDescription(draft.description || "");
    setTags(Array.isArray(draft.tags) ? draft.tags : []);
    setMaterials(Array.isArray(draft.materials) ? draft.materials : []);
    setPrice(draft.price ? draft.price.toString() : "25.00");
    setQuantity(draft.quantity ? draft.quantity.toString() : "999");
    setStatus(draft.status || ListingDraftStatus.DRAFT);
    if (draft.sellerChannelId) {
      setSelectedChannelId(draft.sellerChannelId);
    }
    if (draft.plannerItem) {
      setPlannerItem(draft.plannerItem);
    }
    // Set SEO Audit from draft relation or default
    if (draft.seoAudits && draft.seoAudits.length > 0) {
      const a = draft.seoAudits[0];
      setSeoAudit({
        overallScore: a.overallScore,
        grade: a.overallScore >= 90 ? "A" : a.overallScore >= 80 ? "B" : a.overallScore >= 70 ? "C" : a.overallScore >= 60 ? "D" : "F",
        breakdown: {
          overallScore: a.overallScore,
          grade: a.overallScore >= 90 ? "A" : a.overallScore >= 80 ? "B" : a.overallScore >= 70 ? "C" : a.overallScore >= 60 ? "D" : "F",
          titleScore: a.titleScore,
          tagScore: a.tagScore,
          keywordSynergyScore: a.keywordSynergyScore || 0,
          descriptionScore: a.descriptionScore,
          taxonomyScore: a.taxonomyScore,
          attributeScore: a.attributeScore,
        },
        titleAnalysis: { characterCount: a.titleCharCount || draft.title?.length || 0, score: a.titleScore, isOptimalLength: (draft.title?.length || 0) >= 120 && (draft.title?.length || 0) <= 140, hasHighIntentStart: true, hasNaturalDelimiters: true, detectedKeywords: [], diagnostics: [] },
        tagAnalysis: { tagCount: a.tagCount || (draft.tags || []).length, score: a.tagScore, isComplete: (draft.tags || []).length === 13, allCompliantLength: true, longTailTagCount: 10, duplicateCount: 0, tags: [], diagnostics: [] },
        synergyAnalysis: { score: a.keywordSynergyScore || 0, exactMatchesCount: 3, matchingPhrases: [], missingFromTitle: [], diagnostics: [] },
        descriptionAnalysis: { score: a.descriptionScore, characterCount: draft.description?.length || 0, wordCount: (draft.description || "").split(/\s+/).filter(Boolean).length, hasFirst160Keyword: true, hasStructuredHeadings: true, diagnostics: [] },
        taxonomyAnalysis: { score: a.taxonomyScore, isDeepTaxonomy: true, attributeCount: 2, materialsCount: (draft.materials || []).length, materials: draft.materials || [], diagnostics: [] },
        title: draft.title,
        tags: draft.tags,
        description: draft.description,
        materials: draft.materials,
        diagnostics: (a.diagnostics as any) || [],
        recommendations: (a.recommendations as any) || [],
        auditedAt: a.createdAt,
      });
    } else {
      setSeoAudit(null);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!genTitle.trim()) return;
    setGenerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const keywordsArray = genKeywords.split(",").map((k) => k.trim()).filter(Boolean);
      const materialsArray = genMaterials.split(",").map((m) => m.trim()).filter(Boolean);

      const res = await generateListingDraft({
        plannerItemId: plannerItem?.id || plannerItemIdFromUrl || undefined,
        conceptTitle: genTitle.trim(),
        targetCategory: genCategory.trim() || undefined,
        targetPrice: genPrice ? parseFloat(genPrice) : undefined,
        targetKeywords: keywordsArray,
        materials: materialsArray,
        productFacts: genFacts.trim() || undefined,
      });

      setActiveDraft(res.draft);
      loadDraftIntoEditor(res.draft);
      setOriginality(res.originality);
      setSeoAudit(res.seoAudit);
      setShowGenModal(false);
      setSuccessMsg("AI Listing draft generated with real-time SEO audit and originality verification.");

      // Refresh drafts list
      const { drafts: updatedDrafts } = await fetchListingDrafts();
      setDrafts(updatedDrafts || []);
    } catch (err: any) {
      setError(err.message || "Failed to generate listing draft.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft(newStatus?: ListingDraftStatus) {
    if (!activeDraft) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const targetStatus = newStatus || (status === ListingDraftStatus.GENERATED ? ListingDraftStatus.EDITED_BY_USER : status);
      const res = await updateListingDraft(activeDraft.id, {
        title: title.trim().slice(0, 140),
        description: description.trim(),
        tags: tags.map((t) => t.slice(0, 20).toLowerCase()),
        materials,
        price: parseFloat(price) || 25.0,
        quantity: parseInt(quantity) || 999,
        status: targetStatus,
      });

      setStatus(targetStatus);
      setActiveDraft(res.draft);
      setSeoAudit(res.seoAudit);
      setSuccessMsg(newStatus === ListingDraftStatus.APPROVED ? "Listing draft approved for Etsy write-back." : "Listing draft changes saved.");

      // Refresh drafts list
      const { drafts: updatedDrafts } = await fetchListingDrafts();
      setDrafts(updatedDrafts || []);
    } catch (err: any) {
      setError(err.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!activeDraft) return;
    setApproving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await approveListingDraft(activeDraft.id);
      setStatus(ListingDraftStatus.APPROVED);
      setActiveDraft(res.draft);
      setSuccessMsg("Listing draft approved. You may now create the draft on your Etsy shop.");
    } catch (err: any) {
      setError(err.message || "Failed to approve draft.");
    } finally {
      setApproving(false);
    }
  }

  async function handlePushToEtsy() {
    if (!activeDraft) return;
    setPushingToEtsy(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await pushDraftToEtsy(activeDraft.id, selectedChannelId || undefined);
      setSuccessMsg(`Etsy draft listing created successfully! (Etsy Listing ID: ${res.result.etsyListingId})`);
      const { draft } = await fetchListingDraft(activeDraft.id);
      loadDraftIntoEditor(draft);
    } catch (err: any) {
      setError(err.message || "Failed to create Etsy draft listing.");
    } finally {
      setPushingToEtsy(false);
    }
  }

  async function handlePublish() {
    if (!activeDraft) return;
    setPublishing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await publishListingToEtsy(activeDraft.id, selectedChannelId || undefined);
      setShowPublishModal(false);
      setSuccessMsg(`Etsy listing published to live active state! (Etsy Listing ID: ${res.result.etsyListingId})`);
      const { draft } = await fetchListingDraft(activeDraft.id);
      loadDraftIntoEditor(draft);
    } catch (err: any) {
      setError(err.message || "Failed to publish Etsy listing live.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleOpenLogs() {
    if (!activeDraft) return;
    setLoadingLogs(true);
    setShowLogsModal(true);
    try {
      const res = await fetchDraftExecutionLogs(activeDraft.id);
      setExecutionLogs(res.logs || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleValidate() {
    if (!activeDraft) return;
    setValidating(true);
    try {
      const res = await validateListingDraft(activeDraft.id);
      setOriginality(res.originality);
      setSeoAudit(res.seoAudit);
      setActiveDraft(res.draft);
      setSuccessMsg("Draft re-validated against SEO and originality engines.");
    } catch (err: any) {
      alert("Validation failed: " + err.message);
    } finally {
      setValidating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this listing draft?")) return;
    try {
      await deleteListingDraft(id);
      const { drafts: updatedDrafts } = await fetchListingDrafts();
      setDrafts(updatedDrafts || []);
      if (updatedDrafts.length > 0) {
        const { draft } = await fetchListingDraft(updatedDrafts[0].id);
        loadDraftIntoEditor(draft);
      } else {
        setActiveDraft(null);
      }
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  }

  function handleCopy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function handleAddMaterial() {
    const trimmed = newMaterial.trim();
    if (!trimmed || materials.includes(trimmed)) return;
    setMaterials([...materials, trimmed]);
    setNewMaterial("");
  }

  function handleRemoveMaterial(mat: string) {
    setMaterials(materials.filter((m) => m !== mat));
  }

  function handleTagChange(index: number, val: string) {
    const newTags = [...tags];
    newTags[index] = val.slice(0, 20).toLowerCase();
    setTags(newTags);
  }

  const titleLength = title.length;
  const isTitleOptimal = titleLength >= 120 && titleLength <= 140;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Heading as="h1" size="h2" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#0E8F5D]" />
            <span>AI Listing Studio & Execution</span>
          </Heading>
          <Text size="body-sm" className="text-ink-secondary mt-1">
            Convert market research concepts into high-converting Etsy listing drafts with real-time SEO audits, originality protection, and safe Etsy API execution.
          </Text>
        </div>

        <div className="flex items-center gap-2">
          {/* Drafts Selector */}
          {drafts.length > 0 && (
            <select
              value={selectedDraftId || ""}
              onChange={async (e) => {
                if (e.target.value) {
                  const { draft } = await fetchListingDraft(e.target.value);
                  loadDraftIntoEditor(draft);
                }
              }}
              className="h-9 px-3 rounded-lg border border-line bg-white text-xs font-semibold text-ink focus:outline-hidden focus:border-[#0E8F5D]"
            >
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title?.slice(0, 35) || "Untitled Draft"} ({d.status})
                </option>
              ))}
            </select>
          )}

          <Button
            variant="primary"
            size="default"
            onClick={() => setShowGenModal(true)}
            className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-semibold text-xs"
          >
            <Sparkles className="h-4 w-4 mr-1" /> New AI Draft
          </Button>
        </div>
      </div>

      {/* Notifications & Error Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-[#FFF1F0] border border-[#FFA39E] text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-[#E7FAF1] border border-[#9BE7C4] text-[#0E8F5D] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-[#0E8F5D] hover:text-[#0C7A52] font-bold">×</button>
        </div>
      )}

      {/* Main Studio View */}
      {activeDraft ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Strategic Context & Real-Time Meters (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Status & Approval Gate Card */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink uppercase tracking-wide">Human Review Gate</span>
                <Badge
                  variant={
                    status === ListingDraftStatus.APPROVED
                      ? "success"
                      : status === ListingDraftStatus.PUSHED_TO_ETSY
                      ? "neutral"
                      : "warning"
                  }
                >
                  {status}
                </Badge>
              </div>

              <p className="text-xs text-ink-secondary leading-relaxed">
                {status === ListingDraftStatus.APPROVED ? (
                  <span className="text-[#0E8F5D] flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Approved by Human Seller. Ready for Etsy write-back.
                  </span>
                ) : status === ListingDraftStatus.PUSHED_TO_ETSY ? (
                  <span className="text-blue-700 flex items-center gap-1 font-medium">
                    <UploadCloud className="h-3.5 w-3.5 shrink-0" /> Pushed to Etsy Shop Manager (State: {activeDraft.state || "draft"}).
                  </span>
                ) : (
                  <span>
                    SellerSalt enforces explicit human review. You must inspect and approve this draft before writing to Etsy.
                  </span>
                )}
              </p>

              <div className="pt-2 border-t border-line-subtle flex items-center gap-2">
                {status !== ListingDraftStatus.APPROVED && status !== ListingDraftStatus.PUSHED_TO_ETSY && (
                  <Button
                    variant="primary"
                    size="compact"
                    loading={approving}
                    onClick={handleApprove}
                    className="w-full text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Listing Draft
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="compact"
                  loading={validating}
                  onClick={handleValidate}
                  className="w-full text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Re-Validate
                </Button>
              </div>
            </Card>

            {/* Etsy Execution & Shop Sync Card */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                  <Store className="h-4 w-4 text-[#0E8F5D]" />
                  <span>Etsy API Execution</span>
                </span>
                <button
                  type="button"
                  onClick={handleOpenLogs}
                  className="text-[11px] text-[#0E8F5D] hover:underline flex items-center gap-1"
                >
                  <History className="h-3 w-3" /> Audit Logs
                </button>
              </div>

              {/* Connected Channel Selector */}
              {channels.length > 0 ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-ink-tertiary uppercase">Target Etsy Shop</label>
                  <select
                    value={selectedChannelId || ""}
                    onChange={(e) => setSelectedChannelId(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-line bg-white text-xs text-ink focus:outline-hidden focus:border-[#0E8F5D]"
                  >
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label ? `${c.label} (Active)` : `Channel ${c.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-[#FFF8E6] border border-[#FFE58F] text-[11px] text-[#B37800]">
                  No Etsy Seller Channel connected. Connect your shop in{" "}
                  <Link href="/settings/channels" className="underline font-semibold">
                    Settings → Channels
                  </Link>.
                </div>
              )}

              {/* Direct Etsy Link if pushed */}
              {activeDraft.etsyListingId && (
                <div className="p-2.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">Etsy Listing ID:</span>
                    <strong className="font-mono text-ink">{activeDraft.etsyListingId}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">Current State:</span>
                    <Badge variant={activeDraft.state === "active" ? "success" : "neutral"}>
                      {activeDraft.state || "draft"}
                    </Badge>
                  </div>
                  <a
                    href={activeDraft.etsyDraftUrl || `https://www.etsy.com/your/shops/me/listing-editor/edit/${activeDraft.etsyListingId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0E8F5D] hover:underline"
                  >
                    <span>Open in Etsy Shop Manager</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-line-subtle space-y-2">
                {/* 1. Create Etsy Draft */}
                <Button
                  variant="primary"
                  size="default"
                  disabled={status !== ListingDraftStatus.APPROVED && status !== ListingDraftStatus.PUSHED_TO_ETSY}
                  loading={pushingToEtsy}
                  onClick={handlePushToEtsy}
                  className="w-full text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white disabled:opacity-50"
                >
                  <UploadCloud className="h-4 w-4 mr-1.5" />
                  {activeDraft.etsyListingId ? "Update Etsy Draft" : "Push to Etsy (Draft State)"}
                </Button>

                {/* 2. Explicit Publish Live (Only if already pushed to Etsy as draft) */}
                {activeDraft.etsyListingId && activeDraft.state !== "active" && (
                  <Button
                    variant="secondary"
                    size="default"
                    loading={publishing}
                    onClick={() => setShowPublishModal(true)}
                    className="w-full text-xs font-semibold border-[#0E8F5D] text-[#0E8F5D] hover:bg-[#E7FAF1]"
                  >
                    <Send className="h-4 w-4 mr-1.5" /> Publish Live to Etsy
                  </Button>
                )}
              </div>
            </Card>

            {/* SEO Diagnostics Score Card */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#0E8F5D]" />
                  <span>SEO Diagnostic Audit</span>
                </span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                  (seoAudit?.overallScore || activeDraft.seoScore || 0) >= 80
                    ? "bg-[#E7FAF1] text-[#0E8F5D]"
                    : "bg-[#FFF8E6] text-[#B37800]"
                }`}>
                  {seoAudit?.overallScore ?? activeDraft.seoScore ?? "—"}/100
                </span>
              </div>

              {seoAudit?.breakdown && (
                <div className="space-y-2 pt-2 border-t border-line-subtle text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">Title Optimization (30 max)</span>
                    <strong className="font-mono text-ink">{seoAudit.breakdown.titleScore}/30</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">13-Tag Utilization (35 max)</span>
                    <strong className="font-mono text-ink">{seoAudit.breakdown.tagScore}/35</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">Keyword Synergy (15 max)</span>
                    <strong className="font-mono text-ink">{seoAudit.breakdown.keywordSynergyScore}/15</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-secondary">Description (10 max)</span>
                    <strong className="font-mono text-ink">{seoAudit.breakdown.descriptionScore}/10</strong>
                  </div>
                </div>
              )}
            </Card>

            {/* Originality & Anti-Duplication Protection Card */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span>Originality Gate</span>
                </span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                  (originality?.originalityScore ?? activeDraft.originalityScore ?? 100) >= 85
                    ? "bg-[#E7FAF1] text-[#0E8F5D]"
                    : "bg-[#FFF1F0] text-red-600"
                }`}>
                  {originality?.originalityScore ?? activeDraft.originalityScore ?? 100}% Original
                </span>
              </div>

              <div className="text-[11px] text-ink-secondary space-y-1">
                <div className="flex items-center justify-between">
                  <span>Threshold Status:</span>
                  <strong className="text-ink">
                    {originality?.status || (activeDraft.originalityScore >= 85 ? "PASSED" : "FLAGGED")}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Competitor Overlap:</span>
                  <strong className="font-mono text-ink">
                    {originality ? `${(originality.jaccardSimilarity * 100).toFixed(1)}%` : "< 15%"}
                  </strong>
                </div>
              </div>
            </Card>

            {/* Planner Concept Research Context */}
            {plannerItem && (
              <Card padding="md" className="border-line bg-white shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1">
                    <Compass className="h-3.5 w-3.5 text-blue-600" />
                    <span>Planner Context</span>
                  </span>
                  <Badge variant="neutral">
                    {plannerItem.itemType}
                  </Badge>
                </div>
                <div className="text-xs font-semibold text-ink line-clamp-1">{plannerItem.title}</div>
                {plannerItem.targetCategory && (
                  <div className="text-xs text-ink-secondary">
                    Category: <strong className="text-ink">{plannerItem.targetCategory}</strong>
                  </div>
                )}
                {plannerItem.targetPrice && (
                  <div className="text-xs text-ink-secondary">
                    Target Price: <strong className="font-mono text-ink">${plannerItem.targetPrice.toFixed(2)}</strong>
                  </div>
                )}
                {plannerItem.targetKeywords && plannerItem.targetKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {plannerItem.targetKeywords.map((k: string) => (
                      <span key={k} className="px-1.5 py-0.2 rounded text-[9px] bg-white text-ink border border-line">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* AI Model Generation Metadata */}
            {activeDraft.aiModelUsed && (
              <div className="text-[10px] text-ink-tertiary p-2 rounded-lg bg-[#FAFAF8] border border-line space-y-1">
                <div>AI Model: <strong>{activeDraft.aiModelUsed}</strong></div>
                <div>Generated: {new Date(activeDraft.createdAt).toLocaleString()}</div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Listing Editor (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Title Section */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                  <span>Etsy Listing Title</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold ${
                    isTitleOptimal ? "text-[#0E8F5D]" : titleLength > 140 ? "text-red-600" : "text-[#B37800]"
                  }`}>
                    {titleLength} / 140 chars
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(title, "title")}
                    className="p-1 rounded text-ink-tertiary hover:text-ink"
                    title="Copy title"
                  >
                    {copiedField === "title" ? <Check className="h-3.5 w-3.5 text-[#0E8F5D]" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Front-load high intent search terms | Include key product attributes | Max 140 chars"
                className={`w-full rounded-lg border p-2.5 text-xs font-medium text-ink focus:ring-1 ${
                  titleLength > 140
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-line focus:border-[#0E8F5D] focus:ring-[#0E8F5D]"
                }`}
              />

              <div className="flex items-center justify-between text-[11px] text-ink-tertiary">
                <span>Etsy best practice: 120–140 chars with high-intent keywords in first 40 chars.</span>
              </div>
            </Card>

            {/* 13 Tag Slots Section */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-ink uppercase tracking-wide">
                    13 Formatted Etsy Tags
                  </label>
                  <div className="text-[11px] text-ink-tertiary">
                    Exactly 13 tags, each ≤ 20 characters, lowercase, no punctuation.
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-ink">
                  {tags.length} / 13 slots used
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {Array.from({ length: 13 }).map((_, i) => {
                  const tagVal = tags[i] || "";
                  const isOver = tagVal.length > 20;
                  return (
                    <div
                      key={i}
                      className={`relative flex items-center rounded-lg border p-1.5 transition-all ${
                        isOver
                          ? "border-red-400 bg-red-50/20"
                          : tagVal
                          ? "border-[#0E8F5D]/40 bg-[#FAFAF8]"
                          : "border-line bg-white"
                      }`}
                    >
                      <span className="text-[10px] font-mono font-bold text-ink-tertiary w-5 text-center shrink-0">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={tagVal}
                        onChange={(e) => handleTagChange(i, e.target.value)}
                        placeholder="Long-tail tag phrase"
                        className="w-full bg-transparent text-xs text-ink focus:outline-hidden font-medium px-1"
                      />
                      <span className={`text-[10px] font-mono shrink-0 px-1 ${
                        isOver ? "text-red-600 font-bold" : "text-ink-tertiary"
                      }`}>
                        {tagVal.length}/20
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Description Section */}
            <Card padding="md" className="border-line bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink uppercase tracking-wide">
                  Structured Listing Description
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy(description, "description")}
                  className="p-1 rounded text-ink-tertiary hover:text-ink text-xs flex items-center gap-1"
                >
                  {copiedField === "description" ? (
                    <Check className="h-3.5 w-3.5 text-[#0E8F5D]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>Copy</span>
                </button>
              </div>

              <textarea
                rows={10}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Hook (first 160 chars)&#10;&#10;✨ KEY FEATURES:&#10;• Bullet 1&#10;• Bullet 2&#10;&#10;📦 WHAT'S INCLUDED:&#10;• Item details&#10;&#10;🧼 CARE INSTRUCTIONS:&#10;• Maintenance info"
                className="w-full rounded-lg border border-line p-3 text-xs text-ink font-mono focus:border-[#0E8F5D] focus:ring-1 focus:ring-[#0E8F5D]"
              />
            </Card>

            {/* Materials & Pricing Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Materials */}
              <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
                <label className="text-xs font-bold text-ink uppercase tracking-wide">Materials</label>
                <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                  {materials.map((mat) => (
                    <span
                      key={mat}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAFAF8] border border-line text-xs text-ink"
                    >
                      {mat}
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(mat)}
                        className="text-ink-tertiary hover:text-ink font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddMaterial();
                      }
                    }}
                    placeholder="Add material (e.g. Leather)..."
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={handleAddMaterial}
                    className="h-8 text-xs"
                  >
                    Add
                  </Button>
                </div>
              </Card>

              {/* Price & Quantity */}
              <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
                <label className="text-xs font-bold text-ink uppercase tracking-wide">Pricing & Stock</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-ink-tertiary uppercase">Price ($)</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-8 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-ink-tertiary uppercase">Stock Quantity</span>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-line flex items-center justify-between gap-3">
              <Button
                variant="destructive"
                size="compact"
                onClick={() => handleDelete(activeDraft.id)}
                className="text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Draft
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="default"
                  loading={saving}
                  onClick={() => handleSaveDraft()}
                  className="text-xs"
                >
                  <Save className="h-4 w-4 mr-1" /> Save Changes
                </Button>

                {status !== ListingDraftStatus.APPROVED && (
                  <Button
                    variant="primary"
                    size="default"
                    loading={saving}
                    onClick={() => handleSaveDraft(ListingDraftStatus.APPROVED)}
                    className="text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve Draft
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Card padding="lg" className="border-line bg-white shadow-xs text-center py-16 space-y-4">
          <Sparkles className="h-12 w-12 text-[#0E8F5D] mx-auto opacity-40" />
          <div className="space-y-1 max-w-md mx-auto">
            <Heading as="h3" size="h3">No Listing Draft Selected</Heading>
            <Text size="body-sm" className="text-ink-tertiary">
              Select an existing draft from the dropdown above or generate a new high-converting listing payload with AI.
            </Text>
          </div>
          <Button
            variant="primary"
            size="default"
            onClick={() => setShowGenModal(true)}
            className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-semibold text-xs"
          >
            <Sparkles className="h-4 w-4 mr-1" /> Generate New Listing Draft
          </Button>
        </Card>
      )}

      {/* Explicit Publish Live Modal */}
      {showPublishModal && activeDraft && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-line p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <Heading as="h3" size="h4" className="flex items-center gap-2 text-ink">
                <Send className="h-5 w-5 text-[#0E8F5D]" />
                <span>Confirm Etsy Live Publication</span>
              </Heading>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink"
              >
                ×
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFF8E6] border border-[#FFE58F] text-xs text-[#B37800] space-y-1">
              <strong>⚠️ Explicit Human Publication Gate</strong>
              <p>
                This action will change the listing state from <code>draft</code> to <code>active</code> in your connected Etsy shop. It will become immediately visible to Etsy shoppers.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-line space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-ink-secondary">Title:</span>
                <span className="font-semibold text-ink text-right line-clamp-2">{title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Price & Stock:</span>
                <strong className="font-mono text-ink">${price} ({quantity} units)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Tags ({tags.length}):</span>
                <span className="text-ink font-mono text-[11px] truncate max-w-[240px]">{tags.join(", ")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Etsy Listing ID:</span>
                <strong className="font-mono text-ink">{activeDraft.etsyListingId}</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPublishModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={publishing}
                onClick={handlePublish}
                className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-semibold text-xs"
              >
                <Send className="h-4 w-4 mr-1" /> Confirm & Publish Live
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Audit Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-line p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <Heading as="h3" size="h4" className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#0E8F5D]" />
                <span>Etsy Execution Audit Logs</span>
              </Heading>
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingLogs ? (
                <div className="text-center py-10 text-xs text-ink-tertiary">Loading audit history...</div>
              ) : executionLogs.length === 0 ? (
                <div className="text-center py-10 text-xs text-ink-tertiary">No Etsy execution logs found for this draft yet.</div>
              ) : (
                <div className="space-y-2">
                  {executionLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-xl border border-line bg-[#FAFAF8] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              log.status === "SUCCESS"
                                ? "success"
                                : log.status === "FAILED"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {log.status}
                          </Badge>
                          <span className="font-mono font-bold text-ink">{log.operationType}</span>
                        </div>
                        <span className="text-[10px] text-ink-tertiary">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-secondary pt-1">
                        <div>Idempotency Key: <code className="text-[10px] bg-white px-1 py-0.5 rounded border border-line">{log.idempotencyKey}</code></div>
                        <div>HTTP Status: <strong className="font-mono text-ink">{log.responseStatusCode || "—"}</strong></div>
                      </div>

                      {log.etsyResourceId && (
                        <div className="text-[11px] text-ink-secondary">
                          Etsy Resource ID: <strong className="font-mono text-ink">{log.etsyResourceId}</strong>
                        </div>
                      )}

                      {log.errorMessage && (
                        <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-200">
                          Error: {log.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-line">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowLogsModal(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New AI Draft Generator Modal */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-line p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <Heading as="h3" size="h4" className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#0E8F5D]" />
                <span>AI Listing Copywriter</span>
              </Heading>
              <button
                type="button"
                onClick={() => setShowGenModal(false)}
                className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-muted"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Product Concept / Title *</label>
                <Input
                  value={genTitle}
                  onChange={(e) => setGenTitle(e.target.value)}
                  placeholder="e.g. Handmade Personalized Leather Passport Wallet"
                  className="h-10 text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink">Target Category</label>
                  <Input
                    value={genCategory}
                    onChange={(e) => setGenCategory(e.target.value)}
                    placeholder="e.g. Travel Wallets & Accessories"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink">Target Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={genPrice}
                    onChange={(e) => setGenPrice(e.target.value)}
                    placeholder="28.00"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Target SEO Keywords (Comma-separated)</label>
                <Input
                  value={genKeywords}
                  onChange={(e) => setGenKeywords(e.target.value)}
                  placeholder="leather passport, travel wallet, custom gift..."
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Confirmed Materials</label>
                <Input
                  value={genMaterials}
                  onChange={(e) => setGenMaterials(e.target.value)}
                  placeholder="Full grain leather, brass snaps, waxed thread"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Key Product Facts & Unique Selling Points</label>
                <textarea
                  rows={3}
                  value={genFacts}
                  onChange={(e) => setGenFacts(e.target.value)}
                  placeholder="Hand-stitched, fits standard passport + 4 credit cards, free custom engraving..."
                  className="w-full rounded-lg border border-line p-2.5 text-xs text-ink focus:border-[#0E8F5D] focus:ring-1 focus:ring-[#0E8F5D]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowGenModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={generating}
                  className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-semibold text-xs"
                >
                  <Sparkles className="h-4 w-4 mr-1" /> Generate Original Payload
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
