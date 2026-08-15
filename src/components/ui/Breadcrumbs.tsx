import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "./cn";

// design-system-v1.md §15 — text-secondary links, chevron separators,
// current page (no href) shown as non-link text-primary. "Truncate
// middle segments on narrow viewports" is implemented with two parallel
// renders toggled by Tailwind's responsive display classes (hidden/flex)
// rather than JS viewport detection — no resize-observer dependency
// needed, and it can't get out of sync with the actual CSS breakpoint.

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

function Crumb({ item, isLast }: { item: BreadcrumbItem; isLast: boolean }) {
  if (isLast || !item.href) {
    return (
      <span className="text-body-sm text-ink" aria-current={isLast ? "page" : undefined}>
        {item.label}
      </span>
    );
  }
  return (
    <a href={item.href} className="text-body-sm text-ink-secondary hover:text-ink hover:underline">
      {item.label}
    </a>
  );
}

function Separator() {
  return <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-tertiary" />;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  const shouldTruncate = items.length > 4;
  const truncated = shouldTruncate ? [items[0]!, ...items.slice(-2)] : items;

  const renderTrail = (list: BreadcrumbItem[], withEllipsis: boolean) => (
    <ol className="flex items-center gap-2">
      {list.map((item, i) => (
        // Keyed by position, not href/label: breadcrumb order is fixed
        // (never reordered/filtered), and href/label are not guaranteed
        // unique — e.g. multiple segments sharing a "#" placeholder —
        // which produced a real duplicate-key React warning during
        // verification (see this task's final report).
        <Fragment key={i}>
          {i > 0 && (
            <li aria-hidden="true" className="flex">
              <Separator />
            </li>
          )}
          {withEllipsis && i === 1 && (
            <>
              <li className="text-body-sm text-ink-tertiary">…</li>
              <li aria-hidden="true" className="flex">
                <Separator />
              </li>
            </>
          )}
          <li className="flex min-w-0">
            <Crumb item={item} isLast={i === list.length - 1} />
          </li>
        </Fragment>
      ))}
    </ol>
  );

  return (
    <nav aria-label="Breadcrumb" className={cn("flex", className)}>
      {shouldTruncate ? (
        <>
          <span className="flex sm:hidden">{renderTrail(truncated, true)}</span>
          <span className="hidden sm:flex">{renderTrail(items, false)}</span>
        </>
      ) : (
        renderTrail(items, false)
      )}
    </nav>
  );
}
