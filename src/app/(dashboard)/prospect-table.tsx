"use client";

import { useMemo, useState } from "react";

export interface ProspectRow {
  id: string;
  keyword: string;
  shopName: string;
  shopUrl: string;
  shopIconUrl: string | null;
  shopAgeMonths: number;
  reviewCount: number;
  activeListings: number;
  reviewRatio: number;
  reviewVelocity: number;
  totalSales: number | null;
  reviewAverage: number | null;
  numFavorers: number | null;
  avgSellingRatio: number | null;
  estDailySales: number | null;
  listingTitle: string;
  listingUrl: string;
  listingImageUrl: string | null;
  price: number;
  status: string;
  isFavorite: boolean;
  createdAt: string;
}

type SortKey =
  | "shopAgeMonths"
  | "reviewCount"
  | "activeListings"
  | "totalSales"
  | "avgSellingRatio"
  | "estDailySales"
  | "reviewRatio"
  | "reviewVelocity"
  | "price";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "shopAgeMonths", label: "Shop age" },
  { key: "reviewCount", label: "Reviews" },
  { key: "activeListings", label: "Listings" },
  { key: "totalSales", label: "Total sales" },
  { key: "avgSellingRatio", label: "Sales/listing" },
  { key: "estDailySales", label: "Est. daily sales" },
  { key: "reviewRatio", label: "Rev ratio" },
  { key: "reviewVelocity", label: "Rev velocity" },
  { key: "price", label: "Price" },
];

export function ProspectTable({
  rows,
  onToggleFavorite,
  emptyMessage,
}: {
  rows: ProspectRow[];
  onToggleFavorite: (id: string, next: boolean) => void;
  emptyMessage: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? 0) as number;
      const bv = (b[sortKey] ?? 0) as number;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          <th className="py-2 pr-4">Shop</th>
          {COLUMNS.map((col) => (
            <th key={col.key} className="py-2 pr-4">
              <button
                onClick={() => handleSort(col.key)}
                className="inline-flex items-center gap-1 hover:text-ink"
              >
                {col.label}
                <span className="text-[10px] leading-none">
                  {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </button>
            </th>
          ))}
          <th className="py-2 pr-4">Listing</th>
          <th className="py-2 pr-4">Fav</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {sorted.map((p) => (
          <tr key={p.id}>
            <td className="py-2 pr-4">
              <a
                href={p.shopUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 font-medium text-accent hover:underline"
              >
                {p.shopIconUrl ? (
                  <img src={p.shopIconUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="h-6 w-6 rounded-full bg-line" />
                )}
                {p.shopName}
              </a>
            </td>
            <td className="py-2 pr-4 tabular-nums">{p.shopAgeMonths}mo</td>
            <td className="py-2 pr-4 tabular-nums">{p.reviewCount}</td>
            <td className="py-2 pr-4 tabular-nums">{p.activeListings}</td>
            <td className="py-2 pr-4 tabular-nums">{p.totalSales ?? "—"}</td>
            <td className="py-2 pr-4 tabular-nums">{p.avgSellingRatio ?? "—"}</td>
            <td className="py-2 pr-4 tabular-nums">{p.estDailySales ?? "—"}/day</td>
            <td className="py-2 pr-4 tabular-nums">{p.reviewRatio}</td>
            <td className="py-2 pr-4 tabular-nums">{p.reviewVelocity}/mo</td>
            <td className="py-2 pr-4 tabular-nums">${p.price.toFixed(2)}</td>
            <td className="py-2 pr-4 max-w-xs">
              <a
                href={p.listingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-accent hover:underline"
              >
                {p.listingImageUrl ? (
                  <img src={p.listingImageUrl} alt="" className="h-10 w-10 rounded-sm object-cover" />
                ) : (
                  <span className="h-10 w-10 rounded-sm bg-line" />
                )}
                <span className="truncate">{p.listingTitle}</span>
              </a>
            </td>
            <td className="py-2 pr-4">
              <button
                onClick={() => onToggleFavorite(p.id, !p.isFavorite)}
                aria-label={p.isFavorite ? "Remove from favorites" : "Add to favorites"}
                className={`text-lg ${p.isFavorite ? "text-warn" : "text-line hover:text-warn"}`}
              >
                {p.isFavorite ? "★" : "☆"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}