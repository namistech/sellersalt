"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "./cn";

// design-system-v1.md §10 — Checkbox: 18-20px square, radius-xs,
// brand-primary fill when checked. Built as a real native
// <input type="checkbox"> (visually hidden but present and focusable)
// plus a styled sibling box, using Tailwind's has-[:checked] variant
// (Tailwind 3.4+, already the installed version — no new dependency)
// so the visual state is driven by real DOM/CSS, not JS.

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  description?: string;
}

// forwardRef added in the data/intelligence task: Table's "select all"
// header checkbox needs to set the native `indeterminate` DOM property,
// which has no HTML attribute/React prop equivalent and can only be set
// imperatively via a ref to the real <input>.
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { id, label, description, className, disabled, ...rest },
  ref
) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const descId = description ? `${checkboxId}-description` : undefined;

  return (
    <div className={cn("flex items-start gap-2", disabled && "opacity-40", className)}>
      {/* has-[:indeterminate] added alongside has-[:checked] — the
          native `indeterminate` DOM property (set imperatively via ref,
          e.g. Table's "select all" header checkbox) has no styling
          effect on its own; without this, an indeterminate checkbox
          silently rendered as plain unchecked, found during this
          task's browser verification pass. */}
      <span className="relative mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-xs border border-line-strong bg-surface transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent has-[:indeterminate]:border-accent has-[:indeterminate]:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          disabled={disabled}
          aria-describedby={descId}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        {/* In this codebase's actual usage (Table's select-all), checked
            and indeterminate are always mutually exclusive by the
            caller's own logic, so these two conditions never both
            resolve true in practice — no extra "not indeterminate"
            exclusion needed on the Check icon. */}
        <Minus aria-hidden="true" strokeWidth={3} className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-indeterminate:opacity-100" />
        <Check aria-hidden="true" strokeWidth={3} className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100" />
      </span>
      {(label || description) && (
        <label htmlFor={checkboxId} className={cn("flex flex-col", !disabled && "cursor-pointer")}>
          {label && <span className="text-body-sm text-ink">{label}</span>}
          {description && (
            <span id={descId} className="text-meta text-ink-tertiary">
              {description}
            </span>
          )}
        </label>
      )}
    </div>
  );
});
