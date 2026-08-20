"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Sparkles, Compass, Flame, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { MarketplaceId } from "@/marketplaces/core/types";

interface UnifiedSearchEntryProps {
  initialQuery?: string;
  defaultMode?: "research" | "validate" | "workspace" | "radar";
  onSearchSubmit?: (query: string, marketplaces: MarketplaceId[]) => void;
  className?: string;
}

const SAMPLE_SUGGESTIONS = [
  "wooden desk organizer",
  "personalized wedding gifts",
  "minimalist ceramic dripper",
  "leather passport wallet",
  "linen kitchen towels",
  "scented soy candles",
];

const AVAILABLE_MARKETPLACES: Array<{ id: MarketplaceId; name: string; status: "ACTIVE" | "RESTRICTED" }> = [
  { id: "etsy", name: "Etsy", status: "ACTIVE" },
  { id: "amazon", name: "Amazon", status: "ACTIVE" },
  { id: "ebay", name: "eBay", status: "ACTIVE" },
  { id: "walmart", name: "Walmart", status: "ACTIVE" },
];

export function UnifiedSearchEntry({
  initialQuery = "",
  defaultMode = "research",
  onSearchSubmit,
  className = "",
}: UnifiedSearchEntryProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<MarketplaceId[]>(["etsy", "amazon"]);
  const [activeMode, setActiveMode] = useState<"research" | "validate" | "workspace" | "radar">(defaultMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMarketplace = (mp: MarketplaceId) => {
    setSelectedMarketplaces((prev) =>
      prev.includes(mp)
        ? prev.length > 1
          ? prev.filter((m) => m !== mp)
          : prev
        : [...prev, mp]
    );
  };

  const handleExecute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    if (onSearchSubmit) {
      onSearchSubmit(cleanQuery, selectedMarketplaces);
      return;
    }

    setIsSubmitting(true);
    const encoded = encodeURIComponent(cleanQuery);
    const mps = selectedMarketplaces.join(",");

    switch (activeMode) {
      case "validate":
        router.push(`/validate?q=${encoded}&marketplaces=${mps}`);
        break;
      case "workspace":
        router.push(`/product-workspaces?q=${encoded}&marketplaces=${mps}`);
        break;
      case "radar":
        router.push(`/radar?q=${encoded}&marketplaces=${mps}`);
        break;
      case "research":
      default:
        router.push(`/research-center?q=${encoded}&marketplaces=${mps}`);
        break;
    }
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {/* Primary Input Container */}
      <form onSubmit={handleExecute} className="space-y-3">
        <div className="relative flex items-center shadow-lg rounded-2xl border-2 border-primary/20 bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all p-1.5">
          <div className="pl-3.5 pr-2 text-muted-foreground flex items-center">
            <Search className="w-5 h-5 text-primary" />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you thinking of selling? (e.g. wooden desk organizer)"
            className="flex-1 bg-transparent border-0 text-sm sm:text-base font-medium placeholder:text-muted-foreground focus:outline-hidden py-3 px-2 text-foreground"
          />

          <Button
            type="submit"
            disabled={!query.trim() || isSubmitting}
            size="default"
            variant="primary"
            className="shrink-0 font-bold text-xs sm:text-sm px-4 sm:px-6 rounded-xl"
          >
            <span>Run {activeMode === "validate" ? "Validation" : activeMode === "workspace" ? "Workspace" : "Research"}</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>

        {/* Workflow Mode Selector & Marketplace Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          {/* Mode Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveMode("research")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                activeMode === "research"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>1. Research Market</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("validate")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                activeMode === "validate"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>2. Validate Idea</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("workspace")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                activeMode === "workspace"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Product Workspace</span>
            </button>
          </div>

          {/* Marketplace Selector Chips */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium text-[11px]">Sources:</span>
            {AVAILABLE_MARKETPLACES.map((mp) => {
              const isSelected = selectedMarketplaces.includes(mp.id);
              return (
                <button
                  key={mp.id}
                  type="button"
                  onClick={() => toggleMarketplace(mp.id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all border ${
                    isSelected
                      ? "bg-muted/80 text-foreground border-primary/40 shadow-2xs"
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted/20 opacity-60"
                  }`}
                >
                  {mp.name}
                </button>
              );
            })}
          </div>
        </div>
      </form>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
        <span className="text-muted-foreground text-[11px] font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Try searching:
        </span>
        {SAMPLE_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuery(suggestion);
            }}
            className="px-2.5 py-1 rounded-lg border bg-muted/20 hover:bg-muted/50 hover:border-primary/40 text-foreground text-[11px] font-medium transition-all"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
