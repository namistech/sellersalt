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
        value: Number(formData.value) || 0,
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
    if (behavior === "FIRST_MONTH_FLAT_DOLLAR" || behavior === "FIRST_MONTH_ONE_DOLLAR") {
      return `$${value || 1} First Month Special`;
    }
    if (behavior === "THREE_MONTHS_REDUCED") {
      return `${value || 50}% Off for 3 Months`;
    }
    if (behavior === "PERCENTAGE_OFF_ALL_TIERS") {
      return `${value || 20}% Off All Commercial Tiers`;
    }
    if (behavior === "PLAN_SPECIFIC_MATCH") {
      return `${value || 20}% Off Selected Plan`;
    }
    if (type === "PERCENT") return `${value}% Percentage Off`;
    return `$${value} Fixed Dollar Off`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-ink">Coupons & Commercial Promotions</h2>
            <Badge variant="success">Stripe & Local Engine</Badge>
          </div>
          <p className="text-sm text-ink-secondary mt-1">
            Create multi-tier promotional discounts, recurring retention offers, and first-time customer coupon codes.
          </p>
        </div>

        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant={showCreateForm ? "secondary" : "primary"}
          size="compact"
          className="text-xs h-9 px-4 font-semibold"
        >
          {showCreateForm ? (
            "Cancel Creation"
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Coupon Code
            </>
          )}
        </Button>
      </div>

      {/* Preset Campaign Patterns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setFormData({
              code: "ONE_DOLLAR_INTRO",
              type: "FIXED",
              value: 1,
              behavior: "FIRST_MONTH_ONE_DOLLAR",
              duration: "ONCE",
              applicablePlanKey: "STARTER",
              firstTimeOnly: true,
              notes: "$1 First Month Starter Special",
            });
            setShowCreateForm(true);
          }}
          className="p-4 rounded-2xl border border-line bg-white shadow-xs hover:border-line-strong hover:shadow transition-all text-left space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">🏷️</span>
            <Badge variant="gold">Type A</Badge>
          </div>
          <h4 className="font-bold text-xs text-ink">$1 First Month</h4>
          <p className="text-[11px] text-ink-secondary leading-normal">
            $1 trial on any tier for month 1, renews at full price.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setFormData({
              code: "GROWTH50",
              type: "PERCENT",
              value: 50,
              behavior: "THREE_MONTHS_REDUCED",
              duration: "REPEATING",
              durationMonths: 3,
              applicablePlanKey: "PRO",
              firstTimeOnly: false,
              notes: "50% off for 3 months promotion",
            });
            setShowCreateForm(true);
          }}
          className="p-4 rounded-2xl border border-line bg-white shadow-xs hover:border-line-strong hover:shadow transition-all text-left space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">⚡</span>
            <Badge variant="info">Type B</Badge>
          </div>
          <h4 className="font-bold text-xs text-ink">3 Months Reduced</h4>
          <p className="text-[11px] text-ink-secondary leading-normal">
            Fixed % discount repeating for 3 consecutive billing cycles.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setFormData({
              code: "SAVE20",
              type: "PERCENT",
              value: 20,
              behavior: "PERCENTAGE_OFF_ALL_TIERS",
              duration: "ONCE",
              applicablePlanKey: "ALL",
              firstTimeOnly: true,
              notes: "20% off all commercial tiers",
            });
            setShowCreateForm(true);
          }}
          className="p-4 rounded-2xl border border-line bg-white shadow-xs hover:border-line-strong hover:shadow transition-all text-left space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">🎯</span>
            <Badge variant="success">Type C</Badge>
          </div>
          <h4 className="font-bold text-xs text-ink">Flat % Across Tiers</h4>
          <p className="text-[11px] text-ink-secondary leading-normal">
            Universal % off regardless of selected subscription package.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setFormData({
              code: "AGENCYPROMO",
              type: "PERCENT",
              value: 30,
              behavior: "PLAN_SPECIFIC_MATCH",
              duration: "FOREVER",
              applicablePlanKey: "AGENCY",
              firstTimeOnly: false,
              notes: "30% lifetime Agency discount",
            });
            setShowCreateForm(true);
          }}
          className="p-4 rounded-2xl border border-line bg-white shadow-xs hover:border-line-strong hover:shadow transition-all text-left space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">🏢</span>
            <Badge variant="neutral">Type D</Badge>
          </div>
          <h4 className="font-bold text-xs text-ink">Plan-Specific Match</h4>
          <p className="text-[11px] text-ink-secondary leading-normal">
            Applies strictly to a target plan with lifetime or recurring validity.
          </p>
        </button>
      </div>

      {/* Creation Form Modal / Card */}
      {showCreateForm && (
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl border border-line bg-white shadow-md space-y-5"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#0E8F5D]" />
              <span>Configure Commercial Coupon</span>
            </h3>
            <Badge variant="neutral">New Promotion</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink block mb-1">Coupon Code (Uppercase)</label>
              <input
                type="text"
                required
                placeholder="e.g. LAUNCH2026"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full text-xs font-mono font-bold bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">Discount Calculation</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "PERCENT" | "FIXED" })}
                className="w-full text-xs bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
              >
                <option value="PERCENT">Percentage (%) Off</option>
                <option value="FIXED">Fixed Dollar ($) Off</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">
                Discount Value {formData.type === "PERCENT" ? "(%)" : "($ USD)"}
              </label>
              <input
                type="number"
                min="0"
                max={formData.type === "PERCENT" ? 100 : 1000}
                value={formData.value ?? 0}
                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">Duration Cycle</label>
              <select
                value={formData.duration || "ONCE"}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full text-xs bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
              >
                <option value="ONCE">Once (Applied to first invoice)</option>
                <option value="REPEATING">Repeating (Multiple consecutive months)</option>
                <option value="FOREVER">Forever (All recurring monthly invoices)</option>
              </select>
            </div>

            {formData.duration === "REPEATING" && (
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Repeating Months</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.durationMonths ?? 3}
                  onChange={(e) => setFormData({ ...formData, durationMonths: Number(e.target.value) })}
                  className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">Applicable Tier</label>
              <select
                value={formData.applicablePlanKey || "ALL"}
                onChange={(e) => setFormData({ ...formData, applicablePlanKey: e.target.value })}
                className="w-full text-xs bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
              >
                <option value="ALL">All Commercial Tiers</option>
                <option value="STARTER">Starter Plan Only</option>
                <option value="PRO">Pro Plan Only</option>
                <option value="AGENCY">Agency Plan Only</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink block mb-1">Max Redemptions</label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited if empty"
                value={formData.maxRedemptions ?? ""}
                onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value ? Number(e.target.value) : null })}
                className="w-full text-xs font-mono bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink block mb-1">Campaign Notes / Channel</label>
            <input
              type="text"
              placeholder="e.g. YouTube influencer partnership / Black Friday 2026"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full text-xs bg-[#FAFAF8] border border-line px-3 py-2 rounded-xl text-ink focus:bg-white focus:outline-none focus:border-[#0E8F5D]"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-line">
            <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={formData.firstTimeOnly}
                onChange={(e) => setFormData({ ...formData, firstTimeOnly: e.target.checked })}
                className="rounded border-line text-[#0E8F5D] accent-[#0E8F5D]"
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
      <div className="rounded-2xl border border-line bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-[#FAFAF8] text-ink-secondary">
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Coupon Code</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Behavior & Value</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Target Plan</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Duration</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Redemptions</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-ink-tertiary">
                    No commercial coupons created yet. Click &quot;Create Coupon Code&quot; to add your first promotion.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-ink">{coupon.code}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(coupon.code)}
                          className="text-ink-tertiary hover:text-ink p-1 rounded hover:bg-white"
                          title="Copy Code"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-3.5 h-3.5 text-[#0E8F5D]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {coupon.notes && <p className="text-[11px] text-ink-tertiary mt-0.5">{coupon.notes}</p>}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-ink">
                      {getBehaviorLabel(coupon.behavior, coupon.type, coupon.value)}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-ink-secondary">
                      {coupon.applicablePlanKey || "ALL PLANS"}
                    </td>

                    <td className="py-3.5 px-4 text-ink">
                      {coupon.duration === "REPEATING"
                        ? `${coupon.durationMonths || 1} Months`
                        : coupon.duration || "ONCE"}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-ink">
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
                        className="text-ink-tertiary hover:text-red-600 p-1.5 rounded-lg transition-colors"
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
