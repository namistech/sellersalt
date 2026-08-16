import type { ElementType, HTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

// Typography primitives — design-system-v1.md §4. One file, five small
// exports: they're all thin wrappers around the type scale wired into
// tailwind.config.ts in the token-foundation task, not independent
// pieces of design surface, so keeping them together avoids
// fragmenting near-trivial components across five files.

const HEADING_SIZES = [
  "display-2xl",
  "display-xl",
  "display-lg",
  "display-md",
  "display-sm",
  "h1",
  "h2",
  "h3",
  "h4",
] as const;
type HeadingSize = (typeof HEADING_SIZES)[number];

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantic document level — independent of visual size, per design-system-v1.md §4/§26. */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** Visual size token. Defaults to a size matching `as` when omitted. */
  size?: HeadingSize;
  children: ReactNode;
}

const DEFAULT_SIZE_FOR_LEVEL: Record<NonNullable<HeadingProps["as"]>, HeadingSize> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h4",
  h6: "h4",
};

// Tailwind's scanner needs complete, literal class-name strings in
// source — a template-literal like `text-${size}` is invisible to it
// and the class silently never gets generated. Every size-to-class
// mapping in this file therefore uses an explicit lookup object instead.
const HEADING_SIZE_CLASS: Record<HeadingSize, string> = {
  "display-2xl": "text-display-2xl",
  "display-xl": "text-display-xl",
  "display-lg": "text-display-lg",
  "display-md": "text-display-md",
  "display-sm": "text-display-sm",
  h1: "text-h1",
  h2: "text-h2",
  h3: "text-h3",
  h4: "text-h4",
};

/**
 * Renders a heading. `as` controls the real DOM element (document
 * outline / screen-reader navigation); `size` controls the visual
 * scale. They're deliberately separate props — a marketing page may
 * need an <h2> that reads visually as display-lg, which a single
 * `level` prop coupling the two could not express correctly.
 */
export function Heading({ as = "h2", size, className, children, ...rest }: HeadingProps) {
  const Component = as as ElementType;
  const resolvedSize = size ?? DEFAULT_SIZE_FOR_LEVEL[as];
  return (
    <Component className={cn(HEADING_SIZE_CLASS[resolvedSize], "text-ink", className)} {...rest}>
      {children}
    </Component>
  );
}

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: "p" | "span" | "div";
  // label-md/label-sm/meta added in the data+intelligence task: many
  // components need small secondary/caption-scale text that isn't a
  // real form <label> (Label renders a <label> element, which is
  // semantically wrong outside a form) — extending Text's own size
  // range was simpler and more correct than converting every call site
  // to a differently-semantic component.
  size?: "body-lg" | "body-md" | "body-sm" | "label-md" | "label-sm" | "meta";
  color?: "primary" | "secondary" | "tertiary" | "disabled" | "inverse";
  weight?: "regular" | "medium" | "semibold";
  children: ReactNode;
}

const TEXT_COLOR_CLASS: Record<NonNullable<TextProps["color"]>, string> = {
  primary: "text-ink",
  secondary: "text-ink-secondary",
  tertiary: "text-ink-tertiary",
  disabled: "text-ink-disabled",
  inverse: "text-ink-inverse",
};

const WEIGHT_CLASS: Record<NonNullable<TextProps["weight"]>, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
};

const TEXT_SIZE_CLASS: Record<NonNullable<TextProps["size"]>, string> = {
  "body-lg": "text-body-lg",
  "body-md": "text-body-md",
  "body-sm": "text-body-sm",
  "label-md": "text-label-md",
  "label-sm": "text-label-sm",
  meta: "text-meta",
};

export function Text({
  as = "p",
  size = "body-md",
  color = "primary",
  weight = "regular",
  className,
  children,
  ...rest
}: TextProps) {
  const Component = as as ElementType;
  return (
    <Component
      className={cn(TEXT_SIZE_CLASS[size], TEXT_COLOR_CLASS[color], WEIGHT_CLASS[weight], className)}
      {...rest}
    >
      {children}
    </Component>
  );
}

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  size?: "md" | "sm";
  /** Renders a visible `*` plus an sr-only "(required)" — never color alone. */
  required?: boolean;
  children: ReactNode;
}

const LABEL_SIZE_CLASS: Record<NonNullable<LabelProps["size"]>, string> = {
  md: "text-label-md",
  sm: "text-label-sm",
};

export function Label({ size = "md", required, className, children, ...rest }: LabelProps) {
  return (
    <label className={cn(LABEL_SIZE_CLASS[size], "text-ink-secondary block", className)} {...rest}>
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="text-danger">
            {" "}
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </label>
  );
}

export interface CaptionProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

/** Timestamps, freshness notes, helper captions — meta scale, deliberately one variant. */
export function Caption({ className, children, ...rest }: CaptionProps) {
  return (
    <span className={cn("text-meta text-ink-tertiary", className)} {...rest}>
      {children}
    </span>
  );
}

export interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "accent" | "gold" | "secondary";
  children: ReactNode;
}

const EYEBROW_TONE_CLASS: Record<NonNullable<EyebrowProps["tone"]>, string> = {
  accent: "text-accent",
  gold: "text-gold-strong",
  secondary: "text-ink-tertiary",
};

/** Small tracked uppercase label marking what kind of content follows —
 * "TOP OPPORTUNITY", "WHY THIS MATTERS", "EVIDENCE". The one place this
 * kind of section labeling should be reached for, rather than each page
 * inventing its own ad-hoc "small bold uppercase span." */
export function Eyebrow({ tone = "secondary", className, children, ...rest }: EyebrowProps) {
  return (
    <span
      className={cn("text-label-sm font-bold uppercase tracking-wide", EYEBROW_TONE_CLASS[tone], className)}
      {...rest}
    >
      {children}
    </span>
  );
}

export interface DataTextProps extends HTMLAttributes<HTMLSpanElement> {
  size?: "data-xl" | "data-lg" | "data-md" | "data-sm";
  tone?: "primary" | "secondary" | "positive" | "negative" | "neutral" | "disabled";
  children: ReactNode;
}

const DATA_TONE_CLASS: Record<NonNullable<DataTextProps["tone"]>, string> = {
  primary: "text-ink",
  secondary: "text-ink-secondary",
  positive: "text-data-positive",
  negative: "text-data-negative",
  neutral: "text-data-neutral",
  disabled: "text-ink-disabled",
};

const DATA_SIZE_CLASS: Record<NonNullable<DataTextProps["size"]>, string> = {
  "data-xl": "text-data-xl",
  "data-lg": "text-data-lg",
  "data-md": "text-data-md",
  "data-sm": "text-data-sm",
};

/**
 * Numeric/data typography — design-system-v1.md §4: Inter with tabular
 * figures, never the mono family, so digits align in dense tables and
 * columns.
 */
export function DataText({ size = "data-md", tone = "primary", className, children, ...rest }: DataTextProps) {
  return (
    <span
      className={cn(DATA_SIZE_CLASS[size], DATA_TONE_CLASS[tone], "tabular-nums", className)}
      {...rest}
    >
      {children}
    </span>
  );
}
