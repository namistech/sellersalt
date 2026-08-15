import Link from "next/link";
import { cn, FOCUS_RING } from "@/components/ui";

// Route-based tabs (two real pages, /spy and /spy/tracked) — visually
// identical to components/ui/Tabs' underline treatment
// (design-system-v1.md §15: "same pattern" for secondary nav and object
// tabs), but built with real <Link>s since components/ui/Tabs controls
// panel visibility by value, not routes, and there are only ever two
// destinations here — not worth a new shared "route tabs" primitive.

export function SpyTabs({ active }: { active: "find" | "tracked" }) {
  return (
    <div className="mb-6 flex gap-6 border-b border-line-subtle">
      <Link
        href="/spy"
        className={cn(
          "relative -mb-px border-b-2 py-3 text-body-md font-medium transition",
          FOCUS_RING,
          active === "find" ? "border-accent text-ink" : "border-transparent text-ink-secondary hover:text-ink"
        )}
      >
        Track a new shop
      </Link>
      <Link
        href="/spy/tracked"
        className={cn(
          "relative -mb-px border-b-2 py-3 text-body-md font-medium transition",
          FOCUS_RING,
          active === "tracked" ? "border-accent text-ink" : "border-transparent text-ink-secondary hover:text-ink"
        )}
      >
        Tracked shops
      </Link>
    </div>
  );
}
