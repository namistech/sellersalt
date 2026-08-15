import { cn } from "./cn";

// design-system-v1.md §24 — loading states use motion, but must respect
// prefers-reduced-motion (§26). `motion-safe:animate-spin` is Tailwind's
// built-in variant for exactly this: it spins normally, and simply
// stays static (a valid, honest reduced-motion fallback) when the user
// has that OS preference set.

export type SpinnerSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASS: Record<SpinnerSize, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Screen-reader label. Defaults to "Loading" — set to "" if a
   * surrounding element already announces the loading state (e.g. a
   * button with aria-busy) to avoid double-announcing. */
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}

export function Spinner({ size = "sm", className, "aria-label": ariaLabel = "Loading", "aria-hidden": ariaHidden }: SpinnerProps) {
  return (
    <svg
      className={cn(SIZE_CLASS[size], "motion-safe:animate-spin text-current", className)}
      viewBox="0 0 24 24"
      fill="none"
      role={ariaHidden ? undefined : "status"}
      aria-hidden={ariaHidden ? "true" : undefined}
      aria-label={ariaHidden ? undefined : ariaLabel}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  );
}
