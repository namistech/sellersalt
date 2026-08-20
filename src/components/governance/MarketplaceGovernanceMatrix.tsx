"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  Globe,
  Database,
  Clock,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  FileText,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { MarketplaceDataPolicy, PolicyPermissionStatus } from "@/marketplaces/core/governance/types";
import { MarketplaceGovernanceRegistry } from "@/marketplaces/core/governance/registry";

export function MarketplaceGovernanceMatrix() {
  const policies = MarketplaceGovernanceRegistry.listPolicies();
  const [selectedPolicy, setSelectedPolicy] = useState<MarketplaceDataPolicy | null>(null);
  const [filterMarketplace, setFilterMarketplace] = useState<string>("all");

  const filtered = policies.filter((p) => {
    if (filterMarketplace !== "all" && p.marketplace !== filterMarketplace) return false;
    return true;
  });

  const getStatusBadge = (status: PolicyPermissionStatus) => {
    switch (status) {
      case "ALLOWED":
        return <Badge variant="success" className="text-[10px] font-bold">ALLOWED</Badge>;
      case "CONDITIONALLY_ALLOWED":
        return <Badge variant="info" className="text-[10px] font-bold">CONDITIONAL</Badge>;
      case "RESTRICTED":
        return <Badge variant="warning" className="text-[10px] font-bold">RESTRICTED</Badge>;
      case "PROHIBITED":
        return <Badge variant="danger" className="text-[10px] font-bold">PROHIBITED</Badge>;
      case "UNKNOWN":
      case "REQUIRES_REVIEW":
      default:
        return <Badge variant="neutral" className="text-[10px] font-bold">REVIEW REQ</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Marketplace Data Governance
            </span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Marketplace Policy & Compliance Matrix</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authoritative source boundaries, retention limits, and compliance status across all registered ecommerce platforms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterMarketplace}
            onChange={(e) => setFilterMarketplace(e.target.value)}
            className="h-8 px-2.5 rounded-lg border bg-background text-xs font-bold text-foreground"
          >
            <option value="all">All Marketplaces ({policies.length})</option>
            {policies.map((p) => (
              <option key={p.marketplace} value={p.marketplace}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((policy) => (
          <Card
            key={policy.marketplace}
            className="p-5 border rounded-2xl bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-xs"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-foreground">{policy.displayName}</h3>
                <Badge
                  variant={
                    policy.complianceStatus === "IMPLEMENTED"
                      ? "success"
                      : policy.complianceStatus === "DESIGNED"
                      ? "info"
                      : "neutral"
                  }
                  className="text-[10px] font-bold"
                >
                  {policy.complianceStatus.replace(/_/g, " ")}
                </Badge>
              </div>

              {/* Source Permissions */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-500" /> Public Web
                  </span>
                  {getStatusBadge(policy.publicWebAllowed)}
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-primary" /> Official API
                  </span>
                  {getStatusBadge(policy.officialApiAvailable)}
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" /> Connected Store
                  </span>
                  {getStatusBadge(policy.connectedStoreAllowed)}
                </div>
              </div>

              {/* Retention & Rate Limit */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg border bg-muted/10">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground block">Max Retention</span>
                  <span className="font-bold text-foreground">
                    {policy.retentionRules.maxSnapshotRetentionDays
                      ? `${policy.retentionRules.maxSnapshotRetentionDays} Days`
                      : "Plan Bounded"}
                  </span>
                </div>

                <div className="p-2 rounded-lg border bg-muted/10">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground block">Rate Limit</span>
                  <span className="font-bold text-foreground">
                    {policy.rateLimitRules.maxRequestsPerMinute} req/min
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setSelectedPolicy(policy)}
              size="compact"
              variant="secondary"
              className="w-full text-xs font-bold"
            >
              <Info className="w-3.5 h-3.5 mr-1.5" /> View Governance Details
            </Button>
          </Card>
        ))}
      </div>

      {/* Selected Policy Detail Modal / Drawer */}
      {selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl border rounded-2xl bg-card p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" className="text-[10px] font-bold uppercase">
                    Governance Policy
                  </Badge>
                  <Badge
                    variant={
                      selectedPolicy.complianceStatus === "IMPLEMENTED"
                        ? "success"
                        : selectedPolicy.complianceStatus === "DESIGNED"
                        ? "info"
                        : "neutral"
                    }
                    className="text-[10px] font-bold"
                  >
                    {selectedPolicy.complianceStatus.replace(/_/g, " ")}
                  </Badge>
                </div>
                <h2 className="text-xl font-black text-foreground pt-1">{selectedPolicy.displayName} Data Policy</h2>
              </div>
              <button
                onClick={() => setSelectedPolicy(null)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            {/* Allowed vs Prohibited Domains */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1.5">
                <span className="font-bold text-foreground block">Allowed Research Domains:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedPolicy.allowedResearchDomains.length > 0 ? (
                    selectedPolicy.allowedResearchDomains.map((d) => (
                      <Badge key={d} variant="neutral" className="text-[11px]">
                        {d}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None (Authenticated channel only)</span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 space-y-1.5">
                <span className="font-bold text-foreground block">Prohibited Private Portal Paths (Hard-Gated):</span>
                <div className="flex flex-wrap gap-1">
                  {selectedPolicy.prohibitedPathPatterns.map((p) => (
                    <Badge key={p} variant="danger" className="text-[10px]">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Disclaimer Text */}
            {selectedPolicy.displayRules.requireMarketplaceDisclaimer && (
              <div className="p-3.5 rounded-xl border bg-primary/5 space-y-1 text-xs">
                <span className="font-bold text-primary block">Mandatory Trademark Disclaimer:</span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {selectedPolicy.displayRules.disclaimerText}
                </p>
              </div>
            )}

            {/* Known Limitations */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-foreground block">Known Limitations & Disclosures:</span>
              <ul className="space-y-1 list-disc pl-4 text-muted-foreground text-[11px]">
                {selectedPolicy.knownLimitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>

            {/* Close Button */}
            <Button
              onClick={() => setSelectedPolicy(null)}
              size="default"
              variant="primary"
              className="w-full text-xs font-bold"
            >
              Done
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
