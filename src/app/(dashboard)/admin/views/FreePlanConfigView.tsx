"use client";

import React, { useState } from "react";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sliders,
  ShieldCheck,
  Lock,
  Sparkles,
  Search,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Badge,
  Button,
  Alert,
} from "@/components/ui";

interface FreePlanConfigViewProps {
  freePackage: any;
  onSavePackageLimits: (pkgId: string, limits: any) => Promise<boolean>;
  freePlanEnabled: boolean;
  onSaveSetting: (key: string, value: string) => Promise<boolean>;
}

export function FreePlanConfigView({
  freePackage,
  onSavePackageLimits,
  freePlanEnabled,
  onSaveSetting,
}: FreePlanConfigViewProps) {
  const [enabled, setEnabled] = useState(freePlanEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setEnabled(freePlanEnabled);
  }, [freePlanEnabled]);

  // Limits
  const [limits, setLimits] = useState({
    keywordSearchesPerMonth: freePackage?.limits?.keywordSearchesPerMonth ?? 10,
    productSearchesPerMonth: freePackage?.limits?.productSearchesPerMonth ?? 10,
    competitorsTracked: freePackage?.limits?.competitorsTracked ?? 1,
    listingsTracked: freePackage?.limits?.listingsTracked ?? 5,
    shopsTracked: freePackage?.limits?.shopsTracked ?? 1,
    aiGenerationsPerMonth: freePackage?.limits?.aiGenerationsPerMonth ?? 3,
    plannerItemsMax: freePackage?.limits?.plannerItemsMax ?? 10,
    connectedStoresMax: freePackage?.limits?.connectedStoresMax ?? 1,
    canExportData: Boolean(freePackage?.limits?.canExportData ?? false),
  });

  React.useEffect(() => {
    if (freePackage?.limits) {
      setLimits({
        keywordSearchesPerMonth: freePackage.limits.keywordSearchesPerMonth ?? 10,
        productSearchesPerMonth: freePackage.limits.productSearchesPerMonth ?? 10,
        competitorsTracked: freePackage.limits.competitorsTracked ?? 1,
        listingsTracked: freePackage.limits.listingsTracked ?? 5,
        shopsTracked: freePackage.limits.shopsTracked ?? 1,
        aiGenerationsPerMonth: freePackage.limits.aiGenerationsPerMonth ?? 3,
        plannerItemsMax: freePackage.limits.plannerItemsMax ?? 10,
        connectedStoresMax: freePackage.limits.connectedStoresMax ?? 1,
        canExportData: Boolean(freePackage.limits.canExportData ?? false),
      });
    }
  }, [freePackage]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSaveSetting("free_plan_enabled", String(enabled));
    if (freePackage?.id) {
      await onSavePackageLimits(freePackage.id, limits);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
            <Layers className="h-4 w-4" />
          </span>
          <Heading as="h2" size="h3" className="text-xl font-bold text-ink">
            Free Explorer Plan Administration
          </Heading>
        </div>
        <Text size="body-sm" className="text-ink-secondary mt-1">
          Configure canonical quota ceilings, feature gates, and commercial visibility for the default Free Explorer ($0/mo) tier.
        </Text>
      </div>

      {saved && <Alert variant="success">Free Explorer plan quotas and visibility updated successfully.</Alert>}

      <Card padding="lg" className="border-line bg-white shadow-xs space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Public Visibility Toggle */}
          <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-ink">Public Tier Availability</div>
              <div className="text-meta text-ink-tertiary">
                Display Free Explorer on public pricing table and allow $0 checkout without payment method.
              </div>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-[#0E8F5D] rounded"
            />
          </div>

          {/* Quota Matrix */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-ink uppercase tracking-wider">
              Usage Quota Ceilings (Per Calendar Month)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-ink">Keyword Searches / mo</label>
                <input
                  type="number"
                  min="0"
                  value={limits.keywordSearchesPerMonth}
                  onChange={(e) => setLimits({ ...limits, keywordSearchesPerMonth: Number(e.target.value) })}
                  className="w-full border border-line rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Product Searches / mo</label>
                <input
                  type="number"
                  min="0"
                  value={limits.productSearchesPerMonth}
                  onChange={(e) => setLimits({ ...limits, productSearchesPerMonth: Number(e.target.value) })}
                  className="w-full border border-line rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">AI Copy Generations / mo</label>
                <input
                  type="number"
                  min="0"
                  value={limits.aiGenerationsPerMonth}
                  onChange={(e) => setLimits({ ...limits, aiGenerationsPerMonth: Number(e.target.value) })}
                  className="w-full border border-line rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Tracked Competitors Max</label>
                <input
                  type="number"
                  min="0"
                  value={limits.competitorsTracked}
                  onChange={(e) => setLimits({ ...limits, competitorsTracked: Number(e.target.value) })}
                  className="w-full border border-line rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Tracked Listings Max</label>
                <input
                  type="number"
                  min="0"
                  value={limits.listingsTracked}
                  onChange={(e) => setLimits({ ...limits, listingsTracked: Number(e.target.value) })}
                  className="w-full border border-line rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink">Connected Etsy Stores Max</label>
                <input
                  type="number"
                  min="0"
                  value={limits.connectedStoresMax}
                  onChange={(e) => setLimits({ ...limits, connectedStoresMax: Number(e.target.value) })}
                  className="w-full border border-line rounded-lg px-3 py-2 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Feature Flags */}
          <div className="space-y-3 pt-2 border-t border-line">
            <h4 className="text-xs font-extrabold text-ink uppercase tracking-wider">
              Feature Capabilities & Gates
            </h4>
            <div className="p-4 rounded-xl border border-line bg-[#FAFAF8] flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-ink">CSV / Excel Data Exports</div>
                <div className="text-meta text-ink-tertiary">Allow Free Explorer users to download spreadsheet exports.</div>
              </div>
              <input
                type="checkbox"
                checked={limits.canExportData}
                onChange={(e) => setLimits({ ...limits, canExportData: e.target.checked })}
                className="h-4 w-4 accent-[#0E8F5D] rounded"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="default"
            loading={saving}
            className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold text-xs px-5"
          >
            Save Free Plan Configuration
          </Button>
        </form>
      </Card>
    </div>
  );
}
