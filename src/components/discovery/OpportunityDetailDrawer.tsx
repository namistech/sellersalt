"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Bookmark,
  Check,
  Compass,
  Search,
  Layers,
  ArrowRight,
  Boxes,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { AutonomousOpportunityItem } from "@/marketplaces/core/autonomous-discovery-types";
import { useRouter } from "next/navigation";

interface OpportunityDetailDrawerProps {
  opportunity: AutonomousOpportunityItem | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function OpportunityDetailDrawer({
  opportunity,
  onClose,
  onSaved,
}: OpportunityDetailDrawerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(opportunity?.isSaved || false);

  if (!opportunity) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/discovery/opportunities/${encodeURIComponent(opportunity.id)}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity }),
      });
      if (res.ok) {
        setIsSaved(true);
        if (onSaved) onSaved();
      }
    } catch {
      // Degrade cleanly
    } finally {
      setSaving(false);
    }
  };

  const handleResearch = () => {
    router.push(`/research-center?query=${encodeURIComponent(opportunity.title)}&marketplace=${opportunity.marketplace}`);
  };

  const handleValidate = () => {
    router.push(`/validate?query=${encodeURIComponent(opportunity.title)}&marketplace=${opportunity.marketplace}`);
  };

  const handleWorkspace = () => {
    router.push(`/product-workspaces/${encodeURIComponent(opportunity.title)}`);
  };

  const { score, confidence, explanation, signals } = opportunity;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card border-l h-full overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-label-sm uppercase font-bold">
                {opportunity.type.replace(/_/g, " ")}
              </Badge>
              <Badge variant="neutral" className="text-label-sm capitalize">
                {opportunity.marketplace}
              </Badge>
              <Badge
                variant={
                  opportunity.momentum === "ACCELERATING"
                    ? "success"
                    : opportunity.momentum === "RISING"
                    ? "info"
                    : "neutral"
                }
                className="text-label-sm"
              >
                {opportunity.momentum}
              </Badge>
            </div>
            <h2 className="text-xl font-black text-foreground pt-1">{opportunity.title}</h2>
            <p className="text-sm text-muted-foreground">{opportunity.subtitle}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score & Confidence Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-card border text-center space-y-1">
            <span className="text-label-sm text-muted-foreground uppercase font-bold block">Opportunity</span>
            <span className="text-2xl font-black text-primary">{score.compositeScore}/100</span>
          </div>

          <div className="p-4 rounded-xl bg-card border text-center space-y-1">
            <span className="text-label-sm text-muted-foreground uppercase font-bold block">Confidence</span>
            <span className="text-2xl font-black text-foreground">{confidence.confidenceScore}%</span>
            <span className="text-meta text-muted-foreground block">{confidence.confidenceTier}</span>
          </div>

          <div className="p-4 rounded-xl bg-card border text-center space-y-1">
            <span className="text-label-sm text-muted-foreground uppercase font-bold block">Demand Score</span>
            <span className="text-xl font-black text-foreground">{score.demandScore}/25</span>
          </div>

          <div className="p-4 rounded-xl bg-card border text-center space-y-1">
            <span className="text-label-sm text-muted-foreground uppercase font-bold block">Competition</span>
            <span className="text-xl font-black text-foreground">{score.competitionAttractivenessScore}/25</span>
          </div>
        </div>

        {/* Verdict & Why Found */}
        <Card className="p-5 border rounded-xl bg-muted/20 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Why SellerSalt Found This Opportunity</h3>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{explanation.whyFound}</p>
          <div className="flex items-center gap-2 pt-2 border-t text-meta text-muted-foreground">
            <strong>Verdict:</strong>
            <Badge
              variant={
                explanation.verdict === "HIGH_OPPORTUNITY"
                  ? "success"
                  : explanation.verdict === "WORTH_INVESTIGATING"
                  ? "info"
                  : "neutral"
              }
              className="text-label-sm"
            >
              {explanation.verdict.replace(/_/g, " ")}
            </Badge>
          </div>
        </Card>

        {/* Observed Evidence */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Observed Market Evidence
          </h3>
          <ul className="space-y-1.5 list-disc pl-4 text-sm text-muted-foreground">
            {explanation.observedEvidence.map((ev, i) => (
              <li key={i}>{ev}</li>
            ))}
          </ul>
        </div>

        {/* Derived Signals */}
        {explanation.derivedSignals.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              Derived Strategic Signals
            </h3>
            <ul className="space-y-1.5 list-disc pl-4 text-sm text-muted-foreground">
              {explanation.derivedSignals.map((sig, i) => (
                <li key={i}>{sig}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Known Limitations & Unknowns */}
        <Card className="p-4 border rounded-xl bg-card space-y-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            Zero-Fabrication Disclosures & Unknowns
          </h3>
          <ul className="space-y-1 list-disc pl-4 text-sm text-muted-foreground">
            {confidence.unknownSignals.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </Card>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
          <Button onClick={handleWorkspace} size="default" variant="primary" className="text-xs font-bold">
            <Boxes className="w-4 h-4 mr-1.5" />
            Open Opportunity Workspace
          </Button>

          <Button onClick={handleValidate} size="default" variant="secondary" className="text-xs">
            <Compass className="w-4 h-4 mr-1.5" />
            Validate Product
          </Button>

          <Button onClick={handleResearch} size="default" variant="secondary" className="text-xs">
            <Search className="w-4 h-4 mr-1.5" />
            Research Center
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || isSaved}
            size="default"
            variant="secondary"
            className="text-xs ml-auto"
          >
            {isSaved ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Bookmark className="w-4 h-4 mr-1.5" />}
            {isSaved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
