import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn, FOCUS_RING } from "./cn";
import { Spinner } from "./Spinner";
import type { ButtonSize, ButtonVariant } from "./Button";

// design-system-v1.md §9/§8 — icon-only actions are a separate
// component from Button (not an `iconOnly` prop on it) specifically so
// `aria-label` can be a *required* prop here, enforced by the type
// system rather than a runtime check — see §26 "icon-only buttons
// always carry an aria-label."

const BASE = "inline-flex items-center justify-center rounded-md transition disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed";

// Reuses the same variant palette as Button (excluding "link", which
// has no icon-only equivalent) so the two never visually diverge.
const VARIANT_CLASS: Record<Exclude<ButtonVariant, "link">, string> = {
  primary: "bg-accent text-white hover:bg-accent-dark active:bg-accent-active",
  success: "bg-accent text-white hover:bg-accent-dark active:bg-accent-active",
  secondary: "border border-line bg-transparent text-ink hover:bg-surface-muted active:bg-surface-muted",
  tertiary: "bg-transparent text-ink-secondary hover:bg-surface-muted hover:text-ink active:bg-surface-muted",
  destructive: "bg-danger text-white hover:brightness-90 active:brightness-75",
};

// Square sizes — the compact size (32px) meets the §8 minimum
// interactive touch-target size exactly; default/large exceed it.
const SIZE_CLASS: Record<ButtonSize, string> = {
  compact: "h-8 w-8",
  default: "h-10 w-10",
  large: "h-12 w-12",
};

const SPINNER_SIZE: Record<ButtonSize, "xs" | "sm" | "md"> = {
  compact: "xs",
  default: "sm",
  large: "md",
};

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  icon: ReactNode;
  variant?: Exclude<ButtonVariant, "link">;
  size?: ButtonSize;
  loading?: boolean;
  /** Required — an icon-only control with no accessible name is unusable via screen reader. */
  "aria-label": string;
}

export function IconButton({
  icon,
  variant = "tertiary",
  size = "default",
  loading = false,
  disabled,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(BASE, FOCUS_RING, VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={SPINNER_SIZE[size]} aria-hidden /> : icon}
    </button>
  );
}
