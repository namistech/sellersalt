"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Clock,
  ArrowRight,
  Store,
  Layers,
  Hash,
  ShoppingBag,
} from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { OpportunityItem, OpportunityType } from "@/marketplaces/core/discovery-types";

interface OpportunityCardProps {
  opportunity: OpportunityItem;
  onSaveToggle?: (opp: OpportunityItem) => void;
  onSelect?: (opp: OpportunityItem) => void;
}

const TYPE_ICONS: Record<OpportunityType, React.ReactNode> = {
  PRODUCT: <ShoppingBag className="w-3.5 h-3.5" />,
  KEYWORD: <Hash className="w-3.5 h-3.5" />,
  NICHE: <Layers className="w-3.5 h-3.5" />,
  CATEGORY: <Layers className="w-3.5 h-3.5" />,
  SELLER: <Store className="w-3.5 h-3.5" />,
  MARKETPLACE: <Activity className="w-3.5 h-3.5" />,
};

export function OpportunityCard({
  opportunity,
  onSaveToggle,
  onSelect,
}: OpportunityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(opportunity.isSaved || false);
  const [saving, setSaving] = useState(false);

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    try {
      if (isSaved) {
        await fetch(`/api/opportunities/${encodeURIComponent(opportunity.id)}/save`, {
          method: "DELETE",
        });
        setIsSaved(false);
      } else {
        await fetch(`/api/opportunities/${encodeURIComponent(opportunity.id)}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(opportunity),
        });
        setIsSaved(true);
      }
      onSaveToggle?.(opportunity);
    } catch {
      // Ignore error
    } finally {
      setSaving(false);
    }
  };

  const scoreBadgeVariant: BadgeVariant =
    opportunity.score && opportunity.score >= 80
      ? "success"
      : opportunity.score && opportunity.score >= 65
      ? "warning"
      : "neutral";

  return (
    <Card
      onClick={() => onSelect?.(opportunity)}
      className="p-5 border rounded-xl bg-card hover:border-primary/40 transition-all cursor-pointer space-y-4 shadow-sm"
    >
      {/* 1. Top Badges & Save Action */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral" className="capitalize text-[11px] flex items-center gap-1 font-semibold">
            {TYPE_ICONS[opportunity.type]}
            {opportunity.type}
          </Badge>
          <Badge variant="neutral" className="capitalize text-[11px]">
            {opportunity.marketplace}
          </Badge>
          {opportunity.momentum && opportunity.momentum !== "INSUFFICIENT_DATA" && (
            <Badge
              variant={
                opportunity.momentum === "RISING" || opportunity.momentum === "ACCELERATING"
                  ? "success"
                  : opportunity.momentum === "STABLE"
                  ? "info"
                  : "warning"
              }
              className="text-[10px] flex items-center gap-1"
            >
              {opportunity.momentum === "RISING" || opportunity.momentum === "ACCELERATING" ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <Activity className="w-3 h-3" />
              )}
              {opportunity.momentum}
            </Badge>
          )}
        </div>

        <button
          type="button"
          onClick={handleSaveClick}
          disabled={saving}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title={isSaved ? "Remove from watchlist" : "Save to watchlist"}
        >
          {isSaved ? (
            <BookmarkCheck className="w-4 h-4 text-primary fill-primary/20" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 2. Main Title & Score Block */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <h3 className="text-base font-bold text-foreground line-clamp-2 leading-snug">
            {opportunity.title}
          </h3>
          {opportunity.subtitle && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {opportunity.subtitle}
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-2xl font-black text-foreground">
              {opportunity.score !== null ? opportunity.score : "—"}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          <span className="text-[11px] text-muted-foreground block">
            {opportunity.confidence}% confidence
          </span>
        </div>
      </div>

      {/* 3. Verdict Banner */}
      <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-semibold text-foreground">
            {opportunity.verdict}
          </span>
        </div>
        <Badge variant={opportunity.verdictVariant} className="text-[10px]">
          {opportunity.tier}
        </Badge>
      </div>

      {/* 4. Evidence Summary & Expand Toggle */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {opportunity.supportingSignals.length} supporting • {opportunity.negativeSignals.length} risks
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex items-center gap-1 text-primary hover:underline font-medium"
          >
            {expanded ? "Hide Evidence" : "View Evidence"}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {expanded && (
          <div className="p-3.5 rounded-lg bg-card border border-border text-xs space-y-3 pt-3">
            {/* Why Positive */}
            {opportunity.explanation.whyPositive.length > 0 && (
              <div className="space-y-1">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 block text-[11px]">
                  Positive Evidence:
                </span>
                <ul className="space-y-1 list-disc pl-4 text-muted-foreground text-[11px]">
                  {opportunity.explanation.whyPositive.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Watch Risks */}
            {opportunity.explanation.watchNegative.length > 0 && (
              <div className="space-y-1">
                <span className="font-semibold text-amber-600 dark:text-amber-400 block text-[11px]">
                  Risk / Friction Points:
                </span>
                <ul className="space-y-1 list-disc pl-4 text-muted-foreground text-[11px]">
                  {opportunity.explanation.watchNegative.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unknown Signals */}
            {opportunity.explanation.unknownSignals.length > 0 && (
              <div className="space-y-1 pt-1 border-t">
                <span className="font-semibold text-muted-foreground block text-[11px] flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  Unobserved / Unknown Signals:
                </span>
                <ul className="space-y-1 list-disc pl-4 text-muted-foreground/80 text-[10px]">
                  {opportunity.explanation.unknownSignals.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Action & Validation Button */}
            <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
              <div className="flex-1">
                <span className="font-semibold text-foreground mr-1">Next Action:</span>
                <span className="text-muted-foreground">{opportunity.explanation.recommendedAction}</span>
              </div>
              <a
                href={`/validate?q=${encodeURIComponent(opportunity.title)}&marketplace=${encodeURIComponent(opportunity.marketplace)}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold text-[10px] hover:brightness-110 transition-all shrink-0"
              >
                Validate Product
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
