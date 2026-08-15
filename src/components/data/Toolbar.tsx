"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn, Text, Caption, Button, IconButton, FOCUS_RING } from "@/components/ui";

// design-system-v1.md — generic toolbar/filter primitives that will
// power every research-heavy list screen. Deliberately content-free:
// FilterBar is a layout container, not a fixed set of filters.

export interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

// ---------- FilterGroup — a labeled disclosure/popover trigger ----------

export interface FilterGroupProps {
  label: string;
  /** Shown instead of `label` once a selection is active, e.g. "Price: $10–$50". */
  activeSummary?: string;
  children: ReactNode;
  className?: string;
}

export function FilterGroup({ label, activeSummary, children, className }: FilterGroupProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const isActive = Boolean(activeSummary);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-body-sm transition",
          FOCUS_RING,
          isActive ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink hover:bg-surface-muted"
        )}
      >
        {activeSummary ?? label}
        <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          {/* Click-outside affordance without a global listener: an
              invisible full-viewport layer behind the panel. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div id={panelId} className="absolute left-0 top-full z-20 mt-2 min-w-[240px] rounded-md border border-line bg-surface p-3 shadow-md">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- ActiveFilters — removable chips for currently-applied filters ----------

export interface ActiveFilter {
  key: string;
  label: string;
}

export interface ActiveFiltersProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export function ActiveFilters({ filters, onRemove, onClearAll, className }: ActiveFiltersProps) {
  if (filters.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {filters.map((f) => (
        <span key={f.key} className="inline-flex items-center gap-1 rounded-full bg-surface-muted py-0.5 pl-2.5 pr-1 text-body-sm text-ink-secondary">
          {f.label}
          <IconButton icon={<X />} size="compact" variant="tertiary" aria-label={`Remove filter: ${f.label}`} onClick={() => onRemove(f.key)} className="h-4 w-4" />
        </span>
      ))}
      {onClearAll && filters.length > 1 && (
        <Button variant="link" size="compact" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  );
}

// ---------- SortControl ----------

export interface SortOption {
  value: string;
  label: string;
}

export interface SortControlProps {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SortControl({ options, value, onChange, className }: SortControlProps) {
  return (
    <label className={cn("inline-flex items-center gap-2", className)}>
      <Caption>Sort by</Caption>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("rounded-sm border border-line bg-surface px-2 py-1 text-body-sm text-ink", FOCUS_RING)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ---------- ViewToggle — segmented control ----------

export interface ViewOption {
  value: string;
  label: string;
  icon: ReactNode;
}

export interface ViewToggleProps {
  options: ViewOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ViewToggle({ options, value, onChange, className }: ViewToggleProps) {
  return (
    <div role="group" aria-label="View" className={cn("inline-flex rounded-sm border border-line p-0.5", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            aria-label={opt.label}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-xs transition [&_svg]:h-4 [&_svg]:w-4",
              active ? "bg-accent-soft text-accent" : "text-ink-tertiary hover:text-ink"
            )}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}

// ---------- ResultsCount ----------

export interface ResultsCountProps {
  count: number;
  label?: string; // e.g. "results", "shops", "products"
  className?: string;
}

export function ResultsCount({ count, label = "results", className }: ResultsCountProps) {
  return (
    <Caption className={className}>
      {count.toLocaleString()} {label}
    </Caption>
  );
}

// ---------- BulkActionBar — appears when Table rows are selected ----------

export interface BulkActionBarProps {
  selectedCount: number;
  actions: ReactNode;
  onClear: () => void;
  className?: string;
}

export function BulkActionBar({ selectedCount, actions, onClear, className }: BulkActionBarProps) {
  if (selectedCount === 0) return null;
  return (
    <div className={cn("flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-2.5 shadow-sm", className)}>
      <Text as="span" size="body-sm" weight="medium">
        {selectedCount} selected
      </Text>
      <div className="flex items-center gap-2">{actions}</div>
      <Button variant="link" size="compact" onClick={onClear} className="ml-auto">
        Clear
      </Button>
    </div>
  );
}
