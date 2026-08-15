import type { ReactNode } from "react";
import { cn, Card, Heading, Text } from "@/components/ui";
import { Freshness, type FreshnessProps } from "@/components/data";

// design-system-v1.md §12 — the single highest-leverage component in
// the whole design system: one shared card structure, reused by every
// Insight/Issue/Opportunity/Recommendation/Alert/Outcome variant, so
// the product never accumulates N bespoke "card" implementations for
// what is structurally the same object.
//
//   [icon]  [title]                    [severity/status badge]
//   [body]
//   [supporting data]
//   [freshness]                                          [CTA →]

export interface IntelligenceCardProps {
  icon: ReactNode;
  /** Tailwind text-color class applied to the icon, e.g. "text-danger". */
  iconToneClassName?: string;
  title: string;
  severityBadge?: ReactNode;
  children?: ReactNode;
  supportingData?: ReactNode;
  freshness?: FreshnessProps;
  cta?: ReactNode;
  className?: string;
  /** Sets the card's ARIA role — "alert" for urgent items announced immediately, "status" for the rest. */
  role?: "alert" | "status";
}

export function IntelligenceCard({
  icon,
  iconToneClassName = "text-ink-tertiary",
  title,
  severityBadge,
  children,
  supportingData,
  freshness,
  cta,
  className,
  role,
}: IntelligenceCardProps) {
  return (
    <Card role={role} padding="md" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span aria-hidden className={cn("mt-0.5 shrink-0 [&_svg]:h-4 [&_svg]:w-4", iconToneClassName)}>
            {icon}
          </span>
          <Heading as="h4" size="h4">
            {title}
          </Heading>
        </div>
        {severityBadge}
      </div>

      {children && (
        <Text size="body-sm" color="secondary">
          {children}
        </Text>
      )}

      {supportingData}

      {(freshness || cta) && (
        <div className="flex items-center justify-between gap-3">
          {freshness ? <Freshness {...freshness} /> : <span />}
          {cta}
        </div>
      )}
    </Card>
  );
}
