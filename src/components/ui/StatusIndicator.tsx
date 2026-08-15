import { cn } from "./cn";
import { Badge, type BadgeVariant } from "./Badge";

// design-system-v1.md §11: "Status: a specific Badge variant... The
// single component every status concept in the product renders
// through." StatusIndicator maps domain status values (connector
// status, sync state, etc.) onto that one Badge implementation rather
// than each screen inventing its own status pill.

export type Status =
  | "connected"
  | "syncing"
  | "pending"
  | "disconnected"
  | "failed"
  | "active"
  | "inactive"
  | "enabled"
  | "disabled"
  | "verified"
  | "unverified";

// enabled/disabled/verified/unverified added in the data+intelligence
// task (frontend-execution-plan-v1.md §11) — same component, extended
// rather than duplicated, per that section's explicit instruction.
const STATUS_CONFIG: Record<Status, { variant: BadgeVariant; label: string; pulse?: boolean }> = {
  connected: { variant: "success", label: "Connected" },
  active: { variant: "success", label: "Active" },
  syncing: { variant: "info", label: "Syncing…", pulse: true },
  pending: { variant: "warning", label: "Pending" },
  disconnected: { variant: "neutral", label: "Disconnected" },
  inactive: { variant: "neutral", label: "Inactive" },
  failed: { variant: "danger", label: "Failed" },
  enabled: { variant: "success", label: "Enabled" },
  disabled: { variant: "neutral", label: "Disabled" },
  verified: { variant: "success", label: "Verified" },
  unverified: { variant: "neutral", label: "Unverified" },
};

const DOT_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-ink-tertiary",
  success: "bg-success",
  warning: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
  gold: "bg-gold",
};

export interface StatusIndicatorProps {
  status: Status;
  /** Overrides the default label text (e.g. "Failed 2 hours ago" instead of "Failed"). */
  label?: string;
  className?: string;
}

/**
 * Text label is always shown — the dot is a supplementary, not the
 * only, signal (design-system-v1.md §26: never color alone).
 */
export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant={config.variant}
      className={className}
      icon={
        <span
          aria-hidden="true"
          className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[config.variant], config.pulse && "motion-safe:animate-pulse")}
        />
      }
    >
      {label ?? config.label}
    </Badge>
  );
}
