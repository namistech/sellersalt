"use client";

import { Check, ChevronDown, GraduationCap, Users } from "lucide-react";
import { cn, FOCUS_RING, SearchInput, Text, Caption } from "@/components/ui";
import { useState } from "react";
import type { ScopeOption } from "@/services/types";
import { useDropdown } from "./dropdown-utils";

// The Agency "Client" / Institute "Cohort" scope selector — deliberately
// a different visual pattern (folder-style icon, search-to-switch) from
// WorkspaceSwitcher, per the IA's "distinct icon, so users can tell them
// apart even though both are dropdown switchers." Frequent, expected UI
// for Agency/Institute — unlike WorkspaceSwitcher, always rendered when
// `scope` is present on the context.

export interface ScopeSwitcherProps {
  kind: "client" | "cohort";
  current: ScopeOption;
  options: ScopeOption[];
  onSelect: (id: string) => void;
  className?: string;
}

export function ScopeSwitcher({ kind, current, options, onSelect, className }: ScopeSwitcherProps) {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();
  const [query, setQuery] = useState("");
  const Icon = kind === "client" ? Users : GraduationCap;
  const kindLabel = kind === "client" ? "Client" : "Cohort";
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 transition hover:bg-surface-muted",
          FOCUS_RING
        )}
      >
        <Icon aria-hidden className="h-4 w-4 text-ink-tertiary" />
        <span className="text-left">
          <Caption className="block">{kindLabel}</Caption>
          <Text as="span" size="body-sm" weight="medium">
            {current.label}
          </Text>
        </span>
        <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 text-ink-tertiary transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-line bg-surface shadow-md">
          {options.length > 5 && (
            <div className="border-b border-line-subtle p-2">
              <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery("")} aria-label={`Search ${kindLabel.toLowerCase()}s`} placeholder={`Search ${kindLabel.toLowerCase()}s…`} />
            </div>
          )}
          <div role="listbox" aria-label={`Switch ${kindLabel.toLowerCase()}`} className="max-h-72 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2">
                <Text size="body-sm" color="tertiary">
                  No matches.
                </Text>
              </div>
            )}
            {filtered.map((opt) => {
              const selected = opt.id === current.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelect(opt.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn("flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left transition hover:bg-surface-muted", FOCUS_RING)}
                >
                  <span className="min-w-0">
                    <Text as="span" size="body-sm" className="block truncate">
                      {opt.label}
                    </Text>
                    {opt.sublabel && <Caption className="block truncate">{opt.sublabel}</Caption>}
                  </span>
                  {selected && <Check aria-hidden className="h-4 w-4 shrink-0 text-accent" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
