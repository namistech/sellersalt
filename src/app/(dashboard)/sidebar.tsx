"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/prospects", label: "Prospects" },
  { href: "/trends", label: "Trends" },
  { href: "/inactive", label: "Dropped shops" },
  { href: "/favorites", label: "Favorites" },
  { href: "/connectors", label: "Connectors" },
  { href: "/jobs", label: "Jobs" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar({
  userName,
  organizationName,
}: {
  userName?: string | null;
  organizationName?: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col justify-between border-r border-line bg-surface px-4 py-6">
      <div>
        <div className="mb-8 px-2">
          <div className="text-lg font-semibold tracking-tight text-ink">Anadash</div>
          {organizationName && (
            <div className="mt-0.5 truncate text-xs text-muted">{organizationName}</div>
          )}
        </div>

        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-sm px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-accent-soft text-accent" : "text-ink hover:bg-paper"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-line pt-4">
        <div className="mb-2 truncate px-2 text-xs text-muted">{userName}</div>
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-sm px-3 py-2 text-left text-sm text-muted transition hover:bg-paper hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
