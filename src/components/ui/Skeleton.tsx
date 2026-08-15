import { cn } from "./cn";

// design-system-v1.md §24 — loading placeholders. aria-hidden by
// default: the meaningful "this region is loading" announcement should
// come from the containing region's aria-busy/aria-live, not from each
// individual skeleton block.

export type SkeletonVariant = "text" | "block" | "circle";

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  text: "rounded-sm h-4",
  block: "rounded-md",
  circle: "rounded-full",
};

export interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
}

export function Skeleton({ variant = "block", className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("bg-surface-muted motion-safe:animate-pulse", VARIANT_CLASS[variant], className)} />;
}
