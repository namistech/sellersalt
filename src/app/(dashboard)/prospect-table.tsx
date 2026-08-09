"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface ProspectRow {
  id: string;
  keyword: string;
  shopExternalId: string;
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
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = (a[sortKey] ?? 0) as number;
      const bv = (b[sortKey] ?? 0) as number;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [rows, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const paginated = sorted.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  function handleSort(key: SortKey) {
    setPage(0); // sorting changes the ordering, so start back at page 1
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
    <>
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
        {paginated.map((p) => (
          <tr key={p.id}>
            <td className="py-2 pr-4">
              <div className="flex items-center gap-2">
                <Link
                  href={`/shops/${p.shopExternalId}`}
                  className="flex items-center gap-2 font-medium text-accent hover:underline"
                >
                  {p.shopIconUrl ? (
                    <img src={p.shopIconUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="h-6 w-6 rounded-full bg-line" />
                  )}
                  {p.shopName}
                </Link>
                <a
                  href={p.shopUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open shop on Etsy"
                  className="text-muted hover:text-ink"
                  title="Open on Etsy"
                >
                  ↗
                </a>
              </div>
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
    {pageCount > 1 && (
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>
          Showing {clampedPage * PAGE_SIZE + 1}–{Math.min((clampedPage + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary !py-1 !px-2 text-xs disabled:opacity-40"
            disabled={clampedPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </button>
          <span>
            Page {clampedPage + 1} of {pageCount}
          </span>
          <button
            className="btn-secondary !py-1 !px-2 text-xs disabled:opacity-40"
            disabled={clampedPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    )}
    </>
  );
}
