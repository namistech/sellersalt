import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn, Text } from "@/components/ui";

// design-system-v1.md §24 "Empty / Loading / Error States" — the one
// shared Tier-3 primitive for every non-happy-path list/page state
// (first-use empty, no-results, error, permission-denied, feature
// unavailable). Reused across every Wave 4 Discover screen instead of
// each screen re-implementing "icon + message + CTA" inline.
//
// Table.tsx has its own private DefaultEmptyState for the truly generic
// "no rows" case inside a table cell — this component is the richer,
// page/section-level version with a title, optional description, and
// optional action, per the design system's fuller empty-state pattern.

export type EmptyStateTone = "neutral" | "error";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: EmptyStateTone;
  className?: string;
}

export function EmptyState({ icon, title, description, action, tone = "neutral", className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 py-12 text-center", className)}>
      <span aria-hidden className={cn("[&_svg]:h-6 [&_svg]:w-6", tone === "error" ? "text-danger" : "text-ink-tertiary")}>
        {icon ?? <Inbox />}
      </span>
      <Text size="body-md" weight="medium">
        {title}
      </Text>
      {description && (
        <Text size="body-sm" color="secondary" className="max-w-sm">
          {description}
        </Text>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
