"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, Settings as SettingsIcon } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/prospects": "Prospects",
  "/spy": "Spy on Competitor",
  "/trends": "Trends",
  "/inactive": "Dropped shops",
  "/favorites": "Favorites",
  "/connectors": "Connectors",
  "/jobs": "Jobs",
  "/settings": "Settings",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const base = "/" + pathname.split("/")[1];
  return TITLES[base] ?? "Anadash";
}

export function TopBar({ userName, userEmail }: { userName?: string | null; userEmail?: string | null }) {
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initial = (userName ?? userEmail ?? "?").charAt(0).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-6">
      <h1 className="text-base font-semibold text-ink">{titleFor(pathname)}</h1>

      <div className="flex items-center gap-3">
        <ThemeToggle iconOnly />

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-paper"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="max-w-[140px] truncate text-sm font-medium text-ink">{userName ?? userEmail}</span>
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-md border border-line bg-surface py-1 shadow-lg">
              <a
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-paper"
              >
                <SettingsIcon className="h-4 w-4" /> Settings
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-paper"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
