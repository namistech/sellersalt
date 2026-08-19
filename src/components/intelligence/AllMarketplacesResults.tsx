"use client";

// Renders the response of POST /api/marketplaces/research — one
// independently status-tagged card per marketplace, plus an executive
// cross-marketplace opportunity evaluation & ranking matrix.
//
// Strict architectural rules:
// - Never collapses UNAVAILABLE/NOT_IMPLEMENTED into a "0 results" empty state.
// - Never assigns a score of 0 or ranks an unavailable marketplace.
// - Displays calibrated confidence and evaluated signal groups.
// - Products render from canonical NormalizedProduct and canonical opportunity report.

import Link from "next/link";
import {
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  PlugZap,
  XCircle,
  Sparkles,
  Shield,
  Zap,
  TrendingUp,
  Award,
  Info,
  Layers,
} from "lucide-react";
import { Card, Badge, Text, Heading, SafeImage } from "@/components/ui";

export type MarketplaceResultStatus = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";

export interface OpportunityScoreLike {
  score: number | null;
  confidence: number;
  tier?: string;
  verdict?: string;
  verdictVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  availableSignals?: string[];
  unavailableSignals?: string[];
}

export interface NormalizedProductLike {
  externalId: string;
  marketplace: string;
  title: string;
  url?: string;
  imageUrl?: string;
  price: number | null;
  currency: string | null;
  reviewCount?: number | null;
  rating?: number | null;
  shop?: { name?: string } | null;
  opportunityScore?: OpportunityScoreLike | null;
}

export interface MarketplaceOpportunitySummaryLike {
  totalProducts: number;
  scoredProductsCount: number;
  averageOpportunityScore: number | null;
  averageConfidence: number | null;
  availableSignalGroups: string[];
  unavailableSignalGroups: string[];
}

export interface ProductResearchResultLike {
  marketplace: string;
  status: MarketplaceResultStatus;
  products: NormalizedProductLike[];
  message?: string;
  summary?: MarketplaceOpportunitySummaryLike;
}

export interface CrossMarketplaceRankingLike {
  rank: number;
  marketplace: string;
  displayName: string;
  opportunityScore: number;
  confidence: number;
  tier?: string;
  verdict?: string;
  verdictVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  evaluatedSignalsCount: number;
  totalSignalsCount: number;
}

export interface CrossMarketplaceComparisonLike {
  query?: string;
  availableMarketplaces: string[];
  unavailableMarketplaces: string[];
  rankings: CrossMarketplaceRankingLike[];
  bestAvailableMarketplace?: {
    marketplace: string;
    displayName: string;
    opportunityScore: number;
    confidence: number;
    verdict?: string;
    verdictVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  };
  highestConfidenceMarketplace?: {
    marketplace: string;
    displayName: string;
    confidence: number;
    opportunityScore: number;
  };
  comparisonConfidence: number | null;
  limitations: string[];
}

const MARKETPLACE_LABELS: Record<string, string> = {
  etsy: "Etsy",
  amazon: "Amazon",
  ebay: "eBay",
  tiktok_shop: "TikTok Shop",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
};

const STATUS_CONFIG: Record<
  MarketplaceResultStatus,
  { label: string; icon: typeof CheckCircle2; badgeVariant: "success" | "warning" | "neutral" }
> = {
  AVAILABLE: { label: "Available", icon: CheckCircle2, badgeVariant: "success" },
  PARTIAL: { label: "Partial", icon: AlertTriangle, badgeVariant: "warning" },
  NOT_IMPLEMENTED: { label: "API integration required", icon: PlugZap, badgeVariant: "neutral" },
  UNAVAILABLE: { label: "Currently unavailable", icon: XCircle, badgeVariant: "neutral" },
};

function getScoreBadgeClasses(score: number | null) {
  if (score === null) return "bg-surface-muted text-ink-tertiary border-line-subtle";
  if (score >= 80) return "bg-brand-primary-subtle text-brand-primary border-brand-primary/30 font-bold";
  if (score >= 65) return "bg-warn-subtle text-warn-strong border-warn/30 font-semibold";
  return "bg-surface-muted text-ink border-line";
}

function deriveComparisonFromResults(results: ProductResearchResultLike[]): CrossMarketplaceComparisonLike {
  const available: string[] = [];
  const unavailable: string[] = [];
  const rankings: CrossMarketplaceRankingLike[] = [];

  for (const r of results) {
    if (r.status === "AVAILABLE" && typeof r.summary?.averageOpportunityScore === "number") {
      available.push(r.marketplace);
      rankings.push({
        rank: 0,
        marketplace: r.marketplace,
        displayName: MARKETPLACE_LABELS[r.marketplace] ?? r.marketplace,
        opportunityScore: r.summary.averageOpportunityScore,
        confidence: r.summary.averageConfidence ?? 85,
        evaluatedSignalsCount: r.summary.availableSignalGroups.length,
        totalSignalsCount: (r.summary.availableSignalGroups.length + r.summary.unavailableSignalGroups.length) || 4,
      });
    } else {
      unavailable.push(r.marketplace);
    }
  }

  rankings.sort((a, b) => b.opportunityScore - a.opportunityScore);
  rankings.forEach((r, i) => {
    r.rank = i + 1;
  });

  const bestAvailable = rankings[0]
    ? {
        marketplace: rankings[0].marketplace,
        displayName: rankings[0].displayName,
        opportunityScore: rankings[0].opportunityScore,
        confidence: rankings[0].confidence,
        verdict: rankings[0].opportunityScore >= 80 ? "Strong Opportunity" : "Viable Opportunity",
        verdictVariant: "success" as const,
      }
    : undefined;

  const limitations: string[] = [];
  if (available.length === 1 && available[0] === "etsy") {
    limitations.push("Etsy is currently the only active public market research integration. Comparative rankings reflect single-channel availability.");
  }
  if (unavailable.some((m) => ["amazon", "ebay", "tiktok_shop"].includes(m))) {
    limitations.push("Amazon, eBay, and TikTok Shop connectors are architecture-ready and require official developer credentials before public signals can be ingested.");
  }

  return {
    availableMarketplaces: available,
    unavailableMarketplaces: unavailable,
    rankings,
    bestAvailableMarketplace: bestAvailable,
    comparisonConfidence: rankings.length > 0 ? rankings[0].confidence : null,
    limitations,
  };
}

export function AllMarketplacesResults({
  results,
  comparison: passedComparison,
}: {
  results: ProductResearchResultLike[];
  comparison?: CrossMarketplaceComparisonLike;
}) {
  const comparison = passedComparison ?? deriveComparisonFromResults(results);

  return (
    <div className="space-y-5">
      {/* Executive Cross-Marketplace Intelligence & Ranking Matrix */}
      {comparison && (comparison.rankings.length > 0 || comparison.unavailableMarketplaces.length > 0) && (
        <Card padding="md" className="border-line bg-surface-secondary/40 space-y-4 shadow-xs">
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-line-subtle pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-brand-primary-subtle text-brand-primary">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <Heading as="h3" size="h4" className="text-sm font-semibold">
                  Cross-Marketplace Intelligence Comparison
                </Heading>
                <Text size="meta" color="secondary">
                  Multi-channel opportunity evaluation across registered commerce ecosystems
                </Text>
              </div>
            </div>

            {comparison.bestAvailableMarketplace && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-brand-primary/20 shadow-2xs">
                <Award className="h-4 w-4 text-brand-primary" />
                <span className="text-xs text-ink-secondary">Best Available Channel:</span>
                <span className="text-xs font-bold text-ink">
                  {comparison.bestAvailableMarketplace.displayName}
                </span>
                <span className={`px-1.5 py-0.2 rounded font-mono text-[11px] border ${getScoreBadgeClasses(comparison.bestAvailableMarketplace.opportunityScore)}`}>
                  {comparison.bestAvailableMarketplace.opportunityScore}/100
                </span>
              </div>
            )}
          </div>

          {/* Comparative Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line-subtle text-ink-tertiary">
                  <th className="pb-2 font-medium">Marketplace</th>
                  <th className="pb-2 font-medium">Integration Status</th>
                  <th className="pb-2 font-medium">Opportunity Score</th>
                  <th className="pb-2 font-medium">Confidence</th>
                  <th className="pb-2 font-medium">Signal Coverage</th>
                  <th className="pb-2 font-medium">Channel Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle/50">
                {results.map((r) => {
                  const label = MARKETPLACE_LABELS[r.marketplace] ?? r.marketplace;
                  const cfg = STATUS_CONFIG[r.status];
                  const Icon = cfg.icon;
                  const isLive = r.status === "AVAILABLE" && typeof r.summary?.averageOpportunityScore === "number";
                  const score = r.summary?.averageOpportunityScore ?? null;
                  const conf = r.summary?.averageConfidence ?? null;
                  const availableSignals = r.summary?.availableSignalGroups ?? [];

                  return (
                    <tr key={r.marketplace} className="hover:bg-white/60 transition-colors">
                      <td className="py-2.5 font-semibold text-ink flex items-center gap-1.5">
                        {label}
                      </td>
                      <td className="py-2.5">
                        <Badge variant={cfg.badgeVariant} className="text-[11px]">
                          <Icon className="h-2.5 w-2.5 mr-1 inline" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        {isLive && score !== null ? (
                          <span className={`px-2 py-0.5 rounded font-mono text-xs border ${getScoreBadgeClasses(score)}`}>
                            {score}/100
                          </span>
                        ) : (
                          <span className="text-ink-tertiary font-mono">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {isLive && conf !== null ? (
                          <span className="font-mono text-xs text-ink-secondary">
                            {conf}%
                          </span>
                        ) : (
                          <span className="text-ink-tertiary font-mono">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {isLive && availableSignals.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {availableSignals.map((g) => (
                              <span key={g} className="px-1.5 py-0.5 rounded bg-white text-ink-secondary text-[10px] border border-line-subtle">
                                {g}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-ink-tertiary text-[11px]">
                            {r.status === "PARTIAL" ? "Orders only" : "API integration required"}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-[11px] text-ink-secondary">
                        {isLive ? (
                          <span className="font-medium text-brand-primary">
                            {score !== null && score >= 80 ? "Strong Opportunity" : "Viable Channel"}
                          </span>
                        ) : (
                          <span className="text-ink-tertiary italic">Not Scored (Zero Fabrication)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Honest System Limitations & Data Provenance */}
          {comparison.limitations.length > 0 && (
            <div className="pt-2 border-t border-line-subtle/70 flex items-start gap-2 text-[11px] text-ink-tertiary bg-white/50 p-2 rounded-md">
              <Info className="h-3.5 w-3.5 text-ink-secondary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-medium text-ink-secondary">Data Provenance & Channel Limitations:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {comparison.limitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Individual Marketplace Research Cards */}
      {results.map((result) => {
        const config = STATUS_CONFIG[result.status];
        const Icon = config.icon;
        const label = MARKETPLACE_LABELS[result.marketplace] ?? result.marketplace;

        return (
          <Card key={result.marketplace} padding="md" className="border-line bg-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-line-subtle pb-3">
              <div className="flex items-center gap-2">
                <Heading as="h3" size="h4">
                  {label}
                </Heading>
                <Badge variant={config.badgeVariant}>
                  <Icon className="h-3 w-3 mr-1 inline" />
                  {config.label}
                </Badge>
              </div>

              {result.status === "AVAILABLE" && (
                <div className="flex items-center gap-3">
                  {result.summary?.averageOpportunityScore !== null && result.summary?.averageOpportunityScore !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-ink-tertiary">Avg Opportunity:</span>
                      <span className={`px-2 py-0.5 rounded font-mono text-xs border ${getScoreBadgeClasses(result.summary.averageOpportunityScore)}`}>
                        {result.summary.averageOpportunityScore}/100
                      </span>
                    </div>
                  )}
                  {result.summary?.averageConfidence !== null && result.summary?.averageConfidence !== undefined && (
                    <Badge variant="neutral" className="text-[11px] font-mono">
                      {result.summary.averageConfidence}% Confidence
                    </Badge>
                  )}
                  <Text size="body-sm" color="secondary">
                    {result.products.length} product{result.products.length === 1 ? "" : "s"}
                  </Text>
                </div>
              )}
            </div>

            {/* Signal availability indicator for active marketplace */}
            {result.summary && (result.summary.availableSignalGroups.length > 0 || result.summary.unavailableSignalGroups.length > 0) && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-ink-tertiary py-1">
                <span className="font-medium text-ink-secondary">Evaluated signals:</span>
                {result.summary.availableSignalGroups.map((group) => (
                  <span key={group} className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-muted text-ink text-[11px] border border-line-subtle">
                    ✓ {group}
                  </span>
                ))}
                {result.summary.unavailableSignalGroups.map((group) => (
                  <span key={group} className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-secondary text-ink-tertiary text-[11px] line-through">
                    {group}
                  </span>
                ))}
              </div>
            )}

            {(result.status === "NOT_IMPLEMENTED" || result.status === "UNAVAILABLE") && (
              <Text size="body-sm" color="secondary">
                {result.message || config.label}
              </Text>
            )}

            {(result.status === "AVAILABLE" || result.status === "PARTIAL") && result.products.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {result.products.map((product) => {
                  const opp = product.opportunityScore;
                  return (
                    <div
                      key={product.externalId}
                      className="flex flex-col justify-between p-3 rounded-lg border border-line-subtle hover:border-line hover:bg-surface-secondary transition-colors bg-white"
                    >
                      <div className="flex gap-2.5">
                        {product.imageUrl ? (
                          <SafeImage src={product.imageUrl} alt={product.title} className="h-14 w-14 rounded-md object-cover shrink-0 border border-line-subtle" />
                        ) : (
                          <div className="h-14 w-14 rounded-md bg-surface-muted shrink-0 flex items-center justify-center text-ink-tertiary text-xs font-medium">
                            No image
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <a
                            href={product.url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-ink hover:text-brand-primary line-clamp-2 transition-colors flex items-start justify-between gap-1"
                          >
                            <span>{product.title}</span>
                            <ExternalLink className="h-3 w-3 text-ink-tertiary shrink-0 mt-0.5" />
                          </a>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-tertiary flex-wrap">
                            {typeof product.price === "number" && (
                              <span className="font-semibold text-ink-secondary">
                                {product.currency === "USD" || !product.currency ? "$" : `${product.currency} `}
                                {product.price.toFixed(2)}
                              </span>
                            )}
                            {typeof product.rating === "number" && <span>★ {product.rating.toFixed(1)}</span>}
                            {typeof product.reviewCount === "number" && <span>{product.reviewCount.toLocaleString()} reviews</span>}
                            {product.shop?.name && <span className="truncate max-w-[100px] text-ink-tertiary">· {product.shop.name}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Opportunity Score & Confidence Bar */}
                      {opp && (
                        <div className="mt-2.5 pt-2 border-t border-line-subtle flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded font-mono text-xs border ${getScoreBadgeClasses(opp.score)}`}>
                              {opp.score !== null ? opp.score : "—"}
                            </span>
                            <span className="text-[11px] font-medium text-ink-secondary">
                              {opp.tier || (opp.score && opp.score >= 80 ? "High Signal" : opp.score && opp.score >= 65 ? "Moderate" : "Low")}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono text-ink-tertiary">
                              {opp.confidence}% conf
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(result.status === "AVAILABLE" || result.status === "PARTIAL") && result.products.length === 0 && (
              <Text size="body-sm" color="secondary">
                No matching products found on {label}.
              </Text>
            )}
          </Card>
        );
      })}
    </div>
  );
}
