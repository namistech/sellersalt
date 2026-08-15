import type { ReactNode } from "react";
import { cn } from "./cn";

// design-system-v1.md §11 — Badge: radius-full pill, subtle background
// + strong text color per semantic variant. Deliberately no `color`
// prop — a raw-hex escape hatch would defeat the entire point of a
// constrained semantic API (design-system-v1.md §"API DESIGN" in the
// task brief: "Do not allow arbitrary colors as the normal API").

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "gold";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-surface-muted text-ink-secondary",
  success: "bg-success-subtle text-success-strong",
  warning: "bg-warn-subtle text-warn",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
  // No "gold-subtle" token exists in design-system-v1.md's status set
  // (gold is a single brand-accent value, not a full status token
  // family) — computed here via Tailwind's opacity modifier on the
  // existing `gold` token rather than inventing a new raw hex value.
  gold: "bg-gold/15 text-gold",
};

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-sm font-medium [&_svg]:h-3 [&_svg]:w-3",
        VARIANT_CLASS[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
