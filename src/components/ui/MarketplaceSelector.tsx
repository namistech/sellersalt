"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "./Badge";
import type { MarketplaceListItem } from "@/app/api/marketplaces/route";

// Previously backed by a hardcoded, static marketplace-definitions map — now
// reads live from GET /api/marketplaces, which reflects
// src/marketplaces/core/registry's actual registered connectors and their
// real capability flags. A marketplace only renders "active" here once its
// connector's `research` capability is genuinely true — no UI dropdown in
// this app hardcodes the marketplace list anymore.
//
// Research-context marketplaces only: Shopify/WooCommerce are seller
// channels (own-store connect), not public-research marketplaces, so they
// are intentionally excluded from this picker even though they're
// registered connectors.
const RESEARCH_MARKETPLACE_IDS = ["etsy", "amazon", "ebay", "tiktok_shop"] as const;
export type ResearchMarketplaceId = (typeof RESEARCH_MARKETPLACE_IDS)[number];
/** "all" is a first-class selector value, not a registry entry — it means
 * "fan this request out across every research-capable marketplace" (see
 * POST /api/marketplaces/research), not a marketplace itself. */
export type MarketplaceSelectValue = ResearchMarketplaceId | "all";

const ICONS: Record<ResearchMarketplaceId, string> = {
  etsy: "🛍️",
  amazon: "📦",
  ebay: "🏷️",
  tiktok_shop: "📱",
};

interface MarketplaceSelectorProps {
  selectedId?: MarketplaceSelectValue;
  onChange?: (id: MarketplaceSelectValue) => void;
  className?: string;
  /** Show the "All Marketplaces" pill. Defaults on — pass false for a
   * context that genuinely needs one specific marketplace only. */
  allowAll?: boolean;
}

export function MarketplaceSelector({
  selectedId = "etsy",
  onChange,
  className = "",
  allowAll = true,
}: MarketplaceSelectorProps) {
  const [activeMarketplace, setActiveMarketplace] = useState<MarketplaceSelectValue>(selectedId);
  const [tooltipMarketplace, setTooltipMarketplace] = useState<string | null>(null);
  const [marketplaces, setMarketplaces] = useState<MarketplaceListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/marketplaces")
      .then((res) => res.json())
      .then((data: { marketplaces: MarketplaceListItem[] }) => {
        if (cancelled) return;
        const filtered = (data.marketplaces || []).filter((m): m is MarketplaceListItem & { id: ResearchMarketplaceId } =>
          (RESEARCH_MARKETPLACE_IDS as readonly string[]).includes(m.id)
        );
        setMarketplaces(filtered);
      })
      .catch(() => {
        // Fail closed to an empty list rather than fabricating marketplace
        // availability if the registry endpoint is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleClick(m: MarketplaceListItem) {
    const isActive = m.capabilities.research === true;
    if (!isActive) {
      setTooltipMarketplace(m.displayName);
      setTimeout(() => setTooltipMarketplace(null), 3000);
      return;
    }
    const id = m.id as ResearchMarketplaceId;
    setActiveMarketplace(id);
    onChange?.(id);
  }

  function handleSelectAll() {
    setActiveMarketplace("all");
    onChange?.("all");
  }

  const liveCount = marketplaces.filter((m) => m.capabilities.research === true).length;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[#FAFAF8] rounded-xl border border-line shadow-2xs">
        {allowAll && (
          <button
            type="button"
            onClick={handleSelectAll}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              activeMarketplace === "all"
                ? "bg-white text-ink shadow-xs border border-line font-bold"
                : "text-ink-secondary hover:text-ink hover:bg-white/60 bg-transparent"
            }`}
            title={`Search across every marketplace with live research (currently ${liveCount})`}
          >
            <span className="text-sm leading-none">🌐</span>
            <span>All Marketplaces</span>
          </button>
        )}
        {marketplaces.map((m) => {
          const liveNow = m.capabilities.research === true;
          const isActive = activeMarketplace === m.id && liveNow;
          const isDisabled = !liveNow;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleClick(m)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? "bg-white text-ink shadow-xs border border-line font-bold"
                  : isDisabled
                  ? "text-ink-tertiary/70 opacity-60 hover:opacity-90 cursor-not-allowed bg-transparent"
                  : "text-ink-secondary hover:text-ink hover:bg-white/60 bg-transparent"
              }`}
              title={
                isDisabled
                  ? `${m.displayName}: Research not yet available — ${m.status === "ARCHITECTURE_READY" ? "connector architecture exists, no live API integration yet" : "partial connector, research not yet implemented"}.`
                  : m.displayName
              }
            >
              <span className="text-sm leading-none">{ICONS[m.id as ResearchMarketplaceId] ?? "🏪"}</span>
              <span>{m.displayName}</span>
              {liveNow ? (
                <span className="h-1.5 w-1.5 rounded-full bg-[#16C784]" />
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-muted border border-line text-ink-tertiary">
                  {m.status === "ARCHITECTURE_READY" ? "Coming soon" : "Partial"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Non-intrusive notification when clicking an unavailable marketplace */}
      {tooltipMarketplace && (
        <div className="text-[11px] text-ink-secondary bg-surface-muted border border-line px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-fadeIn">
          <span>ℹ️</span>
          <span>
            <strong>{tooltipMarketplace}</strong> research is not yet available. Full product research and listing intelligence are currently live on <strong>Etsy</strong>.
          </span>
        </div>
      )}
    </div>
  );
}
