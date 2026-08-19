"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  Sparkles,
  ArrowRight,
  HelpCircle,
  ShieldCheck,
  Layers,
  Search,
  Radar,
  FileText,
  Store,
  Users,
  Lock,
} from "lucide-react";
import { Button, Card, Badge, Heading, Text } from "@/components/ui";
import { PLAN_DEFINITIONS, PlanTierKey } from "@/services/plans/plan-capabilities";

interface PricingClientProps {
  initialTier?: PlanTierKey;
}

interface FeatureComparisonRow {
  name: string;
  category: "Research Engine" | "Intelligence & Strategy" | "Execution & Drafts" | "Store Operations & Scale";
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
  agency: string | boolean;
}

// Every cell below that corresponds to a real PLAN_DEFINITIONS quota field
// is derived live from it, not re-typed as a second, independently-drifting
// literal — this table sits a few hundred pixels under the plan cards
// above, which already read PLAN_DEFINITIONS directly, so a hand-typed
// number here would silently disagree the moment PLAN_DEFINITIONS changes.
// Only genuinely editorial/qualitative cells (no numeric counterpart in
// PLAN_DEFINITIONS — e.g. "Full Unit Economics", team seats) stay hardcoded.
function perMo(n: number): string {
  return `${n.toLocaleString()} / mo`;
}
function count(n: number, noun: string): string {
  return `${n.toLocaleString()} ${noun}${n === 1 ? "" : "s"}`;
}

function buildComparisonRows(): FeatureComparisonRow[] {
  const { FREE, STARTED, PRO, AGENCY } = PLAN_DEFINITIONS;

  return [
    // 1. Research Engine
    { name: "Monthly Keyword Searches", category: "Research Engine", free: perMo(FREE.limits.monthlyKeywordSearches), starter: perMo(STARTED.limits.monthlyKeywordSearches), pro: perMo(PRO.limits.monthlyKeywordSearches), agency: perMo(AGENCY.limits.monthlyKeywordSearches) },
    { name: "Monthly Product Researches", category: "Research Engine", free: perMo(FREE.limits.monthlyProductResearches), starter: perMo(STARTED.limits.monthlyProductResearches), pro: perMo(PRO.limits.monthlyProductResearches), agency: perMo(AGENCY.limits.monthlyProductResearches) },
    { name: "Opportunity Radar Access", category: "Research Engine", free: "Sample Only", starter: true, pro: true, agency: true },
    { name: "Category Hunting & Taxonomy Mining", category: "Research Engine", free: "Top 3 Branches", starter: true, pro: true, agency: true },
    { name: "SEO Audit Diagnostics", category: "Research Engine", free: perMo(FREE.limits.monthlySeoAudits), starter: perMo(STARTED.limits.monthlySeoAudits), pro: perMo(PRO.limits.monthlySeoAudits), agency: perMo(AGENCY.limits.monthlySeoAudits) },

    // 2. Intelligence & Strategy
    { name: "Composite Opportunity Scoring (0-100)", category: "Intelligence & Strategy", free: "Basic Score", starter: "Explainable Inputs", pro: "Full Unit Economics", agency: "Full Unit Economics" },
    { name: "Tracked Competitor Shops", category: "Intelligence & Strategy", free: count(FREE.limits.trackedCompetitorShops, "Shop"), starter: count(STARTED.limits.trackedCompetitorShops, "Shop"), pro: count(PRO.limits.trackedCompetitorShops, "Shop"), agency: count(AGENCY.limits.trackedCompetitorShops, "Shop") },
    { name: "Longitudinal 6h / 24h / 7d Deltas", category: "Intelligence & Strategy", free: false, starter: true, pro: true, agency: true },
    { name: "Market Intelligence Live Signals Feed", category: "Intelligence & Strategy", free: "Sample", starter: true, pro: true, agency: true },
    { name: "Seller Health Score & Factor Diagnostics", category: "Intelligence & Strategy", free: "Basic", starter: true, pro: true, agency: true },

    // 3. Execution & Drafts
    { name: "Workspace Planner Capacity", category: "Execution & Drafts", free: count(FREE.limits.activePlannerItems, "Item"), starter: count(STARTED.limits.activePlannerItems, "Item"), pro: count(PRO.limits.activePlannerItems, "Item"), agency: count(AGENCY.limits.activePlannerItems, "Item") },
    { name: "6-Pillar Listing Strategy Blueprint", category: "Execution & Drafts", free: false, starter: true, pro: true, agency: true },
    { name: "13-Tag Keyword Cluster Builder", category: "Execution & Drafts", free: "Sample", starter: true, pro: true, agency: true },
    { name: "Listing Content Assistant (10-Part Desc)", category: "Execution & Drafts", free: perMo(FREE.limits.monthlyAiListingGenerations), starter: perMo(STARTED.limits.monthlyAiListingGenerations), pro: perMo(PRO.limits.monthlyAiListingGenerations), agency: perMo(AGENCY.limits.monthlyAiListingGenerations) },
    { name: "Etsy Draft Creation & Review Gate (Rule 9)", category: "Execution & Drafts", free: false, starter: count(STARTED.limits.connectedEtsyStores, "Store"), pro: count(PRO.limits.connectedEtsyStores, "Store"), agency: count(AGENCY.limits.connectedEtsyStores, "Store") },

    // 4. Store Operations & Scale
    { name: "Connected Etsy Storefronts", category: "Store Operations & Scale", free: count(FREE.limits.connectedEtsyStores, "Store"), starter: count(STARTED.limits.connectedEtsyStores, "Store"), pro: count(PRO.limits.connectedEtsyStores, "Store"), agency: count(AGENCY.limits.connectedEtsyStores, "Store") },
    { name: "Post-Publish Listing Intelligence & Drift", category: "Store Operations & Scale", free: false, starter: "Basic", pro: "Automated Alerts", agency: "Priority Multi-Store" },
    { name: "Data Export (CSV & JSON)", category: "Store Operations & Scale", free: FREE.limits.exportEnabled, starter: STARTED.limits.exportEnabled, pro: PRO.limits.exportEnabled, agency: AGENCY.limits.exportEnabled },
    { name: "Team Seats & Multi-User Access", category: "Store Operations & Scale", free: "1 User", starter: "1 User", pro: "3 Users", agency: "15 Users" },
  ];
}

const COMPARISON_ROWS: FeatureComparisonRow[] = buildComparisonRows();

export function PricingClient({ initialTier = "PRO" }: PricingClientProps) {
  const [billingPeriod, setBillingPeriod] = useState<"MONTHLY" | "ANNUAL">("ANNUAL");

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-4">
        <Badge variant="success" className="mx-auto">
          <Sparkles className="h-3.5 w-3.5 mr-1.5 inline text-[#FFB020]" />
          Seller Operating System · Transparent Pricing
        </Badge>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#141B16]">
          Seller intelligence that turns research into action.
        </h1>

        <p className="text-base sm:text-lg text-[#525B55] leading-relaxed">
          From first market discovery to live Etsy listing drafts and post-publish performance monitoring — choose the plan tailored to your catalog scale.
        </p>

        {/* Monthly vs Annual Billing Period Toggle */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-xs font-bold ${billingPeriod === "MONTHLY" ? "text-ink" : "text-ink-tertiary"}`}>
            Monthly Billing
          </span>

          <button
            type="button"
            onClick={() => setBillingPeriod((p) => (p === "MONTHLY" ? "ANNUAL" : "MONTHLY"))}
            className="relative inline-flex h-6 w-12 items-center rounded-full bg-[#141B16] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0E8F5D] focus:ring-offset-2"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                billingPeriod === "ANNUAL" ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>

          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold ${billingPeriod === "ANNUAL" ? "text-ink" : "text-ink-tertiary"}`}>
              Annual Billing
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7FAF1] text-[#0E8F5D] border border-[#16C784]/30">
              Save 20%
            </span>
          </div>
        </div>
      </div>

      {/* 4 Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {(["FREE", "STARTED", "PRO", "AGENCY"] as PlanTierKey[]).map((tierKey) => {
          const plan = PLAN_DEFINITIONS[tierKey];
          const isPro = tierKey === "PRO";
          const isFree = tierKey === "FREE";
          const price = billingPeriod === "ANNUAL" ? plan.priceAnnualMonthlyUsd : plan.priceMonthlyUsd;

          return (
            <Card
              key={tierKey}
              padding="lg"
              className={`relative flex flex-col justify-between rounded-2xl bg-white transition-all ${
                isPro
                  ? "border-[#0E8F5D] ring-2 ring-[#0E8F5D]/30 shadow-xl scale-[1.02] z-10"
                  : "border-line shadow-xs hover:border-[#0E8F5D]/40"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0E8F5D] px-3 py-0.5 text-[11px] font-bold text-white shadow-xs">
                  {plan.badge}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                  <div className="text-[11px] font-semibold text-[#0E8F5D] mt-0.5">
                    &ldquo;{plan.outcome}&rdquo;
                  </div>
                  <p className="text-xs text-ink-tertiary mt-1 min-h-[32px]">{plan.description}</p>
                </div>

                <div className="border-b border-line pb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-ink">${price}</span>
                    <span className="text-xs font-semibold text-ink-tertiary">
                      {isFree ? "forever" : "/month"}
                    </span>
                  </div>
                  {!isFree && billingPeriod === "ANNUAL" && (
                    <div className="text-[10px] text-[#0E8F5D] font-semibold mt-0.5">
                      Billed annually (${price * 12}/year)
                    </div>
                  )}
                </div>

                {/* Limits Snapshot */}
                <div className="space-y-2 text-xs text-ink-secondary">
                  <div className="font-bold text-ink text-[11px] uppercase tracking-wider">
                    Included Quotas:
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0" />
                    <span><strong>{plan.limits.monthlyKeywordSearches.toLocaleString()}</strong> Keyword Searches/mo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0" />
                    <span><strong>{plan.limits.monthlyProductResearches.toLocaleString()}</strong> Product Researches/mo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0" />
                    <span><strong>{plan.limits.trackedCompetitorShops}</strong> Tracked Competitor Shops</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0" />
                    <span><strong>{plan.limits.activePlannerItems}</strong> Active Planner Opportunities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0" />
                    <span><strong>{plan.limits.connectedEtsyStores}</strong> Connected Etsy Storefronts</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line">
                <Link
                  href={
                    isFree
                      ? "/signup"
                      : isPro
                      ? `/checkout?plan=PRO`
                      : `/checkout?plan=${tierKey}`
                  }
                  className="block w-full"
                >
                  <Button
                    variant="primary"
                    fullWidth
                    className={`text-xs font-bold py-2.5 ${
                      isPro
                        ? "bg-[#0E8F5D] hover:bg-[#0C7A52] text-white shadow-sm"
                        : "bg-[#141B16] hover:bg-[#141B16]/90 text-white"
                    }`}
                  >
                    <span>{isFree ? "Start Free Explorer" : `Choose ${plan.name}`}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1 inline" />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="space-y-6 pt-8">
        <div className="text-center space-y-2">
          <Heading as="h2" size="h2">Detailed Feature &amp; Capability Matrix</Heading>
          <Text size="body-md" color="secondary">
            Compare granular research limits, strategy blueprints, and store automation capabilities across plans.
          </Text>
        </div>

        <div className="border border-line rounded-2xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#FAFAF8] border-b border-line text-ink font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5 w-1/3">Feature / Capability</th>
                <th className="p-3.5 text-center">Free Explorer</th>
                <th className="p-3.5 text-center">Starter ($19)</th>
                <th className="p-3.5 text-center bg-[#E7FAF1]/50 text-[#0E8F5D]">Pro ($49) ★</th>
                <th className="p-3.5 text-center">Agency ($199)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-muted transition">
                  <td className="p-3.5 font-bold text-ink">
                    <div>{row.name}</div>
                    <div className="text-[10px] text-ink-tertiary font-normal">{row.category}</div>
                  </td>
                  <td className="p-3.5 text-center font-medium text-ink-secondary">
                    {typeof row.free === "boolean" ? (
                      row.free ? <Check className="h-4 w-4 text-[#0E8F5D] mx-auto" /> : <Lock className="h-3.5 w-3.5 text-ink-tertiary mx-auto opacity-40" />
                    ) : (
                      row.free
                    )}
                  </td>
                  <td className="p-3.5 text-center font-medium text-ink-secondary">
                    {typeof row.starter === "boolean" ? (
                      row.starter ? <Check className="h-4 w-4 text-[#0E8F5D] mx-auto" /> : <Lock className="h-3.5 w-3.5 text-ink-tertiary mx-auto opacity-40" />
                    ) : (
                      row.starter
                    )}
                  </td>
                  <td className="p-3.5 text-center font-bold text-[#0E8F5D] bg-[#E7FAF1]/20">
                    {typeof row.pro === "boolean" ? (
                      row.pro ? <Check className="h-4 w-4 text-[#0E8F5D] mx-auto" /> : <Lock className="h-3.5 w-3.5 text-ink-tertiary mx-auto opacity-40" />
                    ) : (
                      row.pro
                    )}
                  </td>
                  <td className="p-3.5 text-center font-bold text-ink">
                    {typeof row.agency === "boolean" ? (
                      row.agency ? <Check className="h-4 w-4 text-[#0E8F5D] mx-auto" /> : <Lock className="h-3.5 w-3.5 text-ink-tertiary mx-auto opacity-40" />
                    ) : (
                      row.agency
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
