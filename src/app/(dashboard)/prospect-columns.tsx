"use client";

import Link from "next/link";
import { Star, ExternalLink } from "lucide-react";
import type { Column } from "@/components/data";
import { DataText, IconButton, Select, Text, cn } from "@/components/ui";
import type { ProspectRow, ProspectStatus } from "@/services/prospects";

export const PROSPECT_STATUS_OPTIONS: Array<{ value: ProspectStatus; label: string }> = [
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "REJECTED", label: "Rejected" },
];

export function prospectStatusLabel(status: ProspectStatus): string {
  return PROSPECT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export interface ProspectColumnsOptions {
  onToggleFavorite: (id: string, next: boolean) => void;
  onStatusChange: (id: string, status: ProspectStatus) => void;
  showSearchName?: (row: ProspectRow) => string | undefined;
}

export function buildProspectColumns({
  onToggleFavorite,
  onStatusChange,
  showSearchName,
}: ProspectColumnsOptions): Column<ProspectRow>[] {
  const columns: Column<ProspectRow>[] = [
    {
      key: "favorite",
      header: "",
      width: "40px",
      render: (p) => (
        <IconButton
          icon={<Star fill={p.isFavorite ? "currentColor" : "none"} className="h-4 w-4" />}
          variant="tertiary"
          size="compact"
          aria-label={p.isFavorite ? `Remove ${p.shopName} from favorites` : `Add ${p.shopName} to favorites`}
          onClick={() => onToggleFavorite(p.id, !p.isFavorite)}
          className={cn(p.isFavorite ? "text-[#FFB020]" : "text-ink-tertiary hover:text-ink")}
        />
      ),
    },
    {
      key: "shop",
      header: "Shop",
      render: (p) => (
        <Link
          href={`/shops/${p.shopExternalId}`}
          className="flex items-center gap-2 font-bold text-[#0E8F5D] hover:underline"
        >
          {p.shopIconUrl ? (
            <img src={p.shopIconUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover border border-line" />
          ) : (
            <span className="h-6 w-6 shrink-0 rounded-full bg-line-subtle" />
          )}
          <span className="truncate">{p.shopName}</span>
        </Link>
      ),
    },
  ];

  if (showSearchName) {
    columns.push({
      key: "search",
      header: "Search Stream",
      render: (p) => (
        <Text size="body-sm" color="secondary">
          {showSearchName(p) ?? "—"}
        </Text>
      ),
    });
  }

  columns.push(
    {
      key: "shopAgeMonths",
      header: "Shop Age",
      sortable: true,
      align: "right",
      render: (p) => <DataText size="data-sm">{Math.round(p.shopAgeMonths)}mo</DataText>,
    },
    {
      key: "reviewCount",
      header: "Reviews",
      sortable: true,
      align: "right",
      render: (p) => <DataText size="data-sm">{p.reviewCount.toLocaleString()}</DataText>,
    },
    {
      key: "activeListings",
      header: "Listings",
      sortable: true,
      align: "right",
      render: (p) => <DataText size="data-sm">{p.activeListings}</DataText>,
    },
    {
      key: "totalSales",
      header: "Total Sales",
      sortable: true,
      align: "right",
      render: (p) => (
        <DataText size="data-sm" className="font-bold">
          {p.totalSales != null ? p.totalSales.toLocaleString() : "—"}
        </DataText>
      ),
    },
    {
      key: "avgSellingRatio",
      header: "Sales / Listing",
      sortable: true,
      align: "right",
      render: (p) => (
        <DataText size="data-sm">
          {p.avgSellingRatio != null ? `${p.avgSellingRatio.toFixed(1)}x` : "—"}
        </DataText>
      ),
    },
    {
      key: "estDailySales",
      header: "Est. Daily",
      sortable: true,
      align: "right",
      render: (p) => (
        <DataText size="data-sm" className="text-[#0E8F5D] font-bold font-mono">
          {p.estDailySales != null ? `${p.estDailySales.toFixed(1)}/d` : "—"}
        </DataText>
      ),
    },
    {
      key: "price",
      header: "Price",
      sortable: true,
      align: "right",
      render: (p) => (
        <DataText size="data-sm" className="font-mono">
          ${p.price.toFixed(2)}
        </DataText>
      ),
    },
    {
      key: "listing",
      header: "Listing",
      render: (p) => (
        <a
          href={p.listingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex max-w-[240px] items-center gap-2 text-ink hover:text-[#0E8F5D] transition-colors"
          title="Open listing on Etsy in new tab"
        >
          {p.listingImageUrl ? (
            <img src={p.listingImageUrl} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover border border-line" />
          ) : (
            <span className="h-8 w-8 shrink-0 rounded-md bg-line-subtle" />
          )}
          <span className="truncate text-xs">{p.listingTitle}</span>
          <ExternalLink className="h-3 w-3 shrink-0 text-ink-tertiary" />
        </a>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <Select
          aria-label={`Status for ${p.shopName}`}
          value={p.status}
          onChange={(e) => onStatusChange(p.id, e.target.value as ProspectStatus)}
          options={PROSPECT_STATUS_OPTIONS}
          className="text-xs py-1"
        />
      ),
    }
  );

  return columns;
}
