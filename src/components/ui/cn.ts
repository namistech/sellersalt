// Minimal, dependency-free class-name joiner (no clsx/tailwind-merge
// installed — see docs/design/frontend-execution-plan-v1.md, "Do NOT
// install dependencies"). Accepts strings, falsy values, and
// conditional records, matching the common `cn()`/`clsx()` call shape
// used throughout the primitive/core component layer.
export type ClassValue = string | number | null | undefined | false | Record<string, boolean | null | undefined> | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else if (typeof input === "object") {
      for (const key in input) {
        if (input[key]) out.push(key);
      }
    }
  }
  return out.join(" ");
}

// Shared focus-visible treatment (design-system-v1.md §3 border-focus /
// §26 accessibility) — every interactive primitive uses this exact
// combination so focus rings are visually identical product-wide.
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
