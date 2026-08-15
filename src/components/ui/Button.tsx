import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn, FOCUS_RING } from "./cn";
import { Spinner } from "./Spinner";

// design-system-v1.md §9 — Button system.

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive" | "success" | "link";
export type ButtonSize = "compact" | "default" | "large";

const BASE = "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed";

// "Success/Action" is deliberately identical to Primary per
// design-system-v1.md §9 — sharing the treatment reinforces it as a
// first-class, encouraged action while staying clearly separate from
// Destructive. Kept as its own variant name (not aliased away) so
// call sites can express *intent* even though the visual result matches.
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-[#0E8F5D] text-white hover:bg-[#0C7A52] active:bg-[#0A6342] font-semibold shadow-xs",
  success: "bg-[#0E8F5D] text-white hover:bg-[#0C7A52] active:bg-[#0A6342] font-semibold shadow-xs",
  secondary: "border border-line bg-white text-ink hover:bg-surface-muted active:bg-surface-muted font-medium shadow-2xs",
  tertiary: "bg-transparent text-ink hover:bg-surface-muted active:bg-surface-muted font-medium",
  destructive: "bg-danger text-white hover:brightness-90 active:brightness-75 font-semibold shadow-xs",
  link: "bg-transparent p-0 h-auto text-[#0E8F5D] font-medium underline-offset-4 hover:underline",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  compact: "h-8 px-3 text-body-sm",
  default: "h-10 px-4 text-body-md",
  large: "h-12 px-6 text-body-lg",
};

const SPINNER_SIZE: Record<ButtonSize, "xs" | "sm" | "md"> = {
  compact: "xs",
  default: "sm",
  large: "md",
};

interface ButtonSharedProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows an inline spinner and disables interaction. Button keeps its size — no layout shift. */
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
  className?: string;
}

export interface ButtonProps extends ButtonSharedProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | keyof ButtonSharedProps> {
  /** Renders a Next.js `<Link>` styled identically to the button — same pattern as ui/Card's InteractiveCard (href present = link, omitted = real `<button>`). Never a styled `<div>`. */
  href?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
}

export function Button({
  variant = "primary",
  size = "default",
  loading = false,
  disabled,
  leadingIcon,
  trailingIcon,
  fullWidth,
  className,
  children,
  type = "button",
  href,
  target,
  ...rest
}: ButtonProps) {
  const isLink = variant === "link";
  const classes = cn(BASE, FOCUS_RING, VARIANT_CLASS[variant], !isLink && SIZE_CLASS[size], fullWidth && "w-full", className);

  const content = (
    <>
      {loading ? <Spinner size={SPINNER_SIZE[size]} aria-hidden /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </>
  );

  if (href && !disabled && !loading) {
    return (
      <Link href={href} target={target} className={classes} {...(rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href" | "target">)}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}
