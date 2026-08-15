import { Check, ChevronDown, Store } from "lucide-react";
import { cn, FOCUS_RING, StatusIndicator, Text, Caption } from "@/components/ui";
import type { ConnectedShopSummary } from "@/services/types";
import { useDropdown } from "./dropdown-utils";

// The third, distinct switcher — which Connected Shop's Operate
// workspace is active. Only relevant inside Operate, only rendered
// when there's more than one Connected Shop. Store icon (never a
// generic building/folder icon) reinforces this is specifically about
// a Connected Shop, never a Research Shop — docs/design/information-architecture-v1.md
// "Critical Shop Distinction."

export interface ConnectedShopSelectorProps {
  shops: ConnectedShopSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function ConnectedShopSelector({ shops, activeId, onSelect, className }: ConnectedShopSelectorProps) {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();
  if (shops.length === 0) return null;

  const active = shops.find((s) => s.id === activeId) ?? shops[0]!;

  // A single Connected Shop needs no selector at all — just a label.
  if (shops.length === 1) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Store aria-hidden className="h-4 w-4 text-ink-tertiary" />
        <Text as="span" size="body-sm" weight="medium">
          {active.label}
        </Text>
        <StatusIndicator status={active.status === "disconnected" ? "disconnected" : active.status} />
      </span>
    );
  }

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn("inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 transition hover:bg-surface-muted", FOCUS_RING)}
      >
        <Store aria-hidden className="h-4 w-4 text-ink-tertiary" />
        <Text as="span" size="body-sm" weight="medium">
          {active.label}
        </Text>
        <StatusIndicator status={active.status} />
        <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 text-ink-tertiary transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div role="listbox" aria-label="Switch connected shop" className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-line bg-surface p-1 shadow-md">
          {shops.map((shop) => {
            const selected = shop.id === active.id;
            return (
              <button
                key={shop.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onSelect(shop.id);
                  setOpen(false);
                }}
                className={cn("flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left transition hover:bg-surface-muted", FOCUS_RING)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Text as="span" size="body-sm" className="block truncate">
                    {shop.label}
                  </Text>
                  <Caption className="capitalize">{shop.platform}</Caption>
                </span>
                <span className="flex items-center gap-2">
                  <StatusIndicator status={shop.status} />
                  {selected && <Check aria-hidden className="h-4 w-4 shrink-0 text-accent" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
