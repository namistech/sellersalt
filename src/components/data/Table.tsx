"use client";

import { useMemo, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Inbox } from "lucide-react";
import { cn, Checkbox, Skeleton, Text } from "@/components/ui";

// design-system-v1.md §11 — generic table foundation. Deliberately
// domain-agnostic: `Column<T>` and `rows: T[]` mean this same
// component can render Prospects, Clients, Students, Transactions,
// etc. later without touching this file (frontend-execution-plan-v1.md
// §14 lists exactly that requirement).

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
}

export type TableDensity = "compact" | "comfortable";

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  selectedIds?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  onRowClick?: (row: T) => void;
  density?: TableDensity;
  loading?: boolean;
  skeletonRowCount?: number;
  emptyState?: ReactNode;
  className?: string;
  "aria-label": string;
}

// h-9 (36px) / h-14 (56px) — both real Tailwind default spacing keys;
// Tailwind's default scale skips 13, so h-13 would silently not compile.
const ROW_HEIGHT: Record<TableDensity, string> = {
  compact: "h-9",
  comfortable: "h-14",
};

const CELL_PADDING: Record<TableDensity, string> = {
  compact: "px-3 py-2",
  comfortable: "px-4 py-3",
};

const ALIGN_CLASS: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

function DefaultEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <Inbox aria-hidden className="h-6 w-6 text-ink-tertiary" />
      <Text size="body-sm" color="secondary">
        No results.
      </Text>
    </div>
  );
}

export function Table<T>({
  columns,
  rows,
  getRowId,
  sortKey,
  sortDirection = "asc",
  onSort,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onRowClick,
  density = "comfortable",
  loading,
  skeletonRowCount = 5,
  emptyState,
  className,
  "aria-label": ariaLabel,
}: TableProps<T>) {
  const selectable = Boolean(onSelectRow);
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedIds?.has(getRowId(r)));
  const someSelected = selectable && !allSelected && rows.some((r) => selectedIds?.has(getRowId(r)));

  const rowIds = useMemo(() => rows.map(getRowId), [rows, getRowId]);

  return (
    <div className={cn("overflow-x-auto rounded-md border border-line", className)}>
      <table role="table" aria-label={ariaLabel} className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line-subtle">
            {selectable && (
              <th scope="col" className={cn(CELL_PADDING[density], "w-10")}>
                <Checkbox
                  aria-label="Select all rows"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={onSelectAll}
                />
              </th>
            )}
            {columns.map((col) => {
              const isSorted = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  style={{ width: col.width }}
                  className={cn(CELL_PADDING[density], "text-label-md text-ink-secondary", ALIGN_CLASS[col.align ?? "left"])}
                  aria-sort={isSorted ? (sortDirection === "asc" ? "ascending" : "descending") : col.sortable ? "none" : undefined}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort?.(col.key)}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      {col.header}
                      {isSorted &&
                        (sortDirection === "asc" ? (
                          <ChevronUp aria-hidden className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown aria-hidden className="h-3.5 w-3.5" />
                        ))}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRowCount }).map((_, i) => (
              <tr key={i} className={cn(ROW_HEIGHT[density], "border-b border-line-subtle")}>
                {selectable && (
                  <td className={CELL_PADDING[density]}>
                    <Skeleton variant="block" className="h-4 w-4" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={CELL_PADDING[density]}>
                    <Skeleton variant="text" className="w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)}>{emptyState ?? <DefaultEmptyState />}</td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const id = rowIds[i]!;
              const selected = selectedIds?.has(id);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-line-subtle last:border-b-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-surface-muted",
                    selected && "bg-accent-soft"
                  )}
                >
                  {selectable && (
                    <td className={CELL_PADDING[density]} onClick={(e) => e.stopPropagation()}>
                      <Checkbox aria-label={`Select row ${id}`} checked={selected} onChange={() => onSelectRow?.(id)} />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn(CELL_PADDING[density], "text-body-sm text-ink", ALIGN_CLASS[col.align ?? "left"])}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
