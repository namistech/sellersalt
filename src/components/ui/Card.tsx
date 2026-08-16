import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn, FOCUS_RING } from "./cn";

// design-system-v1.md §11/§7 — Card: standard cards use a border, not a
// shadow (shadow reserved for genuinely floating elements). Restrained
// on purpose — this task explicitly warns against turning every piece
// of UI into a Card.

export type CardPadding = "sm" | "md" | "lg";

const PADDING_CLASS: Record<CardPadding, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

interface CardBaseProps {
  padding?: CardPadding;
  className?: string;
  children: ReactNode;
}

/** Static card — bordered, no shadow. */
export interface CardProps extends CardBaseProps, Omit<HTMLAttributes<HTMLDivElement>, "className" | "children"> {
  /** "feature" is the one primary-finding panel per section/page — an
   * accent left-edge (reusing the same border-l-* pattern Alert.tsx
   * already uses for status) plus a firmer border, never a background
   * fill or shadow spectacle. Everything else stays "default" — visual
   * hierarchy comes from using this sparingly, not from a second
   * "louder" card style applied broadly. */
  variant?: "default" | "elevated" | "feature";
}

const VARIANT_CLASS: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "border border-line bg-surface",
  elevated: "bg-surface shadow-md",
  feature: "border border-line-strong border-l-4 border-l-accent bg-surface shadow-xs",
};

export function Card({ variant = "default", padding = "md", className, children, ...rest }: CardProps) {
  return (
    <div className={cn("rounded-md", VARIANT_CLASS[variant], PADDING_CLASS[padding], className)} {...rest}>
      {children}
    </div>
  );
}

// Interactive cards are real semantic controls (a <button> or an <a>),
// not a styled <div> with an onClick — design-system-v1.md §26:
// "real <button>/<a>, not styled divs." A deliberately flat prop set
// (rather than a fully-precise discriminated union over each native
// element's attributes) keeps this predictable for a v1 primitive —
// pass `href` for a link, omit it for a button.
export interface InteractiveCardProps extends CardBaseProps {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
}

const INTERACTIVE_CLASS =
  "block w-full text-left rounded-md border border-line bg-surface transition hover:border-line-strong hover:shadow-xs cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed";

export function InteractiveCard({ padding = "md", className, children, href, onClick, disabled, target, type = "button", ...rest }: InteractiveCardProps) {
  const paddingClass = PADDING_CLASS[padding];
  if (href) {
    return (
      <a href={href} target={target} className={cn(INTERACTIVE_CLASS, FOCUS_RING, paddingClass, className)} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(INTERACTIVE_CLASS, FOCUS_RING, paddingClass, className)} {...rest}>
      {children}
    </button>
  );
}
