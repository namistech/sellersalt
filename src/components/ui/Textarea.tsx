"use client";

import { useId, type TextareaHTMLAttributes } from "react";
import { cn, FOCUS_RING } from "./cn";
import { FormField, describedBy } from "./FormField";

// design-system-v1.md §10 — Textarea: same form conventions as Input,
// 96px min-height, vertical-resize only.

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
}

export function Textarea({
  id,
  label,
  helpText,
  error,
  required,
  className,
  containerClassName,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <FormField id={textareaId} label={label} helpText={helpText} error={error} required={required} className={containerClassName}>
      <textarea
        id={textareaId}
        rows={4}
        className={cn(
          "w-full min-h-[96px] resize-y rounded-sm border border-line bg-surface px-3 py-2 text-body-md text-ink placeholder:text-ink-tertiary transition disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-disabled",
          FOCUS_RING,
          "focus-visible:border-line-focus",
          error && "border-danger focus-visible:ring-danger",
          className
        )}
        required={required}
        aria-required={required || undefined}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(textareaId, error, helpText)}
        {...rest}
      />
    </FormField>
  );
}
