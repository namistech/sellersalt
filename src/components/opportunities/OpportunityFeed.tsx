"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  Bookmark,
  Layers,
  ShoppingBag,
  Hash,
  Store,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OpportunityCard } from "./OpportunityCard";
import type { OpportunityItem, OpportunityType, OpportunityDiscoveryResponse } from "@/marketplaces/core/discovery-types";

interface OpportunityFeedProps {
  initialQuery?: string;
  initialMarketplace?: string;
  className?: string;
}

export function OpportunityFeed({
  initialQuery = "trending products",
  initialMarketplace = "all",
  className = "",
}: OpportunityFeedProps) {
  const [query, setQuery] = useState(initialQuery);
  const [marketplace, setMarketplace] = useState(initialMarketplace);
  const [selectedType, setSelectedType] = useState<OpportunityType | "ALL">("ALL");
  const [filterSavedOnly, setFilterSavedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<OpportunityDiscoveryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/opportunities/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query || "popular items",
          marketplace: marketplace === "all" ? undefined : marketplace,
          types: selectedType === "ALL" ? undefined : [selectedType],
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to discover opportunities (${res.status})`);
      }

      const data = (await res.json()) as OpportunityDiscoveryResponse;
      setResponse(data);
    } catch (err: any) {
      setError(err.message || "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [marketplace, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOpportunities();
  };

  const opportunities = response?.opportunities || [];
  const displayedOpportunities = filterSavedOnly
    ? opportunities.filter((o) => o.isSaved)
    : opportunities;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header & Search Filter Bar */}
      <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Opportunity Discovery Feed 2.0
            </h1>
            <p className="text-xs text-muted-foreground">
              Evidence-based commercial opportunity rankings across Products, Keywords, Niches, Categories, and Sellers.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search niche, product or keyword..."
                className="pl-9 text-xs"
              />
            </div>
            <Button type="submit" disabled={loading} size="compact" className="shrink-0 text-xs">
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Search className="w-3.5 h-3.5 mr-1" />}
              Discover
            </Button>
          </form>
        </div>

        {/* 2. Type & Marketplace Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground font-semibold text-label-sm mr-1">Type:</span>
            {(["ALL", "PRODUCT", "KEYWORD", "NICHE", "CATEGORY", "SELLER"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-md text-label-sm font-medium transition-colors ${
                  selectedType === t
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-label-sm text-muted-foreground flex items-center gap-1 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={filterSavedOnly}
                onChange={(e) => setFilterSavedOnly(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              Saved Only
            </label>

            <select
              value={marketplace}
              onChange={(e) => setMarketplace(e.target.value)}
              className="bg-background border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Marketplaces</option>
              <option value="etsy">Etsy</option>
              <option value="amazon">Amazon</option>
              <option value="ebay">eBay</option>
              <option value="walmart">Walmart</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-5 border rounded-xl bg-card animate-pulse h-64 space-y-4">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-10 bg-muted rounded w-full" />
              <div className="h-20 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : displayedOpportunities.length === 0 ? (
        <div className="p-12 text-center border rounded-xl bg-card space-y-3">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Opportunities Surfaced</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {filterSavedOnly
              ? "You have no saved opportunities matching your current filters."
              : "Try expanding your query keywords or selecting All Marketplaces."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedOpportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}
    </div>
  );
}
