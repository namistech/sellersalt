"use client";

import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn, FOCUS_RING } from "./cn";
import { FormField, describedBy } from "./FormField";

// design-system-v1.md §10 — Select: "native-feeling dropdown" — a real
// <select> (semantic HTML, native keyboard/screen-reader behavior for
// free) with a custom chevron overlay, same height as Input.

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options: SelectOption[];
  containerClassName?: string;
}

export function Select({
  id,
  label,
  helpText,
  error,
  required,
  placeholder,
  options,
  disabled,
  className,
  containerClassName,
  value,
  defaultValue,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  // Only supply a fallback defaultValue when the caller controls
  // neither value nor defaultValue, so the placeholder option starts
  // selected instead of the browser defaulting to the first real option.
  const resolvedDefaultValue = value === undefined && defaultValue === undefined && placeholder ? "" : defaultValue;

  return (
    <FormField id={selectId} label={label} helpText={helpText} error={error} required={required} className={containerClassName}>
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "w-full h-10 appearance-none rounded-sm border border-line bg-surface pl-3 pr-9 text-body-md text-ink transition disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-disabled",
            FOCUS_RING,
            "focus-visible:border-line-focus",
            error && "border-danger focus-visible:ring-danger",
            className
          )}
          disabled={disabled}
          required={required}
          aria-required={required || undefined}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(selectId, error, helpText)}
          value={value}
          defaultValue={resolvedDefaultValue}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className={cn("pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2", disabled ? "text-ink-disabled" : "text-ink-tertiary")}
        />
      </div>
    </FormField>
  );
}
