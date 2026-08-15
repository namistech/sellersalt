"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

// design-system-v1.md §10 — Radio: circular, brand-primary fill when
// selected. Same has-[:checked] pattern as Checkbox.

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  description?: string;
}

export function Radio({ id, label, description, className, disabled, ...rest }: RadioProps) {
  const generatedId = useId();
  const radioId = id ?? generatedId;
  const descId = description ? `${radioId}-description` : undefined;

  return (
    <div className={cn("flex items-start gap-2", disabled && "opacity-40", className)}>
      <span className="relative mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface transition-colors has-[:checked]:border-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2">
        <input
          id={radioId}
          type="radio"
          disabled={disabled}
          aria-describedby={descId}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <span aria-hidden="true" className="h-2 w-2 scale-0 rounded-full bg-accent transition-transform peer-checked:scale-100" />
      </span>
      {(label || description) && (
        <label htmlFor={radioId} className={cn("flex flex-col", !disabled && "cursor-pointer")}>
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
}
