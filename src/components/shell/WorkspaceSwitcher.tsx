import { Briefcase, Check, ChevronsUpDown, GraduationCap, User, type LucideIcon } from "lucide-react";
import { cn, FOCUS_RING, Text, Caption } from "@/components/ui";
import type { AccountType, WorkspaceOption } from "@/services/types";
import { useDropdown } from "./dropdown-utils";

// docs/design/information-architecture-v1.md — Workspace switcher: only
// rendered when a user genuinely has multiple org memberships, never
// permanent chrome for everyone. Distinct icon/pattern from
// ScopeSwitcher and ConnectedShopSelector — these three are never
// merged into one generic control.

const ACCOUNT_ICON: Record<AccountType, LucideIcon> = {
  individual: User,
  agency: Briefcase,
  institute: GraduationCap,
};

export interface WorkspaceSwitcherProps {
  current: WorkspaceOption;
  options: WorkspaceOption[];
  onSelect: (id: string) => void;
  className?: string;
}

export function WorkspaceSwitcher({ current, options, onSelect, className }: WorkspaceSwitcherProps) {
  const { open, setOpen, ref } = useDropdown<HTMLDivElement>();
  const CurrentIcon = ACCOUNT_ICON[current.accountType];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-surface-muted", FOCUS_RING)}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent [&_svg]:h-4 [&_svg]:w-4">
          <CurrentIcon />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <Text as="span" size="body-sm" weight="medium" className="block truncate">
            {current.name}
          </Text>
          <Caption className="block capitalize">{current.accountType}</Caption>
        </span>
        <ChevronsUpDown aria-hidden className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" />
      </button>

      {open && (
        <div role="listbox" aria-label="Switch workspace" className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-line bg-surface p-1 shadow-md">
          {options.map((opt) => {
            const Icon = ACCOUNT_ICON[opt.accountType];
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
                }}
                className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left transition hover:bg-surface-muted", FOCUS_RING)}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-surface-muted text-ink-secondary [&_svg]:h-3.5 [&_svg]:w-3.5">
                  <Icon />
                </span>
                <span className="min-w-0 flex-1">
                  <Text as="span" size="body-sm" className="block truncate">
                    {opt.name}
                  </Text>
                  <Caption className="capitalize">{opt.accountType}</Caption>
                </span>
                {selected && <Check aria-hidden className="h-4 w-4 shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
