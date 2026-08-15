"use client";

import { useId, type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { cn, FOCUS_RING } from "./cn";

// design-system-v1.md §10 — Search: visually lighter than a form Input
// (bg-surface-muted, no visible border until focused) since it typically
// lives inside a toolbar/filter bar rather than a form. A distinct
// component from Input rather than an Input variant, because that
// visual treatment genuinely differs, not just its icon.

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  /** Called when the clear (×) button is pressed. Only shown when a value is present and this is provided. */
  onClear?: () => void;
  "aria-label"?: string;
}

export function SearchInput({
  id,
  value,
  onClear,
  className,
  placeholder = "Search…",
  "aria-label": ariaLabel = "Search",
  ...rest
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasValue = typeof value === "string" ? value.length > 0 : Boolean(value);

  return (
    <div className="relative flex items-center">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 h-4 w-4 text-ink-tertiary" />
      <input
        id={inputId}
        type="search"
        role="searchbox"
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        className={cn(
          "w-full h-9 rounded-sm border border-transparent bg-surface-muted pl-9 pr-9 text-body-md text-ink placeholder:text-ink-tertiary transition",
          "focus:border-line-focus focus:bg-surface",
          FOCUS_RING,
          className
        )}
        {...rest}
      />
      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className={cn("absolute right-2 flex h-5 w-5 items-center justify-center rounded-full text-ink-tertiary hover:bg-surface hover:text-ink", FOCUS_RING)}
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
