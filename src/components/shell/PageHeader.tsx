import type { ReactNode } from "react";
import { cn, Breadcrumbs, Heading, Text, type BreadcrumbItem } from "@/components/ui";

// The "PageContext" pattern from this task's brief, named PageHeader
// for clarity (a React "Context" object means something specific and
// different in this codebase). Shell-level composition, not a
// domain-specific page — every product page can use this, none of
// them are built in this task.

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  /** e.g. a ScopeSwitcher or ConnectedShopSelector rendered inline under the title. */
  scope?: ReactNode;
  primaryAction?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumbs, scope, primaryAction, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 pb-6", className)}>
      {breadcrumbs && breadcrumbs.length > 1 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading as="h1" size="h1">
            {title}
          </Heading>
          {description && (
            <Text color="secondary" size="body-sm">
              {description}
            </Text>
          )}
          {scope}
        </div>
        {primaryAction && <div className="flex shrink-0 items-center gap-2">{primaryAction}</div>}
      </div>
    </div>
  );
}
