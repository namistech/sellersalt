import type { ReactNode } from "react";
import { cn } from "./cn";
import { Label, Caption } from "./Typography";

// Internal layout wrapper shared by Input/Textarea/Select/SearchInput —
// design-system-v1.md §10: "Shared patterns across every input type."
// Not exported from index.ts; it's plumbing for this file's siblings,
// not a standalone primitive of its own.

export interface FormFieldProps {
  id: string;
  label?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({ id, label, helpText, error, required, children, className }: FormFieldProps) {
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {children}
      {/* Error takes precedence over help text when both are present —
          showing both simultaneously would compete for attention at
          exactly the moment a user needs one clear next step. */}
      {error ? (
        <Caption id={errorId} className="text-danger">
          {error}
        </Caption>
      ) : helpText ? (
        <Caption id={helpId}>{helpText}</Caption>
      ) : null}
    </div>
  );
}

/** Builds the aria-describedby value for a field's control, given error/help state. */
export function describedBy(id: string, error?: string, helpText?: string): string | undefined {
  if (error) return `${id}-error`;
  if (helpText) return `${id}-help`;
  return undefined;
}
