"use client";

import React, { useState } from "react";
import {
  MARKETPLACE_DEFINITIONS,
  type MarketplaceId,
  type MarketplaceDefinition,
} from "@/services/marketplaces/types";
import { Badge } from "./Badge";

interface MarketplaceSelectorProps {
  selectedId?: MarketplaceId;
  onChange?: (id: MarketplaceId) => void;
  className?: string;
}

export function MarketplaceSelector({
  selectedId = "etsy",
  onChange,
  className = "",
}: MarketplaceSelectorProps) {
  const [activeMarketplace, setActiveMarketplace] = useState<MarketplaceId>(selectedId);
  const [tooltipMarketplace, setTooltipMarketplace] = useState<string | null>(null);

  const marketplaces = Object.values(MARKETPLACE_DEFINITIONS);

  function handleClick(m: MarketplaceDefinition) {
    if (m.status !== "active") {
      setTooltipMarketplace(m.name);
      setTimeout(() => setTooltipMarketplace(null), 3000);
      return;
    }
    setActiveMarketplace(m.id);
    onChange?.(m.id);
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[#FAFAF8] rounded-xl border border-line shadow-2xs">
        {marketplaces.map((m) => {
          const isActive = activeMarketplace === m.id && m.status === "active";
          const isDisabled = m.status === "coming_soon";

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
                  ? `${m.name}: Coming soon — We're working on this marketplace. Check back soon.`
                  : m.name
              }
            >
              <span className="text-sm leading-none">{m.icon}</span>
              <span>{m.shortName}</span>
              {m.status === "active" ? (
                <span className="h-1.5 w-1.5 rounded-full bg-[#16C784]" />
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-muted border border-line text-ink-tertiary">
                  Coming soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Non-intrusive notification when clicking a coming-soon marketplace */}
      {tooltipMarketplace && (
        <div className="text-[11px] text-ink-secondary bg-surface-muted border border-line px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-fadeIn">
          <span>ℹ️</span>
          <span>
            <strong>{tooltipMarketplace}</strong> connector is currently in development. Full product research and listing intelligence are currently live on <strong>Etsy</strong>.
          </span>
        </div>
      )}
    </div>
  );
}
