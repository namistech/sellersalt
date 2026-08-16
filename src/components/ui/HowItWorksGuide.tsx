"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { Badge } from "./Badge";
import { cn } from "./cn";

export interface GuideStep {
  title: string;
  description: string;
  badge?: string;
}

export interface HowItWorksGuideProps {
  title: string;
  description: string;
  steps: GuideStep[];
  isOpen?: boolean;
  onToggle?: () => void;
  defaultOpen?: boolean;
  className?: string;
  showTrigger?: boolean;
}

export interface HowItWorksToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function HowItWorksToggle({ isOpen, onToggle, className }: HowItWorksToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-secondary hover:text-ink bg-surface border border-line hover:border-line-strong hover:bg-surface-muted transition-all shadow-2xs shrink-0",
        isOpen && "border-[#0E8F5D] text-[#0E8F5D] bg-[#E7FAF1]/50",
        className
      )}
      aria-expanded={isOpen}
    >
      <HelpCircle className={cn("h-3.5 w-3.5 text-[#0E8F5D]", isOpen && "text-[#0E8F5D]")} />
      <span>{isOpen ? "Hide guide" : "How it works"}</span>
      {isOpen ? (
        <ChevronUp className="h-3.5 w-3.5 text-ink-tertiary" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary" />
      )}
    </button>
  );
}

export function HowItWorksGuide({
  title,
  description,
  steps,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  defaultOpen = false,
  className = "",
  showTrigger = false,
}: HowItWorksGuideProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const handleToggle = () => {
    if (isControlled && controlledOnToggle) {
      controlledOnToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {showTrigger && (
        <div className="flex items-center justify-end">
          <HowItWorksToggle isOpen={isOpen} onToggle={handleToggle} />
        </div>
      )}

      {isOpen && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-line shadow-xs space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start sm:items-center justify-between gap-3 pb-3 border-b border-line-subtle">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0E8F5D]" /> {title}
              </h3>
              <p className="text-xs text-ink-tertiary mt-0.5">{description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="text-[11px] font-bold hidden sm:inline-flex">
                SellerSalt Intelligence Guide
              </Badge>
              <button
                type="button"
                onClick={handleToggle}
                className="p-1 rounded-md text-ink-tertiary hover:text-ink hover:bg-surface-muted transition"
                aria-label="Close guide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-line-subtle bg-[#FAFAF8] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="h-5 w-5 rounded-full bg-[#E7FAF1] text-[#0E8F5D] font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  {step.badge && (
                    <span className="text-[10px] font-semibold text-ink-tertiary px-1.5 py-0.5 rounded bg-surface border border-line-subtle">
                      {step.badge}
                    </span>
                  )}
                </div>
                <div className="font-bold text-xs sm:text-sm text-ink">{step.title}</div>
                <p className="text-xs text-ink-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
