"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

// design-system-v1.md §10 — Switch: radius-full pill, brand-primary
// track when on. Used specifically for Settings-style booleans (see
// design-system-v1.md §22) — distinct from Checkbox, which is for
// list/multi-select contexts.

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: ReactNode;
  description?: string;
}

export function Switch({ id, label, description, className, disabled, ...rest }: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const descId = description ? `${switchId}-description` : undefined;

  return (
    <div className={cn("flex items-start gap-3", disabled && "opacity-40", className)}>
      <span className="relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-line-strong transition-colors has-[:checked]:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2">
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          disabled={disabled}
          aria-describedby={descId}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none ml-0.5 h-5 w-5 translate-x-0 rounded-full bg-surface shadow-xs transition-transform peer-checked:translate-x-4"
        />
      </span>
      {(label || description) && (
        <label htmlFor={switchId} className={cn("flex flex-col", !disabled && "cursor-pointer")}>
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
