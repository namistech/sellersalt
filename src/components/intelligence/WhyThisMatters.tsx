"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, HelpCircle, ArrowRight, ShieldCheck } from "lucide-react";
import type { NextBestAction } from "@/services/intelligence/next-best-action";
import { DataProvenanceBadge } from "@/components/data/DataProvenanceBadge";

export interface WhyThisMattersProps {
  action: NextBestAction;
  defaultExpanded?: boolean;
  compact?: boolean;
  className?: string;
}

export function WhyThisMatters({
  action,
  defaultExpanded = false,
  compact = false,
  className = "",
}: WhyThisMattersProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (compact) {
    return (
      <div className={`p-3 rounded-xl bg-[#1C261F] border border-[#2A362D] space-y-2 text-sm ${className}`}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#16C784] flex items-center gap-1.5 text-label-sm uppercase tracking-wider">
            <span>{action.icon}</span> Why This Matters
          </span>
          <DataProvenanceBadge type={action.provenance} />
        </div>
        <p className="text-white text-sm leading-relaxed">
          <strong className="text-[#16C784]">Signal:</strong> {action.signal}
        </p>
        <p className="text-[#9EAA9F] text-sm leading-relaxed">
          <strong className="text-white">Action:</strong> {action.whyYouShouldCare}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-[#2A362D] bg-[#141B16] overflow-hidden text-sm transition-all ${className}`}>
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between bg-[#1A231C] hover:bg-[#202C23] text-left transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{action.icon}</span>
          <span className="font-bold text-white text-sm uppercase tracking-wider">
            Why This Matters: {action.headline}
          </span>
          <DataProvenanceBadge type={action.provenance} />
        </div>
        <div className="flex items-center gap-2 text-[#9EAA9F]">
          <span className="text-label-sm hidden sm:inline">
            {expanded ? "Hide Reasoning" : "Explain Reasoning"}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded Reasoning Body */}
      {expanded && (
        <div className="p-4 space-y-3.5 bg-[#141B16] border-t border-[#2A362D]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. Signal */}
            <div className="p-3 rounded-lg bg-[#1C261F] border border-[#2A362D]/70 space-y-1">
              <span className="text-label-sm font-bold uppercase tracking-wider text-[#FFB020] flex items-center gap-1">
                📡 Observed Signal
              </span>
              <p className="text-white text-sm leading-relaxed">
                {action.signal}
              </p>
            </div>

            {/* 2. Interpretation */}
            <div className="p-3 rounded-lg bg-[#1C261F] border border-[#2A362D]/70 space-y-1">
              <span className="text-label-sm font-bold uppercase tracking-wider text-[#16C784] flex items-center gap-1">
                🧠 Intelligence Interpretation
              </span>
              <p className="text-[#9EAA9F] text-sm leading-relaxed">
                {action.interpretation}
              </p>
            </div>

            {/* 3. Why You Should Care */}
            <div className="p-3 rounded-lg bg-[#1C261F] border border-[#2A362D]/70 space-y-1">
              <span className="text-label-sm font-bold uppercase tracking-wider text-[#4E9FFF] flex items-center gap-1">
                🎯 Why You Should Care
              </span>
              <p className="text-white text-sm leading-relaxed">
                {action.whyYouShouldCare}
              </p>
            </div>

            {/* 4. Recommended Action */}
            <div className="p-3 rounded-lg bg-[#1C261F] border border-[#2A362D]/70 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-label-sm font-bold uppercase tracking-wider text-[#16C784] flex items-center gap-1">
                  ⚡ Recommended Action
                </span>
                <span className="text-label-sm font-mono text-[#9EAA9F]">
                  Est. Impact: {action.scoreImpactEstimated}
                </span>
              </div>
              <p className="text-white font-medium text-sm leading-relaxed">
                {action.actionLabel}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
