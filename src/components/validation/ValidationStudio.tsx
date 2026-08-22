"use client";

import React, { useState } from "react";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  Compass,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ValidationReportView } from "./ValidationReportView";
import type {
  ProductValidationReport,
  ValidationDepth,
} from "@/marketplaces/core/validation/types";

interface ValidationStudioProps {
  initialQuery?: string;
  initialMarketplace?: string;
}

export function ValidationStudio({
  initialQuery = "minimalist ceramic coffee mug",
  initialMarketplace = "etsy",
}: ValidationStudioProps) {
  const [query, setQuery] = useState(initialQuery);
  const [marketplace, setMarketplace] = useState(initialMarketplace);
  const [depth, setDepth] = useState<ValidationDepth>("STANDARD");
  const [candidatePrice, setCandidatePrice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ProductValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/validation/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          marketplace: marketplace === "all" ? undefined : marketplace,
          depth,
          candidatePrice: candidatePrice ? parseFloat(candidatePrice) : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Validation failed with status ${res.status}`);
      }

      const data = (await res.json()) as ProductValidationReport;
      setReport(data);
    } catch (err: any) {
      setError(err.message || "Failed to execute product validation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Validation Control Header */}
      <Card className="p-6 border rounded-2xl bg-card shadow-sm space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            Product Validation & Commercial Decision Studio
          </h1>
          <p className="text-xs text-muted-foreground">
            Multi-dimensional commercial feasibility validation across Demand, Competition Density, Empirical Economics, Trajectory, and Differentiation.
          </p>
        </div>

        <form onSubmit={handleValidate} className="space-y-4 pt-1">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter product title or target search query..."
                className="pl-10 text-xs h-10"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value)}
                className="bg-background border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-10"
              >
                <option value="etsy">Etsy</option>
                <option value="amazon">Amazon</option>
                <option value="ebay">eBay</option>
                <option value="walmart">Walmart</option>
                <option value="all">All Marketplaces</option>
              </select>

              <div className="w-32">
                <Input
                  type="number"
                  step="0.5"
                  value={candidatePrice}
                  onChange={(e) => setCandidatePrice(e.target.value)}
                  placeholder="Target Price $"
                  className="text-xs h-10"
                />
              </div>

              <Button type="submit" disabled={loading} size="default" className="text-xs shrink-0">
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                Validate Product
              </Button>
            </div>
          </div>

          {/* Depth Modes Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold text-label-sm">Validation Depth:</span>
              {(["QUICK", "STANDARD", "DEEP"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDepth(d)}
                  className={`px-3 py-1 rounded-md text-label-sm font-medium transition-colors ${
                    depth === d
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <span className="text-meta text-muted-foreground">
              {depth === "QUICK"
                ? "Fast sample evaluation"
                : depth === "STANDARD"
                ? "Balanced multi-source research"
                : "Deep category & merchant analysis"}
            </span>
          </div>
        </form>
      </Card>

      {/* 2. Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Validation Report View or Empty State */}
      {loading ? (
        <Card className="p-12 text-center border rounded-2xl bg-card space-y-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Running Product Validation Engine</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Acquiring public marketplace listings, evaluating demand engagement, computing seller concentration, and determining price positioning...
            </p>
          </div>
        </Card>
      ) : report ? (
        <ValidationReportView
          report={report}
          onRefresh={() => handleValidate()}
          refreshing={loading}
        />
      ) : (
        <Card className="p-12 text-center border rounded-2xl bg-card space-y-3">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">Ready to Validate Product</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Enter a product title, select your marketplace and target price, then click &quot;Validate Product&quot; to generate an evidence-backed validation report.
          </p>
        </Card>
      )}
    </div>
  );
}
