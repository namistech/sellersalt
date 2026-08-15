"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Package, Search, ShoppingBag, Store } from "lucide-react";
import { cn, SearchInput, Text, Caption } from "@/components/ui";
// Reused directly (not barrel-exported — internal to the ui/ overlay
// components) rather than reimplementing portal/focus-trap/Escape
// mechanics a third time. See src/components/ui/overlay-utils.ts.
import { useMounted, useOverlay } from "@/components/ui/overlay-utils";
import type { SearchResultItem } from "@/services/types";

// design-system-v1.md §15 — Global search lives INSIDE the command
// palette, not as a separate surface (this task's own [SPEC DECISION]).
// Frontend-only per this task's brief: results are a live substring
// filter over mock data, no real search infrastructure. The palette
// itself, keyboard model, and result grouping are real and reusable —
// only the data source is mock.

const KIND_ICON: Record<SearchResultItem["kind"], typeof Search> = {
  page: Search,
  prospect: Package,
  connectedShop: Store,
  researchShop: ShoppingBag,
};

const KIND_LABEL: Record<SearchResultItem["kind"], string> = {
  page: "Pages",
  prospect: "Prospects",
  connectedShop: "Connected Shops",
  researchShop: "Research Shops",
};

export interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  results: SearchResultItem[];
}

export function GlobalSearch({ open, onClose, results }: GlobalSearchProps) {
  const mounted = useMounted();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputId = useId();
  const { containerRef } = useOverlay<HTMLDivElement>({ open, onClose });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const grouped = useMemo(() => {
    const filtered = query.trim() ? results.filter((r) => r.label.toLowerCase().includes(query.toLowerCase())) : results;
    const groups = new Map<SearchResultItem["kind"], SearchResultItem[]>();
    for (const item of filtered) {
      if (!groups.has(item.kind)) groups.set(item.kind, []);
      groups.get(item.kind)!.push(item);
    }
    return groups;
  }, [query, results]);

  if (!mounted || !open) return null;

  function handleSelect(item: SearchResultItem) {
    if (item.kind === "page" && item.href) {
      router.push(item.href);
      onClose();
      return;
    }
    // Entity-type mock results (prospects/shops) have no real
    // destination yet — this is explicitly frontend-only. Closing the
    // palette is the honest behavior rather than navigating to a
    // fabricated page.
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div aria-hidden="true" className="absolute inset-0 bg-paper-inverse/40" onClick={onClose} />
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label="Search" tabIndex={-1} className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
        <div className="border-b border-line-subtle p-3">
          <SearchInput
            id={inputId}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            placeholder="Search prospects, shops, pages…"
            aria-label="Search SellerSalt"
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {grouped.size === 0 && (
            <div className="px-3 py-6 text-center">
              <Text size="body-sm" color="tertiary">
                No results for "{query}".
              </Text>
            </div>
          )}
          {Array.from(grouped.entries()).map(([kind, items]) => {
            const Icon = KIND_ICON[kind];
            return (
              <div key={kind} className="mb-2 last:mb-0">
                <Caption className="block px-2 py-1">{KIND_LABEL[kind]}</Caption>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn("flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition hover:bg-surface-muted")}
                  >
                    <Icon aria-hidden className="h-4 w-4 shrink-0 text-ink-tertiary" />
                    <span className="min-w-0 flex-1">
                      <Text as="span" size="body-sm" className="block truncate">
                        {item.label}
                      </Text>
                      {item.sublabel && <Caption className="block truncate">{item.sublabel}</Caption>}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-line-subtle px-3 py-2">
          <Caption>Natural-language search (e.g. "shops selling wedding invitations") is planned — see docs/ai/assistant.md.</Caption>
          <Caption>Esc to close</Caption>
        </div>
      </div>
    </div>,
    document.body
  );
}
