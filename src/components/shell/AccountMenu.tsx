"use client";

import type { ReactNode } from "react";
import { CreditCard, HelpCircle, LogOut, Settings as SettingsIcon, ShieldCheck, User as UserIcon } from "lucide-react";
import { cn, Avatar, FOCUS_RING, Text, Caption } from "@/components/ui";
import { useDropdown } from "./dropdown-utils";

// design-system-v1.md §15/§21 — "Admin console" is the one place the
// admin-only console link lives — never a sidebar group. This is the
// concrete fix for the anti-pattern the current real sidebar has today
// (an "Admin" nav group appended alongside customer nav) — see this
// task's final report.

export interface AccountMenuProps {
  name: string;
  email: string;
  roleLabel: string;
  isAdmin?: boolean;
  onNavigate: (href: string) => void;
  onSignOut: () => void;
  className?: string;
}

export function AccountMenu({ name, email, roleLabel, isAdmin, onNavigate, onSignOut, className }: AccountMenuProps) {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();

  function go(href: string) {
    onNavigate(href);
    setOpen(false);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className={cn("flex items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-surface-muted", FOCUS_RING)}
      >
        <Avatar name={name} size="sm" />
        <span className="hidden text-left sm:block">
          <Text as="span" size="body-sm" weight="medium" className="block max-w-[140px] truncate">
            {name}
          </Text>
          <Caption className="block">{roleLabel}</Caption>
        </span>
      </button>

      {open && (
        <div role="menu" aria-label="Account" className="absolute right-0 top-full z-20 mt-2 w-56 rounded-md border border-line bg-surface py-1 shadow-md">
          <div className="border-b border-line-subtle px-3 py-2">
            <Text as="span" size="body-sm" weight="medium" className="block truncate">
              {name}
            </Text>
            <Caption className="block truncate">{email}</Caption>
          </div>
          <MenuLink icon={<UserIcon />} label="Profile" onClick={() => go("/settings/profile")} />
          <MenuLink icon={<SettingsIcon />} label="Settings" onClick={() => go("/settings")} />
          <MenuLink icon={<CreditCard />} label="Billing" onClick={() => go("/settings/billing")} />
          <MenuLink icon={<HelpCircle />} label="Help & support" onClick={() => go("/contact")} />
          {isAdmin && (
            <>
              <div className="my-1 border-t border-line-subtle" />
              <MenuLink icon={<ShieldCheck />} label="Admin console" onClick={() => go("/admin")} />
            </>
          )}
          <div className="my-1 border-t border-line-subtle" />
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm text-danger transition hover:bg-surface-muted", FOCUS_RING)}
          >
            <LogOut aria-hidden className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm text-ink transition hover:bg-surface-muted", FOCUS_RING)}
    >
      <span aria-hidden className="[&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      {label}
    </button>
  );
}
