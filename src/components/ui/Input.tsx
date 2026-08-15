"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn, FOCUS_RING } from "./cn";
import { FormField, describedBy } from "./FormField";
import { Spinner } from "./Spinner";

// design-system-v1.md §10 — Input. One height (40px, matching Button's
// "default" size) rather than a size prop: the spec defines a single
// Input height, unlike Button's explicit compact/default/large scale —
// keeping it to one size here is a deliberate restraint, not an omission.

const CONTROL_BASE =
  "w-full h-10 rounded-sm border border-line bg-surface px-3 text-body-md text-ink placeholder:text-ink-tertiary transition disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-disabled";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  /** e.g. a password show/hide toggle, a unit suffix, a clear button. */
  trailingAction?: ReactNode;
  containerClassName?: string;
}

export function Input({
  id,
  label,
  helpText,
  error,
  required,
  loading,
  disabled,
  leadingIcon,
  trailingAction,
  className,
  containerClassName,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FormField id={inputId} label={label} helpText={helpText} error={error} required={required} className={containerClassName}>
      <div className="relative flex items-center">
        {leadingIcon && (
          <span aria-hidden="true" className="pointer-events-none absolute left-3 flex text-ink-tertiary [&_svg]:h-4 [&_svg]:w-4">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            CONTROL_BASE,
            FOCUS_RING,
            "focus-visible:border-line-focus",
            error && "border-danger focus-visible:ring-danger",
            Boolean(leadingIcon) && "pl-9",
            (Boolean(trailingAction) || loading) && "pr-9",
            className
          )}
          disabled={disabled || loading}
          required={required}
          aria-required={required || undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(inputId, error, helpText)}
          {...rest}
        />
        {loading ? (
          <span className="absolute right-3 flex text-ink-tertiary">
            <Spinner size="xs" aria-hidden />
          </span>
        ) : (
          trailingAction && <span className="absolute right-2 flex">{trailingAction}</span>
        )}
      </div>
    </FormField>
  );
}
