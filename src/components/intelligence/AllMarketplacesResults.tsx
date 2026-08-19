"use client";

// Renders the response of POST /api/marketplaces/research — one
// independently status-tagged card per marketplace. Never collapses
// UNAVAILABLE/NOT_IMPLEMENTED into a "0 results" empty state; each status
// gets its own honest treatment (Part 3/7 of the All-Marketplaces UX spec).
// Products render from the canonical NormalizedProduct shape and canonical
// opportunity report — no Etsy-specific field is assumed to exist.

import Link from "next/link";
import { ExternalLink, CheckCircle2, AlertTriangle, PlugZap, XCircle, Sparkles, Shield, Zap, TrendingUp } from "lucide-react";
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

export function AllMarketplacesResults({ results }: { results: ProductResearchResultLike[] }) {
  return (
    <div className="space-y-4">
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
