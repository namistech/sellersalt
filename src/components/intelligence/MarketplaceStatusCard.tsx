"use client";

// Generic per-marketplace status shell — reused by Keyword Research and
// Category Hunting's "All Marketplaces" views so the
// AVAILABLE/PARTIAL/UNAVAILABLE/NOT_IMPLEMENTED treatment (and its exact
// wording) stays in one place instead of being re-derived per feature.
// Product Research has its own richer card (AllMarketplacesResults.tsx,
// which renders a product grid) — this one takes arbitrary children for
// whatever a marketplace's available data actually is.

import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, PlugZap, XCircle } from "lucide-react";
import { Card, Badge, Text, Heading } from "@/components/ui";

export type MarketplaceResultStatus = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "NOT_IMPLEMENTED";

export const MARKETPLACE_LABELS: Record<string, string> = {
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

export function MarketplaceStatusCard({
  marketplace,
  status,
  message,
  children,
}: {
  marketplace: string;
  status: MarketplaceResultStatus;
  message?: string;
  children?: ReactNode;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const label = MARKETPLACE_LABELS[marketplace] ?? marketplace;

  return (
    <Card padding="md" className="border-line bg-white space-y-3">
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
      </div>

      {(status === "NOT_IMPLEMENTED" || status === "UNAVAILABLE") && (
        <Text size="body-sm" color="secondary">
          {message || config.label}
        </Text>
      )}

      {(status === "AVAILABLE" || status === "PARTIAL") && children}
    </Card>
  );
}
