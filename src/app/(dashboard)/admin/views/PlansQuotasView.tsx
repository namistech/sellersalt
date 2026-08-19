"use client";

import React, { useState } from "react";
import {
  Layers,
  Sparkles,
  DollarSign,
  TrendingUp,
  Shield,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Save,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface PackageData {
  id: string;
  key: string;
  name: string;
  priceUsd: number;
  maxSearchConfigs: number;
  maxScheduledSearches: number;
  maxTrackedShops: number;
  maxProspectsPerMonth: number;
  maxConnectors: number;
  maxTrackingDays?: number;
  isActive: boolean;
  _count?: { organizations: number };
}

interface PlansQuotasViewProps {
  packages: PackageData[];
  onSavePackage: (pkg: PackageData) => Promise<boolean>;
  onCreatePackage: (pkg: Partial<PackageData>) => Promise<boolean>;
  onDeletePackage: (pkgId: string) => Promise<boolean>;
  onToggleActive: (pkg: PackageData) => Promise<boolean>;
}

export function PlansQuotasView({
  packages,
  onSavePackage,
  onCreatePackage,
  onDeletePackage,
  onToggleActive,
}: PlansQuotasViewProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(packages[0]?.id || "");
  const [drafts, setDrafts] = useState<Record<string, Partial<PackageData>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<PackageData>>({
    key: "",
    name: "",
    priceUsd: 29,
    maxSearchConfigs: 25,
    maxScheduledSearches: 10,
    maxTrackedShops: 5,
    maxProspectsPerMonth: 1000,
    maxConnectors: 1,
    maxTrackingDays: 30,
    isActive: true,
  });

  const selectedPlan = packages.find((p) => p.id === selectedPlanId) || packages[0];
  const draft = selectedPlan ? { ...selectedPlan, ...(drafts[selectedPlan.id] || {}) } : null;

  const updateDraftField = (field: keyof PackageData, val: any) => {
    if (!selectedPlan) return;
    setDrafts((prev) => ({
      ...prev,
      [selectedPlan.id]: {
        ...(prev[selectedPlan.id] || {}),
        [field]: val,
      },
    }));
    setSaveSuccess(false);
  };

  const handleSaveCurrentPlan = async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      const ok = await onSavePackage(draft as PackageData);
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.key || !newPlan.name) return;

    const ok = await onCreatePackage({
      ...newPlan,
      key: newPlan.key.toUpperCase().trim(),
    });

    if (ok) {
      setShowCreateModal(false);
      setNewPlan({
        key: "",
        name: "",
        priceUsd: 29,
        maxSearchConfigs: 25,
        maxScheduledSearches: 10,
        maxTrackedShops: 5,
        maxProspectsPerMonth: 1000,
        maxConnectors: 1,
        maxTrackingDays: 30,
        isActive: true,
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-ink">Subscription Plans & Usage Quotas</h2>
            <Badge variant="success">Granular Entitlements</Badge>
          </div>
          <p className="text-sm text-ink-secondary mt-1">
            Configure subscription tier prices, keyword limits, prospect quotas, competitor shop tracking caps, and connector features.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          variant="primary"
          size="compact"
          className="text-xs h-9 px-4 font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create New Package
        </Button>
      </div>

      {/* Plan Switcher Pills */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {packages.map((pkg) => {
          const isSelected = selectedPlan?.id === pkg.id;
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => setSelectedPlanId(pkg.id)}
              className={`p-4 rounded-2xl border text-left transition-all shrink-0 min-w-[200px] flex flex-col justify-between ${
                isSelected
                  ? "bg-[#141B16] text-white border-[#141B16] shadow-sm"
                  : "bg-white text-ink border-line hover:border-line-strong hover:shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-bold text-sm tracking-tight">{pkg.name}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-[#FAFAF8] border border-line text-ink-secondary"
                  }`}
                >
                  {pkg.key}
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">${pkg.priceUsd}</span>
                <span className={`text-xs ${isSelected ? "text-zinc-300" : "text-ink-tertiary"}`}>/mo</span>
              </div>

              <div className={`text-[11px] mt-2 pt-2 border-t flex items-center justify-between ${
                isSelected ? "border-white/20 text-zinc-300" : "border-line text-ink-tertiary"
              }`}>
                <span>{pkg._count?.organizations || 0} Workspaces</span>
                <span>{pkg.isActive ? "● Active" : "○ Inactive"}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Grouped Editor for Selected Plan */}
      {draft && (
        <div className="p-6 rounded-2xl border border-line bg-white shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAFAF8] border border-line flex items-center justify-center font-bold text-lg text-[#0E8F5D]">
                {draft.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg text-ink flex items-center gap-2">
                  <span>{draft.name} Configuration</span>
                  <Badge variant={draft.isActive ? "success" : "neutral"}>
                    {draft.isActive ? "Active on Public Pricing" : "Hidden / Internal"}
                  </Badge>
                </h3>
                <p className="text-xs font-mono text-ink-tertiary">Tier Identifier: {draft.key}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="compact"
                variant="secondary"
                onClick={() => onToggleActive(selectedPlan)}
                className="text-xs h-8"
              >
                {draft.isActive ? "Hide Plan" : "Activate Plan"}
              </Button>

              <Button
                size="compact"
                variant="primary"
                onClick={handleSaveCurrentPlan}
                disabled={isSaving}
                className="text-xs h-8 px-4 font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-[#E7FAF1] text-[#0E8F5D] border border-[#16C784]/40 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0E8F5D] shrink-0" />
              <span>Plan quotas and parameters saved successfully.</span>
            </div>
          )}

          {/* Group 1: Commercial & Pricing */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-tertiary">
              <DollarSign className="w-3.5 h-3.5 text-[#0E8F5D]" />
              <span>1. Commercial & Pricing Parameters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Display Name</label>
                <input
                  type="text"
                  value={draft.name || ""}
                  onChange={(e) => updateDraftField("name", e.target.value)}
                  className="w-full text-xs bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Monthly Price (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.priceUsd ?? 0}
                  disabled={draft.key === "FREE"}
                  onChange={(e) => updateDraftField("priceUsd", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink disabled:opacity-60 focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Yearly Price Equivalent ($/yr)
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.priceUsd ? Math.round(draft.priceUsd * 10) : 0}
                  disabled
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink opacity-60"
                />
                <span className="text-[10px] text-ink-tertiary">Calculated with 2-months annual discount.</span>
              </div>
            </div>
          </div>

          {/* Group 2: Usage Limits & Search Engine */}
          <div className="space-y-3 pt-4 border-t border-line">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-tertiary">
              <Layers className="w-3.5 h-3.5 text-[#0E8F5D]" />
              <span>2. Usage Limits & Keyword Search Engine</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Saved Keyword Searches
                </label>
                <input
                  type="number"
                  min="1"
                  value={draft.maxSearchConfigs ?? 5}
                  onChange={(e) => updateDraftField("maxSearchConfigs", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
                <span className="text-[10px] text-ink-tertiary">Active keyword research monitors.</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Scheduled Auto-Searches
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.maxScheduledSearches ?? 0}
                  onChange={(e) => updateDraftField("maxScheduledSearches", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
                <span className="text-[10px] text-ink-tertiary">Daily automated refresh runs.</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Tracked Competitor Shops
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.maxTrackedShops ?? 1}
                  onChange={(e) => updateDraftField("maxTrackedShops", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
                <span className="text-[10px] text-ink-tertiary">Live radar tracking slots.</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Monthly Prospect Cap
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.maxProspectsPerMonth ?? 100}
                  onChange={(e) => updateDraftField("maxProspectsPerMonth", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
                <span className="text-[10px] text-ink-tertiary">Discovered items saved per cycle.</span>
              </div>
            </div>
          </div>

          {/* Group 3: Features & Integrations */}
          <div className="space-y-3 pt-4 border-t border-line">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-tertiary">
              <Sparkles className="w-3.5 h-3.5 text-[#0E8F5D]" />
              <span>3. Features & Marketplace Connectors</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Connected Seller Channels (Etsy / Shopify)
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.maxConnectors ?? 1}
                  onChange={(e) => updateDraftField("maxConnectors", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
                <span className="text-[10px] text-ink-tertiary">Maximum OAuth seller store connections.</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">
                  Historical Tracking Horizon (Days)
                </label>
                <input
                  type="number"
                  min="7"
                  value={draft.maxTrackingDays ?? 30}
                  onChange={(e) => updateDraftField("maxTrackingDays", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
                <span className="text-[10px] text-ink-tertiary">Retention horizon for sales telemetry graphs.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Package Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-lg p-6 rounded-2xl bg-white border border-line shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-base text-ink">Create Subscription Tier</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-ink-tertiary hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Plan Key (e.g. ENTERPRISE)</label>
                <input
                  type="text"
                  required
                  placeholder="CUSTOM_TIER"
                  value={newPlan.key}
                  onChange={(e) => setNewPlan({ ...newPlan, key: e.target.value.toUpperCase() })}
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enterprise Plan"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full text-xs bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Monthly Price ($ USD)</label>
                <input
                  type="number"
                  min="0"
                  value={newPlan.priceUsd}
                  onChange={(e) => setNewPlan({ ...newPlan, priceUsd: Number(e.target.value) })}
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Prospects / Month</label>
                <input
                  type="number"
                  min="0"
                  value={newPlan.maxProspectsPerMonth}
                  onChange={(e) => setNewPlan({ ...newPlan, maxProspectsPerMonth: Number(e.target.value) })}
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button size="compact" variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button size="compact" variant="primary" type="submit" className="font-semibold">
                Create Package
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
