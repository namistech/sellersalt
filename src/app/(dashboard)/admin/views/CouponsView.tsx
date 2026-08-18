"use client";

import React, { useState } from "react";
import {
  Tag,
  Percent,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Gift,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface CouponItem {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  behavior?: string;
  duration?: string;
  durationMonths?: number | null;
  applicablePlanKey?: string | null;
  notes?: string | null;
  firstTimeOnly?: boolean;
  minPlanPrice?: number | null;
  isActive: boolean;
  maxRedemptions?: number | null;
  redemptionCount: number;
  expiresAt?: string | null;
  startDate?: string | null;
  createdAt?: string;
}

interface CouponsViewProps {
  coupons: CouponItem[];
  onCreateCoupon: (coupon: Partial<CouponItem>) => Promise<boolean>;
  onDeleteCoupon: (id: string) => Promise<boolean>;
  onToggleActive?: (id: string, active: boolean) => Promise<boolean>;
}

export function CouponsView({
  coupons,
  onCreateCoupon,
  onDeleteCoupon,
}: CouponsViewProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<CouponItem>>({
    code: "",
    type: "PERCENT",
    value: 20,
    behavior: "PERCENTAGE_DISCOUNT",
    duration: "ONCE",
    durationMonths: 1,
    applicablePlanKey: "ALL",
    firstTimeOnly: true,
    maxRedemptions: 100,
    notes: "",
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code) return;
    setIsSubmitting(true);
    try {
      const ok = await onCreateCoupon({
        ...formData,
        code: formData.code.toUpperCase().trim(),
        applicablePlanKey: formData.applicablePlanKey === "ALL" ? null : formData.applicablePlanKey,
      });
      if (ok) {
        setShowCreateForm(false);
        setFormData({
          code: "",
          type: "PERCENT",
          value: 20,
          behavior: "PERCENTAGE_DISCOUNT",
          duration: "ONCE",
          durationMonths: 1,
          applicablePlanKey: "ALL",
          firstTimeOnly: true,
          maxRedemptions: 100,
          notes: "",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBehaviorLabel = (behavior?: string, type?: string, value?: number) => {
    switch (behavior) {
      case "FREE_TRIAL":
        return "Type A: 100% Free Trial ($0 Today)";
      case "PAID_TRIAL_FIRST_MONTH_FREE":
        return "Type B: $1 Trial → First Month Free";
      case "COMPLETELY_FREE":
        return "Type C: Direct $0 Account Provisioning";
      case "FIXED_DISCOUNT":
        return `$${value || 0} Off Recurring Charge`;
      case "PERCENTAGE_DISCOUNT":
      default:
        return `${value || 0}% Off Recurring Charge`;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-[var(--color-line)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--color-ink)]">Commercial Coupons & Promotions</h2>
            <Badge variant="success">
              {coupons.length} Promo Codes
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Create multi-behavior trial coupons, percentage discounts, direct provisioning codes, and affiliate promotions.
          </p>
        </div>

        <Button
          size="compact"
          variant="primary"
          onClick={() => setShowCreateForm((s) => !s)}
          className="text-xs h-9 font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? "Close Form" : "Create Coupon Code"}</span>
        </Button>
      </div>

      {/* Creation Modal / Form */}
      {showCreateForm && (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-md space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
            <h3 className="font-bold text-base text-[var(--color-ink)] flex items-center gap-2">
              <Gift className="w-4 h-4 text-[var(--color-brand-primary)]" />
              <span>Create Commercial Coupon</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Coupon Code</label>
              <input
                type="text"
                required
                placeholder="ETSYGROWTH50"
                value={formData.code || ""}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full text-xs font-mono uppercase bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)] font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Commercial Behavior</label>
              <select
                value={formData.behavior || "PERCENTAGE_DISCOUNT"}
                onChange={(e) => {
                  const b = e.target.value;
                  let t: "PERCENT" | "FIXED" = "PERCENT";
                  let v = formData.value;
                  if (b === "FIXED_DISCOUNT") t = "FIXED";
                  if (b === "FREE_TRIAL" || b === "COMPLETELY_FREE") {
                    t = "PERCENT";
                    v = 100;
                  }
                  setFormData({ ...formData, behavior: b, type: t, value: v });
                }}
                className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
              >
                <option value="PERCENTAGE_DISCOUNT">Percentage Discount (e.g. 20% or 50% Off)</option>
                <option value="FIXED_DISCOUNT">Fixed Amount Off (e.g. $10 Off)</option>
                <option value="FREE_TRIAL">Type A: 100% Free Trial ($0 Today at Checkout)</option>
                <option value="PAID_TRIAL_FIRST_MONTH_FREE">Type B: Paid Trial ($1 Today → Month 1 Free)</option>
                <option value="COMPLETELY_FREE">Type C: 100% Free Lifetime Bypass</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">
                Discount Value {formData.type === "PERCENT" ? "(%)" : "($ USD)"}
              </label>
              <input
                type="number"
                min="0"
                max={formData.type === "PERCENT" ? 100 : 1000}
                value={formData.value ?? 0}
                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Duration Cycle</label>
              <select
                value={formData.duration || "ONCE"}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
              >
                <option value="ONCE">Once (Applied to first invoice)</option>
                <option value="REPEATING">Repeating (Multiple consecutive months)</option>
                <option value="FOREVER">Forever (All recurring monthly invoices)</option>
              </select>
            </div>

            {formData.duration === "REPEATING" && (
              <div>
                <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Repeating Months</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.durationMonths ?? 3}
                  onChange={(e) => setFormData({ ...formData, durationMonths: Number(e.target.value) })}
                  className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Applicable Tier</label>
              <select
                value={formData.applicablePlanKey || "ALL"}
                onChange={(e) => setFormData({ ...formData, applicablePlanKey: e.target.value })}
                className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
              >
                <option value="ALL">All Commercial Tiers</option>
                <option value="STARTED">Starter Plan Only</option>
                <option value="PRO">Pro Plan Only</option>
                <option value="AGENCY">Agency Plan Only</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Max Redemptions</label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited if empty"
                value={formData.maxRedemptions ?? ""}
                onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value ? Number(e.target.value) : null })}
                className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--color-ink)] block mb-1">Campaign Notes / Channel</label>
            <input
              type="text"
              placeholder="e.g. YouTube influencer partnership / Black Friday 2026"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)]"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)]">
            <label className="flex items-center gap-2 text-xs text-[var(--color-ink)] cursor-pointer">
              <input
                type="checkbox"
                checked={formData.firstTimeOnly}
                onChange={(e) => setFormData({ ...formData, firstTimeOnly: e.target.checked })}
                className="rounded border-[var(--color-line)] text-[var(--color-brand-primary)]"
              />
              <span>First-time customers only</span>
            </label>

            <div className="flex gap-2">
              <Button size="compact" variant="secondary" type="button" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button size="compact" variant="primary" type="submit" disabled={isSubmitting} className="font-semibold">
                {isSubmitting ? "Creating..." : "Save Coupon"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Coupons Table / Grid */}
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-muted)]">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Coupon Code</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Behavior & Value</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Target Plan</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Duration</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Redemptions</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[var(--color-ink-muted)]">
                    No commercial coupons created yet. Click &quot;Create Coupon Code&quot; to add your first promotion.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-[var(--color-paper)] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[var(--color-ink)]">{coupon.code}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(coupon.code)}
                          className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] p-1 rounded hover:bg-[var(--color-surface)]"
                          title="Copy Code"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {coupon.notes && <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">{coupon.notes}</p>}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-[var(--color-ink)]">
                      {getBehaviorLabel(coupon.behavior, coupon.type, coupon.value)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[var(--color-ink-muted)]">
                      {coupon.applicablePlanKey || "ALL PLANS"}
                    </td>

                    <td className="py-3.5 px-4 text-[var(--color-ink)]">
                      {coupon.duration === "REPEATING"
                        ? `${coupon.durationMonths || 1} Months`
                        : coupon.duration || "ONCE"}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[var(--color-ink)]">
                      {coupon.redemptionCount}
                      {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : " / ∞"}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge variant={coupon.isActive ? "success" : "neutral"}>
                        {coupon.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteCoupon(coupon.id)}
                        className="text-[var(--color-ink-muted)] hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
