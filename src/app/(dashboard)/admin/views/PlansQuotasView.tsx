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
    setIsSaving(true);
    try {
      const ok = await onCreatePackage({
        ...newPlan,
        key: newPlan.key.toUpperCase().trim(),
        name: newPlan.name.trim(),
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
    } finally {
      setIsSaving(false);
    }
  };

  const freePlan = packages.find((p) => p.key === "FREE" || p.priceUsd === 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-[var(--color-line)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--color-ink)]">Commercial Plans & Quotas</h2>
            <Badge variant="success">
              {packages.length} Tier Configurations
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Grouped limits, commercial pricing, trial parameters, and feature entitlement control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="compact"
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            className="text-xs h-9 font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Tier</span>
          </Button>
        </div>
      </div>

      {/* Plan Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {packages.map((pkg) => {
          const isSelected = pkg.id === selectedPlanId;
          const isFree = pkg.key === "FREE" || pkg.priceUsd === 0;

          return (
            <button
              key={pkg.id}
              onClick={() => setSelectedPlanId(pkg.id)}
              className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between ${
                isSelected
                  ? "border-[var(--color-brand-primary)] bg-[var(--color-surface)] shadow-md ring-2 ring-[var(--color-brand-primary)]/20"
                  : "border-[var(--color-line)] bg-[var(--color-paper)] hover:bg-[var(--color-surface)]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-sm text-[var(--color-ink)]">{pkg.name}</span>
                  {isFree && (
                    <Badge variant="info">
                      Free
                    </Badge>
                  )}
                </div>
                <div className="text-xs font-mono text-[var(--color-ink-muted)]">{pkg.key}</div>
              </div>

              <div className="mt-4 pt-2 border-t border-[var(--color-line)] flex items-center justify-between">
                <span className="font-bold text-base text-[var(--color-ink)]">${pkg.priceUsd}/mo</span>
                <span className="text-[11px] text-[var(--color-ink-muted)]">
                  {pkg._count?.organizations || 0} orgs
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Grouped Editor for Selected Plan */}
      {draft && (
        <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-sm space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[var(--color-line)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-paper)] border border-[var(--color-line)] flex items-center justify-center font-bold text-lg text-[var(--color-brand-primary)]">
                {draft.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg text-[var(--color-ink)] flex items-center gap-2">
                  <span>{draft.name} Configuration</span>
                  <Badge variant={draft.isActive ? "success" : "neutral"}>
                    {draft.isActive ? "Active on Public Pricing" : "Hidden / Internal"}
                  </Badge>
                </h3>
                <p className="text-xs font-mono text-[var(--color-ink-muted)]">Tier Identifier: {draft.key}</p>
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
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Plan quotas and parameters saved successfully.</span>
            </div>
          )}

          {/* Group 1: Commercial & Pricing */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
              <DollarSign className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
              <span>1. Commercial & Pricing Parameters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Display Name</label>
                <input
                  type="text"
                  value={draft.name || ""}
                  onChange={(e) => updateDraftField("name", e.target.value)}
                  className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Monthly Price (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.priceUsd ?? 0}
                  disabled={draft.key === "FREE"}
                  onChange={(e) => updateDraftField("priceUsd", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Yearly Price Equivalent ($/yr)
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.priceUsd ? Math.round(draft.priceUsd * 10) : 0}
                  disabled
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)] opacity-60"
                />
                <span className="text-[10px] text-[var(--color-ink-muted)]">Calculated with 2-months annual discount.</span>
              </div>
            </div>
          </div>

          {/* Group 2: Usage Limits & Search Engine */}
          <div className="space-y-3 pt-4 border-t border-[var(--color-line)]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
              <Layers className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
              <span>2. Usage Limits & Keyword Search Engine</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Saved Keyword Searches
                </label>
                <input
                  type="number"
                  min="1"
                  value={draft.maxSearchConfigs ?? 5}
                  onChange={(e) => updateDraftField("maxSearchConfigs", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
                <span className="text-[10px] text-[var(--color-ink-muted)]">Active keyword surveillance monitors.</span>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Scheduled Auto-Searches
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.maxScheduledSearches ?? 0}
                  onChange={(e) => updateDraftField("maxScheduledSearches", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
                <span className="text-[10px] text-[var(--color-ink-muted)]">Daily automated refresh runs.</span>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Tracked Competitor Shops
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.maxTrackedShops ?? 1}
                  onChange={(e) => updateDraftField("maxTrackedShops", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
                <span className="text-[10px] text-[var(--color-ink-muted)]">Max concurrent competitor shops.</span>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Prospects Extraction / Month
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.maxProspectsPerMonth ?? 100}
                  onChange={(e) => updateDraftField("maxProspectsPerMonth", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
                <span className="text-[10px] text-[var(--color-ink-muted)]">Monthly listing lead captures.</span>
              </div>
            </div>
          </div>

          {/* Group 3: Feature Entitlements & Surveillance History */}
          <div className="space-y-3 pt-4 border-t border-[var(--color-line)]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
              <span>3. Feature Entitlements & Surveillance History</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Surveillance History Retention (Days)
                </label>
                <select
                  value={draft.maxTrackingDays ?? 3}
                  onChange={(e) => updateDraftField("maxTrackingDays", Number(e.target.value))}
                  className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                >
                  <option value={1}>1 Day (Live snapshots only)</option>
                  <option value={3}>3 Days (Free / Trial default)</option>
                  <option value={7}>7 Days (Starter)</option>
                  <option value={30}>30 Days (Pro tier)</option>
                  <option value={90}>90 Days (Agency & Enterprise)</option>
                </select>
                <span className="text-[10px] text-[var(--color-ink-muted)]">Competitor snapshot depth window.</span>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  Connected Seller Channels
                </label>
                <input
                  type="number"
                  min="1"
                  value={draft.maxConnectors ?? 1}
                  onChange={(e) => updateDraftField("maxConnectors", Number(e.target.value))}
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
                <span className="text-[10px] text-[var(--color-ink-muted)]">Etsy, Shopify, Amazon integrations.</span>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                  AI Assistant Token Allowance
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    draft.priceUsd >= 99
                      ? "Unlimited (Agency Tier)"
                      : draft.priceUsd >= 49
                      ? "100,000 Tokens/mo (Pro)"
                      : draft.priceUsd > 0
                      ? "25,000 Tokens/mo (Starter)"
                      : "5,000 Tokens/mo (Free)"
                  }
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)] opacity-75"
                />
                <span className="text-[10px] text-[var(--color-ink-muted)]">Allocated monthly AI tokens.</span>
              </div>
            </div>
          </div>

          {/* Group 4: Delete Action for Non-Default Plans */}
          {draft.key !== "FREE" && draft.key !== "STARTED" && draft.key !== "PRO" && draft.key !== "AGENCY" && (
            <div className="pt-4 border-t border-[var(--color-line)] flex items-center justify-between">
              <span className="text-xs text-rose-700">Custom plan can be safely deleted if no active orgs rely on it.</span>
              <Button
                size="compact"
                variant="destructive"
                onClick={() => onDeletePackage(draft.id)}
                className="text-xs h-8"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete Custom Plan
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal for Creating New Custom Tier */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-[var(--color-ink)]">Create Commercial Tier</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Tier Key</label>
                  <input
                    type="text"
                    required
                    placeholder="ENTERPRISE"
                    value={newPlan.key || ""}
                    onChange={(e) => setNewPlan({ ...newPlan, key: e.target.value.toUpperCase() })}
                    className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enterprise Custom"
                    value={newPlan.name || ""}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Price / Month ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={newPlan.priceUsd || 0}
                    onChange={(e) => setNewPlan({ ...newPlan, priceUsd: Number(e.target.value) })}
                    className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Tracked Shops</label>
                  <input
                    type="number"
                    min="0"
                    value={newPlan.maxTrackedShops || 5}
                    onChange={(e) => setNewPlan({ ...newPlan, maxTrackedShops: Number(e.target.value) })}
                    className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-line)]">
                <Button size="compact" variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button size="compact" variant="primary" type="submit" disabled={isSaving} className="font-semibold">
                  {isSaving ? "Creating..." : "Create Tier"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
