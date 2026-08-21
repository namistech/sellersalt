import Link from "next/link";
import { cn, FOCUS_RING } from "@/components/ui";

// Route-based tabs for Shop Intelligence & Market Research
export function ShopIntelligenceTabs({ active }: { active: "find" | "tracked" }) {
  return (
    <div className="mb-6 flex gap-6 border-b border-line-subtle">
      <Link
        href="/shop-intelligence"
        className={cn(
          "relative -mb-px border-b-2 py-3 text-body-md font-medium transition",
          FOCUS_RING,
          active === "find" ? "border-accent text-ink" : "border-transparent text-ink-secondary hover:text-ink"
        )}
      >
        Track a new shop
      </Link>
      <Link
        href="/shop-intelligence/tracked"
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
