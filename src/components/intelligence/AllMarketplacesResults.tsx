"use client";

// Renders the response of POST /api/marketplaces/research — one
// independently status-tagged card per marketplace. Never collapses
// UNAVAILABLE/NOT_IMPLEMENTED into a "0 results" empty state; each status
// gets its own honest treatment (Part 3/7 of the All-Marketplaces UX spec).
// Products render from the canonical NormalizedProduct shape only — no
// Etsy-specific field is assumed to exist.

import Link from "next/link";
import { ExternalLink, CheckCircle2, AlertTriangle, PlugZap, XCircle } from "lucide-react";
import { Card, Badge, Text, Heading, SafeImage } from "@/components/ui";

type MarketplaceResultStatus = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";

interface NormalizedProductLike {
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
}

interface ProductResearchResultLike {
  marketplace: string;
  status: MarketplaceResultStatus;
  products: NormalizedProductLike[];
  message?: string;
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

export function AllMarketplacesResults({ results }: { results: ProductResearchResultLike[] }) {
  return (
    <div className="space-y-3">
      {results.map((result) => {
        const config = STATUS_CONFIG[result.status];
        const Icon = config.icon;
        const label = MARKETPLACE_LABELS[result.marketplace] ?? result.marketplace;

        return (
          <Card key={result.marketplace} padding="md" className="border-line bg-white space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
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
                <Text size="body-sm" color="secondary">
                  {result.products.length} product{result.products.length === 1 ? "" : "s"}
                </Text>
              )}
            </div>

            {(result.status === "NOT_IMPLEMENTED" || result.status === "UNAVAILABLE") && (
              <Text size="body-sm" color="secondary">
                {result.message || config.label}
              </Text>
            )}

            {(result.status === "AVAILABLE" || result.status === "PARTIAL") && result.products.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {result.products.map((product) => (
                  <a
                    key={product.externalId}
                    href={product.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-2.5 p-2.5 rounded-lg border border-line-subtle hover:border-line hover:bg-surface-secondary transition-colors"
                  >
                    {product.imageUrl ? (
                      <SafeImage src={product.imageUrl} alt={product.title} className="h-12 w-12 rounded-md object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-surface-muted shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-ink truncate">{product.title}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-tertiary">
                        {/* Missing signals render as omitted, never as a fabricated "0" or "N/A" number. */}
                        {typeof product.price === "number" && (
                          <span className="font-semibold text-ink-secondary">
                            {product.currency === "USD" || !product.currency ? "$" : `${product.currency} `}
                            {product.price.toFixed(2)}
                          </span>
                        )}
                        {typeof product.rating === "number" && <span>★ {product.rating.toFixed(1)}</span>}
                        {typeof product.reviewCount === "number" && <span>{product.reviewCount.toLocaleString()} reviews</span>}
                      </div>
                    </div>
                    <ExternalLink className="h-3 w-3 text-ink-tertiary shrink-0" />
                  </a>
                ))}
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
