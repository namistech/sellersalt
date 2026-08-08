import Link from "next/link";

export function SpyTabs({ active }: { active: "find" | "tracked" }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-line">
      <Link
        href="/spy"
        className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
          active === "find" ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
        }`}
      >
        Track a new shop
      </Link>
      <Link
        href="/spy/tracked"
        className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
          active === "tracked" ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
        }`}
      >
        Tracked shops
      </Link>
    </div>
  );
}
