"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Layers,
  Plus,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Archive,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Tag,
  ShieldCheck,
  DollarSign,
  Calendar,
  AlertCircle,
  FileText,
  LayoutGrid,
  List as ListIcon,
  X,
  Store,
  Compass,
} from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Input, Button, Badge, Heading, Text } from "@/components/ui";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";
import {
  fetchPlannerItems,
  fetchPlannerItemDetail,
  createPlannerItem,
  updatePlannerItem,
  deletePlannerItem,
} from "@/services/planner-client";
import { PlannerItemType, PlannerItemStatus } from "@prisma/client";
import type { PlannerItem } from "@/types/planner";

type ViewMode = "KANBAN" | "LIST";

const STATUS_COLUMNS: Array<{ status: PlannerItemStatus; label: string; description: string }> = [
  { status: PlannerItemStatus.BACKLOG, label: "Backlog", description: "Discovered opportunities" },
  { status: PlannerItemStatus.IN_PROGRESS, label: "In Progress", description: "Active planning & strategy" },
  { status: PlannerItemStatus.READY_FOR_DRAFT, label: "Ready for Draft", description: "Strategy validated" },
  { status: PlannerItemStatus.DRAFT_CREATED, label: "Draft Created", description: "Copy & tags drafted" },
  { status: PlannerItemStatus.PUBLISHED_TO_ETSY, label: "Published", description: "Live on marketplace" },
  { status: PlannerItemStatus.COMPLETED, label: "Completed", description: "Finished milestones" },
];

const TYPE_CONFIG: Record<
  PlannerItemType,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PRODUCT_RESEARCH: { label: "Product", color: "text-[#0E8F5D] bg-[#E7FAF1] border-[#16C784]/30", icon: Compass },
  SHOP_RESEARCH: { label: "Shop", color: "text-blue-800 bg-blue-50 border-blue-200", icon: Store },
  KEYWORD_RESEARCH: { label: "Keyword", color: "text-purple-800 bg-purple-50 border-purple-200", icon: Tag },
  CONTENT_IDEA: { label: "Content", color: "text-pink-800 bg-pink-50 border-pink-200", icon: Sparkles },
  LISTING_CONCEPT: { label: "Listing", color: "text-amber-800 bg-amber-50 border-amber-300", icon: FileText },
  SEO_TASK: { label: "SEO Task", color: "text-[#B37800] bg-[#FFF8E6] border-[#FFB020]/30", icon: ShieldCheck },
  EXECUTION_TASK: { label: "Execution", color: "text-ink-secondary bg-surface-muted border-line", icon: CheckCircle2 },
};

export function PlannerClient() {
  const [items, setItems] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Views
  const [viewMode, setViewMode] = useState<ViewMode>("KANBAN");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [includeArchived, setIncludeArchived] = useState(false);

  // Drawer / Inspection
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [detailWorkspaceTab, setDetailWorkspaceTab] = useState<"OPPORTUNITY" | "KEYWORDS" | "CONTENT_ASSISTANT" | "MARKETPLACE_DRAFT">("OPPORTUNITY");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [draftCreationResult, setDraftCreationResult] = useState<any | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);

  // Quick Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState<PlannerItemType>(PlannerItemType.PRODUCT_RESEARCH);
  const [createNotes, setCreateNotes] = useState("");
  const [createPrice, setCreatePrice] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPlannerItems({
        type: selectedType,
        status: selectedStatus,
        search: searchQuery,
        includeArchived,
      });
      setItems(res.items || []);
      setStatusCounts(res.statusCounts || {});
    } catch (err: any) {
      setError(err.message || "Failed to load Planner items.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [selectedType, selectedStatus, includeArchived]);

  async function handleOpenDetail(id: string) {
    setSelectedItemId(id);
    setDetailLoading(true);
    try {
      const res = await fetchPlannerItemDetail(id);
      setDetailItem(res.item);
    } catch (err: any) {
      alert("Failed to load item details: " + err.message);
      setSelectedItemId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleQuickStatusChange(id: string, newStatus: PlannerItemStatus, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    // Optimistic UI update
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: newStatus } : it))
    );
    try {
      await updatePlannerItem(id, { status: newStatus });
      // Refresh status counts
      loadItems();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
      loadItems();
    }
  }

  async function handleGenerateContent() {
    if (!detailItem) return;
    setAssistantLoading(true);
    try {
      const res = await fetch(`/api/planner/items/${detailItem.id}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryKeyword: detailItem.targetKeywords?.[0] || detailItem.title,
          secondaryKeywords: detailItem.targetKeywords?.slice(1),
          category: detailItem.targetCategory,
          targetPrice: detailItem.targetPrice,
        }),
      });
      const data = await res.json();
      if (data.success && data.content) {
        setGeneratedContent(data.content);
        setDetailWorkspaceTab("CONTENT_ASSISTANT");
      } else {
        alert(data.error || "Failed to generate listing content.");
      }
    } catch (err: any) {
      alert("Error generating content: " + err.message);
    } finally {
      setAssistantLoading(false);
    }
  }

  async function handleCreateDraft() {
    if (!detailItem) return;
    setCreatingDraft(true);
    try {
      const res = await fetch(`/api/planner/items/${detailItem.id}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createDraft: true,
          primaryKeyword: detailItem.targetKeywords?.[0] || detailItem.title,
          secondaryKeywords: detailItem.targetKeywords?.slice(1),
          category: detailItem.targetCategory,
          targetPrice: detailItem.targetPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraftCreationResult(data.draftResult);
        setDetailItem({ ...detailItem, status: PlannerItemStatus.DRAFT_CREATED });
        loadItems();
      } else {
        alert(data.error || "Failed to create draft.");
      }
    } catch (err: any) {
      alert("Error creating draft: " + err.message);
    } finally {
      setCreatingDraft(false);
    }
  }

  function handleCopy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleSaveDetail() {
    if (!detailItem) return;
    setSavingDetail(true);
    try {
      await updatePlannerItem(detailItem.id, {
        title: detailItem.title,
        status: detailItem.status,
        type: detailItem.type,
        notes: detailItem.notes,
        targetCategory: detailItem.targetCategory,
        targetPrice: detailItem.targetPrice ? parseFloat(detailItem.targetPrice) : undefined,
        estimatedCogs: detailItem.estimatedCogs ? parseFloat(detailItem.estimatedCogs) : undefined,
        targetKeywords: detailItem.targetKeywords,
      });
      await loadItems();
      setSelectedItemId(null);
      setDetailItem(null);
    } catch (err: any) {
      alert("Failed to save changes: " + err.message);
    } finally {
      setSavingDetail(false);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Are you sure you want to delete this Planner item?")) return;
    try {
      await deletePlannerItem(id);
      setSelectedItemId(null);
      setDetailItem(null);
      await loadItems();
    } catch (err: any) {
      alert("Failed to delete item: " + err.message);
    }
  }

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!createTitle.trim()) return;
    setCreating(true);
    try {
      await createPlannerItem({
        organizationId: "active",
        title: createTitle.trim(),
        type: createType,
        notes: createNotes.trim() || undefined,
        targetPrice: createPrice ? parseFloat(createPrice) : undefined,
        sourceType: "MANUAL",
      });
      setShowCreateModal(false);
      setCreateTitle("");
      setCreateNotes("");
      setCreatePrice("");
      await loadItems();
    } catch (err: any) {
      alert("Failed to create Planner item: " + err.message);
    } finally {
      setCreating(false);
    }
  }

  // Group items by status for Kanban
  const kanbanColumns = STATUS_COLUMNS.map((col) => ({
    ...col,
    items: items.filter((it) => it.status === col.status),
  }));

  const totalActive = (statusCounts[PlannerItemStatus.BACKLOG] || 0) +
    (statusCounts[PlannerItemStatus.IN_PROGRESS] || 0) +
    (statusCounts[PlannerItemStatus.READY_FOR_DRAFT] || 0) +
    (statusCounts[PlannerItemStatus.DRAFT_CREATED] || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Workspace Planner"
        description="The strategic bridge from market research to Etsy execution. Manage discovered product concepts, keyword clusters, and SEO roadmaps across workflow stages."
      />

      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card padding="md" className="border-line bg-white shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-ink-tertiary uppercase">Active Plans</div>
          <div className="text-2xl font-extrabold text-[#0E8F5D] font-mono">{totalActive}</div>
          <div className="text-[11px] text-ink-tertiary">In planning & drafting pipeline</div>
        </Card>

        <Card padding="md" className="border-line bg-white shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-ink-tertiary uppercase">Backlog Ideas</div>
          <div className="text-2xl font-extrabold text-ink font-mono">
            {statusCounts[PlannerItemStatus.BACKLOG] || 0}
          </div>
          <div className="text-[11px] text-ink-tertiary">Discovered from research engines</div>
        </Card>

        <Card padding="md" className="border-line bg-white shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-ink-tertiary uppercase">Ready for Draft</div>
          <div className="text-2xl font-extrabold text-[#B37800] font-mono">
            {statusCounts[PlannerItemStatus.READY_FOR_DRAFT] || 0}
          </div>
          <div className="text-[11px] text-ink-tertiary">Validated for AI copy generation</div>
        </Card>

        <Card padding="md" className="border-line bg-white shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-ink-tertiary uppercase">Published / Done</div>
          <div className="text-2xl font-extrabold text-ink-secondary font-mono">
            {(statusCounts[PlannerItemStatus.PUBLISHED_TO_ETSY] || 0) + (statusCounts[PlannerItemStatus.COMPLETED] || 0)}
          </div>
          <div className="text-[11px] text-ink-tertiary">Live products & completed tasks</div>
        </Card>
      </div>

      {/* Control Bar */}
      <Card padding="md" className="border-line bg-white shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadItems()}
              placeholder="Search planner by keyword, title, or shop..."
              className="pl-9 h-10 text-xs font-medium"
            />
            <Search className="h-4 w-4 text-ink-tertiary absolute left-3 top-3 pointer-events-none" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-line rounded-lg p-1 bg-[#FAFAF8]">
              <button
                type="button"
                onClick={() => setViewMode("KANBAN")}
                className={`p-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === "KANBAN" ? "bg-white text-ink shadow-2xs" : "text-ink-tertiary hover:text-ink"
                }`}
                title="Kanban Board"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className={`p-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === "LIST" ? "bg-white text-ink shadow-2xs" : "text-ink-tertiary hover:text-ink"
                }`}
                title="Table View"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>

            <Button
              variant="primary"
              size="default"
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-4 text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
            >
              <Plus className="h-4 w-4 mr-1" /> New Item
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line-subtle text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#FAFAF8] border border-line rounded-lg px-2.5 py-1 text-[11px] font-medium text-ink"
            >
              <option value="ALL">All Item Types</option>
              <option value={PlannerItemType.PRODUCT_RESEARCH}>Product Research</option>
              <option value={PlannerItemType.SHOP_RESEARCH}>Shop Research</option>
              <option value={PlannerItemType.KEYWORD_RESEARCH}>Keyword Research</option>
              <option value={PlannerItemType.CONTENT_IDEA}>Content Idea</option>
              <option value={PlannerItemType.LISTING_CONCEPT}>Listing Concept</option>
              <option value={PlannerItemType.SEO_TASK}>SEO Task</option>
              <option value={PlannerItemType.EXECUTION_TASK}>Execution Task</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#FAFAF8] border border-line rounded-lg px-2.5 py-1 text-[11px] font-medium text-ink"
            >
              <option value="ALL">All Statuses</option>
              <option value={PlannerItemStatus.BACKLOG}>Backlog</option>
              <option value={PlannerItemStatus.IN_PROGRESS}>In Progress</option>
              <option value={PlannerItemStatus.READY_FOR_DRAFT}>Ready for Draft</option>
              <option value={PlannerItemStatus.DRAFT_CREATED}>Draft Created</option>
              <option value={PlannerItemStatus.PUBLISHED_TO_ETSY}>Published to Etsy</option>
              <option value={PlannerItemStatus.COMPLETED}>Completed</option>
              <option value={PlannerItemStatus.ARCHIVED}>Archived</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-ink select-none ml-auto">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-line text-[#0E8F5D] focus:ring-[#0E8F5D]"
            />
            <span>Include Archived Items</span>
          </label>
        </div>
      </Card>

      {/* Empty State when no planner items exist at all */}
      {items.length === 0 && !searchQuery.trim() && selectedStatus === "ALL" && !loading ? (
        <Card padding="lg" className="border-line bg-white shadow-xs text-center py-16 px-6 max-w-2xl mx-auto space-y-5">
          <div className="h-14 w-14 rounded-2xl bg-[#E7FAF1] text-[#0E8F5D] flex items-center justify-center mx-auto shadow-2xs">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-ink tracking-tight">Your Workspace Planner is empty</h3>
            <p className="text-xs sm:text-sm text-ink-secondary max-w-lg mx-auto leading-relaxed">
              Planner is your strategic pipeline from market discovery to live Etsy execution. Save breakout product concepts, target price models, and keyword clusters here before creating listings.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="compact"
              onClick={() => setShowCreateModal(true)}
              className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-xs font-semibold text-white shadow-xs"
            >
              + Create First Plan Item
            </Button>
            <Link href="/radar">
              <Button variant="secondary" size="compact" className="text-xs font-medium">
                Hunt Products on Radar
              </Button>
            </Link>
            <Link href="/keyword-research">
              <Button variant="secondary" size="compact" className="text-xs font-medium">
                Research Keywords
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Kanban Board View */}
          {viewMode === "KANBAN" && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 min-h-[600px] items-start">
          {kanbanColumns.map((col) => (
            <div
              key={col.status}
              className="bg-[#FAFAF8] rounded-2xl border border-line p-2.5 flex flex-col gap-2 min-h-[400px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-line px-1">
                <div>
                  <div className="font-bold text-xs text-ink flex items-center gap-1.5">
                    <span>{col.label}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-white text-ink border border-line">
                      {col.items.length}
                    </span>
                  </div>
                  <div className="text-[9px] text-ink-tertiary line-clamp-1">{col.description}</div>
                </div>
              </div>

              {/* Items in Column */}
              <div className="space-y-2 flex-1">
                {col.items.map((item) => {
                  const typeCfg = TYPE_CONFIG[item.type as PlannerItemType] || TYPE_CONFIG.PRODUCT_RESEARCH;
                  const TypeIcon = typeCfg.icon;
                  const snap = item.researchSnapshot as Record<string, any> | null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDetail(item.id)}
                      className="p-3 rounded-xl bg-white border border-line shadow-2xs hover:border-[#0E8F5D]/40 hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border inline-flex items-center gap-1 ${typeCfg.color}`}>
                          <TypeIcon className="h-2.5 w-2.5" />
                          <span>{typeCfg.label}</span>
                        </span>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {col.status !== PlannerItemStatus.BACKLOG && (
                            <button
                              type="button"
                              onClick={(e) => {
                                const idx = STATUS_COLUMNS.findIndex((c) => c.status === col.status);
                                if (idx > 0) handleQuickStatusChange(item.id, STATUS_COLUMNS[idx - 1].status, e);
                              }}
                              className="p-1 rounded text-ink-tertiary hover:text-ink hover:bg-surface-muted"
                              title="Move backward"
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </button>
                          )}
                          {col.status !== PlannerItemStatus.COMPLETED && (
                            <button
                              type="button"
                              onClick={(e) => {
                                const idx = STATUS_COLUMNS.findIndex((c) => c.status === col.status);
                                if (idx < STATUS_COLUMNS.length - 1) {
                                  handleQuickStatusChange(item.id, STATUS_COLUMNS[idx + 1].status, e);
                                }
                              }}
                              className="p-1 rounded text-ink-tertiary hover:text-ink hover:bg-surface-muted"
                              title="Move forward"
                            >
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="font-bold text-xs text-ink line-clamp-2 leading-tight">
                        {item.title}
                      </div>

                      {/* Snapshots & Signals */}
                      {snap && (
                        <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-line-subtle text-[10px]">
                          {snap.opportunityScore !== undefined && (
                            <div className="text-ink-secondary">
                              Opp: <strong className="text-[#0E8F5D] font-mono">{snap.opportunityScore}</strong>
                            </div>
                          )}
                          {snap.overallScore !== undefined && (
                            <div className="text-ink-secondary">
                              SEO: <strong className="text-[#FFB020] font-mono">{snap.overallScore}/100</strong>
                            </div>
                          )}
                          {snap.estDailySales !== undefined && (
                            <div className="text-ink-secondary">
                              Sales: <strong className="text-ink font-mono">{snap.estDailySales.toFixed(1)}/d</strong>
                            </div>
                          )}
                          {item.targetPrice && (
                            <div className="text-ink-secondary">
                              Price: <strong className="text-ink font-mono">${item.targetPrice.toFixed(2)}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Target Keywords / Badges */}
                      {item.targetKeywords && item.targetKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.targetKeywords.slice(0, 2).map((k: string) => (
                            <span key={k} className="px-1.5 py-0.2 rounded text-[9px] bg-[#FAFAF8] text-ink-secondary border border-line">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {col.items.length === 0 && (
                  <div className="py-8 text-center text-[11px] text-ink-tertiary italic">
                    No items
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table / List View */}
      {viewMode === "LIST" && (
        <Card padding="sm" className="border-line bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] text-[10px] font-bold text-ink-tertiary uppercase border-b border-line">
                <tr>
                  <th className="py-3 px-4">Planner Item</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Target Price</th>
                  <th className="py-3 px-3">Target Keywords</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {items.map((item) => {
                  const typeCfg = TYPE_CONFIG[item.type as PlannerItemType] || TYPE_CONFIG.PRODUCT_RESEARCH;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDetail(item.id)}
                      className="hover:bg-[#FAFAF8] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-xs text-ink">{item.title}</div>
                        {item.sourceListingTitle && (
                          <div className="text-[10px] text-ink-tertiary truncate max-w-sm">
                            Source: {item.sourceListingTitle}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-muted text-ink border border-line">
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-ink">
                        {item.targetPrice ? `$${item.targetPrice.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(item.targetKeywords || []).slice(0, 3).map((k: string) => (
                            <span key={k} className="px-1.5 py-0.2 rounded text-[10px] bg-surface-muted text-ink border border-line">
                              {k}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-ink-tertiary">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(item.id);
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#0E8F5D] hover:bg-[#E7FAF1] transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-ink-tertiary">
                      No planner items found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )}

      {/* Planner Item Detail Drawer / Modal */}
      {selectedItemId && detailItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-end">
          <div className="w-full max-w-2xl h-full bg-white shadow-2xl border-l border-line p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-line gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${TYPE_CONFIG[detailItem.type as PlannerItemType]?.color}`}>
                      {TYPE_CONFIG[detailItem.type as PlannerItemType]?.label}
                    </span>
                    <DataProvenanceBadge type="SELLERSALT_SCORE" />
                  </div>
                  <Input
                    value={detailItem.title}
                    onChange={(e) => setDetailItem({ ...detailItem, title: e.target.value })}
                    className="font-bold text-base h-10 mt-1"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemId(null);
                    setDetailItem(null);
                  }}
                  className="p-2 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Status & Type Bar */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-ink-tertiary uppercase">Workflow Status</label>
                  <select
                    value={detailItem.status}
                    onChange={(e) => setDetailItem({ ...detailItem, status: e.target.value as PlannerItemStatus })}
                    className="w-full bg-[#FAFAF8] border border-line rounded-lg px-3 py-2 text-xs font-semibold text-ink"
                  >
                    {STATUS_COLUMNS.map((col) => (
                      <option key={col.status} value={col.status}>
                        {col.label}
                      </option>
                    ))}
                    <option value={PlannerItemStatus.ARCHIVED}>Archived</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-ink-tertiary uppercase">Planner Item Type</label>
                  <select
                    value={detailItem.type}
                    onChange={(e) => setDetailItem({ ...detailItem, type: e.target.value as PlannerItemType })}
                    className="w-full bg-[#FAFAF8] border border-line rounded-lg px-3 py-2 text-xs font-semibold text-ink"
                  >
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-line pb-2">
                <button
                  type="button"
                  onClick={() => setDetailWorkspaceTab("OPPORTUNITY")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    detailWorkspaceTab === "OPPORTUNITY"
                      ? "bg-ink text-white shadow-2xs"
                      : "text-ink-secondary hover:bg-surface-muted"
                  }`}
                >
                  📊 Opportunity &amp; Economics
                </button>
                <button
                  type="button"
                  onClick={() => setDetailWorkspaceTab("KEYWORDS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    detailWorkspaceTab === "KEYWORDS"
                      ? "bg-ink text-white shadow-2xs"
                      : "text-ink-secondary hover:bg-surface-muted"
                  }`}
                >
                  🏷️ Keywords ({detailItem.targetKeywords?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDetailWorkspaceTab("CONTENT_ASSISTANT")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    detailWorkspaceTab === "CONTENT_ASSISTANT"
                      ? "bg-[#0E8F5D] text-white shadow-2xs"
                      : "text-ink-secondary hover:bg-surface-muted"
                  }`}
                >
                  ✍️ Listing Assistant
                </button>
                <button
                  type="button"
                  onClick={() => setDetailWorkspaceTab("MARKETPLACE_DRAFT")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    detailWorkspaceTab === "MARKETPLACE_DRAFT"
                      ? "bg-purple-800 text-white shadow-2xs"
                      : "text-ink-secondary hover:bg-surface-muted"
                  }`}
                >
                  📦 Marketplace Draft
                </button>
              </div>

              {/* TAB 1: OPPORTUNITY & UNIT ECONOMICS */}
              {detailWorkspaceTab === "OPPORTUNITY" && (
                <div className="space-y-4">
                  {/* Research Snapshot & Provenance */}
                  {detailItem.researchSnapshot && (
                    <Card padding="md" className="border-line bg-[#FAFAF8] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink uppercase tracking-wide">
                          Frozen Research Snapshot
                        </span>
                        <DataProvenanceBadge type="ACTUAL_ETSY_DATA" />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {detailItem.researchSnapshot.opportunityScore !== undefined && (
                          <div className="bg-white p-2 rounded-lg border border-line-subtle">
                            <div className="text-[9px] text-ink-tertiary uppercase">Score</div>
                            <div className="text-sm font-mono font-extrabold text-[#0E8F5D]">
                              {detailItem.researchSnapshot.opportunityScore}/100
                            </div>
                          </div>
                        )}
                        {detailItem.researchSnapshot.estDailySales !== undefined && (
                          <div className="bg-white p-2 rounded-lg border border-line-subtle">
                            <div className="text-[9px] text-ink-tertiary uppercase">Velocity</div>
                            <div className="text-sm font-mono font-extrabold text-ink">
                              {detailItem.researchSnapshot.estDailySales.toFixed(1)}/day
                            </div>
                          </div>
                        )}
                        {detailItem.researchSnapshot.totalSales !== undefined && (
                          <div className="bg-white p-2 rounded-lg border border-line-subtle">
                            <div className="text-[9px] text-ink-tertiary uppercase">Store Orders</div>
                            <div className="text-sm font-mono font-extrabold text-ink">
                              {detailItem.researchSnapshot.totalSales.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {detailItem.researchSnapshot.reviewCount !== undefined && (
                          <div className="bg-white p-2 rounded-lg border border-line-subtle">
                            <div className="text-[9px] text-ink-tertiary uppercase">Review Moat</div>
                            <div className="text-sm font-mono font-extrabold text-ink">
                              {detailItem.researchSnapshot.reviewCount.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>

                      {detailItem.sourceListingUrl && (
                        <div className="pt-2 border-t border-line-subtle flex items-center justify-between">
                          <span className="text-[11px] text-ink-tertiary truncate max-w-sm">
                            Source: {detailItem.sourceListingTitle || detailItem.sourceListingUrl}
                          </span>
                          <a
                            href={detailItem.sourceListingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-[#0E8F5D] inline-flex items-center gap-1 hover:underline shrink-0"
                          >
                            <span>View on Etsy</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Unit Economics Calculator */}
                  <Card padding="md" className="border-line bg-white space-y-4">
                    <Heading as="h3" size="h4">Unit Economics &amp; Margin Modeling</Heading>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-ink">Target Selling Price ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={detailItem.targetPrice || ""}
                          onChange={(e) => setDetailItem({ ...detailItem, targetPrice: e.target.value })}
                          placeholder="e.g. 32.00"
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-ink">Estimated COGS ($)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={detailItem.estimatedCogs || ""}
                          onChange={(e) => setDetailItem({ ...detailItem, estimatedCogs: e.target.value })}
                          placeholder="e.g. 8.50"
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Live Margin Calculation */}
                    {(() => {
                      const price = parseFloat(detailItem.targetPrice) || 0;
                      const cogs = parseFloat(detailItem.estimatedCogs) || 0;
                      const etsyFee = price > 0 ? price * 0.095 + 0.20 : 0;
                      const netMargin = price > 0 ? Math.max(0, price - cogs - etsyFee) : 0;
                      const marginPct = price > 0 ? ((netMargin / price) * 100).toFixed(1) : "0";
                      const dailyVel = detailItem.researchSnapshot?.estDailySales || 2.0;
                      const monthlyProfit = (dailyVel * 30.44 * netMargin).toFixed(0);

                      return (
                        <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <div className="text-[10px] text-ink-tertiary uppercase">Etsy Fees (9.5%+$0.20)</div>
                            <div className="font-mono font-bold text-ink-secondary">${etsyFee.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-ink-tertiary uppercase">Net Profit / Unit</div>
                            <div className="font-mono font-extrabold text-[#0E8F5D]">${netMargin.toFixed(2)} ({marginPct}%)</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-ink-tertiary uppercase">Est. Monthly Profit</div>
                            <div className="font-mono font-extrabold text-ink">${monthlyProfit}/mo</div>
                          </div>
                        </div>
                      );
                    })()}
                  </Card>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">Strategic Notes &amp; Roadmap</label>
                    <textarea
                      rows={3}
                      value={detailItem.notes || ""}
                      onChange={(e) => setDetailItem({ ...detailItem, notes: e.target.value })}
                      placeholder="Enter market observations, product differentiators, packaging ideas..."
                      className="w-full rounded-lg border border-line p-2.5 text-xs text-ink focus:border-[#0E8F5D] focus:ring-1 focus:ring-[#0E8F5D]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: KEYWORDS & TAG CLUSTER */}
              {detailWorkspaceTab === "KEYWORDS" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Heading as="h3" size="h4">Target Keywords &amp; Tag Strategy</Heading>
                    <Badge variant="neutral" className="text-xs font-mono">
                      {(detailItem.targetKeywords || []).length} keywords
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">Add / Edit Target Keywords (Comma-separated)</label>
                    <Input
                      value={(detailItem.targetKeywords || []).join(", ")}
                      onChange={(e) =>
                        setDetailItem({
                          ...detailItem,
                          targetKeywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
                        })
                      }
                      placeholder="leather passport, travel wallet, custom gift..."
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(detailItem.targetKeywords || []).map((kw: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FAFAF8] text-ink border border-line flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>#{kw}</span>
                        <span className="text-[10px] text-ink-tertiary font-mono">
                          {kw.length}/20 chars
                        </span>
                      </span>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-surface-muted text-xs text-ink-secondary space-y-1 border border-line">
                    <div className="font-bold text-ink">Etsy Tag Rules:</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-ink-tertiary">
                      <li>Up to 13 tags per listing</li>
                      <li>Maximum 20 characters per tag</li>
                      <li>Multi-word phrases (long-tail) rank higher than single words</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 3: LISTING CONTENT ASSISTANT */}
              {detailWorkspaceTab === "CONTENT_ASSISTANT" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Heading as="h3" size="h4">Listing Content Assistant</Heading>
                      <Text size="body-sm" color="secondary" className="mt-0.5">
                        Generates structured title, 13 tags, 10-part description &amp; attributes with &lt;15% originality guarantee.
                      </Text>
                    </div>

                    <Button
                      variant="primary"
                      size="compact"
                      loading={assistantLoading}
                      onClick={handleGenerateContent}
                      className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-semibold text-xs shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Generate Content
                    </Button>
                  </div>

                  {generatedContent ? (
                    <div className="space-y-4">
                      {/* Originality Badge */}
                      <div className="p-2.5 rounded-xl bg-[#E7FAF1] border border-[#16C784]/30 flex items-center justify-between text-xs">
                        <span className="font-bold text-[#0E8F5D]">
                          🛡️ {generatedContent.originalityReport.verdict}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-ink-secondary">
                          {generatedContent.originalityReport.competitorSimilarityPercent}% competitor overlap
                        </span>
                      </div>

                      {/* Title Box */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-ink">
                            Optimized Title ({generatedContent.titleLength}/140 chars)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleCopy(generatedContent.title, "title")}
                            className="text-xs text-[#0E8F5D] font-bold hover:underline"
                          >
                            {copiedField === "title" ? "Copied!" : "Copy Title"}
                          </button>
                        </div>
                        <div className="p-2.5 rounded-xl border border-line bg-white text-xs font-semibold text-ink leading-relaxed">
                          <span className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-bold">
                            {generatedContent.first40Chars}
                          </span>
                          <span>{generatedContent.title.slice(40)}</span>
                        </div>
                      </div>

                      {/* 13 Tags Grid */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-ink">
                            Recommended Tags ({generatedContent.tags.length}/13)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleCopy(generatedContent.tags.map((t: any) => t.tag).join(", "), "tags")}
                            className="text-xs text-[#0E8F5D] font-bold hover:underline"
                          >
                            {copiedField === "tags" ? "Copied All!" : "Copy All Tags"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {generatedContent.tags.map((t: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[#FAFAF8] text-ink border border-line flex items-center gap-1"
                            >
                              <span>{t.tag}</span>
                              <span className="text-[9px] text-ink-tertiary font-mono">({t.characterCount})</span>
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
                            onClick={() => handleCopy(generatedContent.description, "desc")}
                            className="text-xs text-[#0E8F5D] font-bold hover:underline"
                          >
                            {copiedField === "desc" ? "Copied!" : "Copy Description"}
                          </button>
                        </div>
                        <textarea
                          rows={6}
                          readOnly
                          value={generatedContent.description}
                          className="w-full rounded-xl border border-line p-3 text-xs text-ink bg-[#FAFAF8] font-mono leading-relaxed focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center rounded-xl border border-dashed border-line bg-[#FAFAF8] space-y-2">
                      <Sparkles className="h-8 w-8 text-ink-tertiary mx-auto opacity-50" />
                      <div className="text-xs font-bold text-ink">Listing Content Not Yet Generated</div>
                      <p className="text-[11px] text-ink-tertiary max-w-sm mx-auto">
                        Click &quot;Generate Content&quot; to synthesize an optimized title, 13 tags, and structured description from this opportunity&apos;s keyword cluster.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: MARKETPLACE DRAFT SYNC */}
              {detailWorkspaceTab === "MARKETPLACE_DRAFT" && (
                <div className="space-y-4">
                  <Heading as="h3" size="h4">Etsy Marketplace Draft Preparation</Heading>

                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-amber-700" />
                      <span>Rule 9: Human Review &amp; Approval Gate</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      SellerSalt drafts are created strictly in <strong>draft</strong> state. Content is never published live to marketplace customers without your explicit approval.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      variant="primary"
                      size="default"
                      loading={creatingDraft}
                      onClick={handleCreateDraft}
                      className="w-full bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold text-xs h-10"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Create Validated Etsy Draft
                    </Button>

                    {draftCreationResult && (
                      <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line text-xs space-y-2">
                        <div className="font-bold text-[#0E8F5D] flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{draftCreationResult.message}</span>
                        </div>
                        {draftCreationResult.etsyDraftUrl && (
                          <a
                            href={draftCreationResult.etsyDraftUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E8F5D] hover:underline"
                          >
                            <span>Open in Etsy Listing Manager</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-line flex items-center justify-between gap-3">
              <Button
                variant="destructive"
                size="compact"
                onClick={() => handleDeleteItem(detailItem.id)}
                className="text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Item
              </Button>

              <div className="flex items-center gap-2">
                <Link
                  href={`/studio?plannerItemId=${encodeURIComponent(detailItem.id)}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Open in Studio</span>
                </Link>

                <Button
                  variant="secondary"
                  size="compact"
                  onClick={() => {
                    setSelectedItemId(null);
                    setDetailItem(null);
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="compact"
                  loading={savingDetail}
                  onClick={handleSaveDetail}
                  className="text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Item Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-line p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <Heading as="h3" size="h4">New Planner Item</Heading>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Item Title *</label>
                <Input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="e.g. Personalized Leather Travel Wallet Concept"
                  className="h-10 text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink">Item Type</label>
                  <select
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value as PlannerItemType)}
                    className="w-full bg-[#FAFAF8] border border-line rounded-lg px-3 py-2 text-xs font-semibold text-ink"
                  >
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink">Target Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={createPrice}
                    onChange={(e) => setCreatePrice(e.target.value)}
                    placeholder="28.00"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink">Initial Strategic Notes</label>
                <textarea
                  rows={3}
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Notes, target niche, competitor references..."
                  className="w-full rounded-lg border border-line p-2.5 text-xs text-ink focus:border-[#0E8F5D] focus:ring-1 focus:ring-[#0E8F5D]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={creating}
                  className="text-xs font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white"
                >
                  Create Item
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
