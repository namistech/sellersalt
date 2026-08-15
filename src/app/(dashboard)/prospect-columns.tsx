"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { Column } from "@/components/data";
import { DataText, IconButton, Select, Text, cn } from "@/components/ui";
import type { ProspectRow, ProspectStatus } from "@/services/prospects";

// Shared Table column config for anything rendering ProspectRow[] —
// Prospects (Results tab) and Favorites both reuse this exact set
// (per docs/design/frontend-execution-plan-v1.md §9 "Prospects, ...
// Favorites" share the same list pattern), so a column definition or
// row-action fix only needs to happen once.

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
  /** Adds a "Search" column identifying which saved search found this row — only meaningful on the unified Results view, not Favorites. */
  showSearchName?: (row: ProspectRow) => string | undefined;
}

export function buildProspectColumns({ onToggleFavorite, onStatusChange, showSearchName }: ProspectColumnsOptions): Column<ProspectRow>[] {
  const columns: Column<ProspectRow>[] = [
    {
      key: "favorite",
      header: "",
      width: "40px",
      render: (p) => (
        <IconButton
          icon={<Star fill={p.isFavorite ? "currentColor" : "none"} />}
          variant="tertiary"
          size="compact"
          aria-label={p.isFavorite ? `Remove ${p.shopName} from favorites` : `Add ${p.shopName} to favorites`}
          onClick={() => onToggleFavorite(p.id, !p.isFavorite)}
          className={cn(p.isFavorite ? "text-gold" : "text-ink-tertiary")}
        />
      ),
    },
    {
      key: "shop",
      header: "Shop",
      render: (p) => (
        <Link href={`/shops/${p.shopExternalId}`} className="flex items-center gap-2 font-medium text-accent hover:underline">
          {p.shopIconUrl ? (
            <img src={p.shopIconUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
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
      header: "Search",
      render: (p) => (
        <Text size="body-sm" color="secondary">
          {showSearchName(p) ?? "—"}
        </Text>
      ),
    });
  }

  columns.push(
    { key: "shopAgeMonths", header: "Shop age", sortable: true, align: "right", render: (p) => <DataText size="data-sm">{p.shopAgeMonths}mo</DataText> },
    { key: "reviewCount", header: "Reviews", sortable: true, align: "right", render: (p) => <DataText size="data-sm">{p.reviewCount}</DataText> },
    { key: "activeListings", header: "Listings", sortable: true, align: "right", render: (p) => <DataText size="data-sm">{p.activeListings}</DataText> },
    { key: "totalSales", header: "Total sales", sortable: true, align: "right", render: (p) => <DataText size="data-sm">{p.totalSales ?? "—"}</DataText> },
    { key: "avgSellingRatio", header: "Sales / listing", sortable: true, align: "right", render: (p) => <DataText size="data-sm">{p.avgSellingRatio ?? "—"}</DataText> },
    { key: "estDailySales", header: "Est. daily sales", sortable: true, align: "right", render: (p) => <DataText size="data-sm">{p.estDailySales ?? "—"}/day</DataText> },
    { key: "price", header: "Price", sortable: true, align: "right", render: (p) => <DataText size="data-sm">${p.price.toFixed(2)}</DataText> },
    {
      key: "listing",
      header: "Listing",
      render: (p) => (
        <a href={p.listingUrl} target="_blank" rel="noreferrer" className="flex max-w-[220px] items-center gap-2 text-accent hover:underline">
          {p.listingImageUrl ? (
            <img src={p.listingImageUrl} alt="" className="h-8 w-8 shrink-0 rounded-xs object-cover" />
          ) : (
            <span className="h-8 w-8 shrink-0 rounded-xs bg-line-subtle" />
          )}
          <span className="truncate">{p.listingTitle}</span>
        </a>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "180px",
      render: (p) => (
        <Select
          aria-label={`Decision status for ${p.shopName}`}
          value={p.status}
          onChange={(e) => onStatusChange(p.id, e.target.value as ProspectStatus)}
          options={PROSPECT_STATUS_OPTIONS}
          className="!h-8 w-full min-w-[150px] !py-0 text-body-sm"
        />
      ),
    }
  );

  return columns;
}
