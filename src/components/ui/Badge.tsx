import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "gold";
export type BadgeTone = "light" | "dark";

const LIGHT_VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-surface-muted text-ink-secondary border border-line-subtle",
  success: "bg-success-subtle text-success-strong border border-success/20",
  warning: "bg-[#FDF1DF] text-[#92400E] border border-[#F59E0B]/30",
  danger: "bg-danger-subtle text-danger border border-danger/20",
  info: "bg-info-subtle text-info border border-info/20",
  gold: "bg-[#FFF8E6] text-[#8A5A00] border border-[#FFB020]/30",
};

const DARK_VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-[#1C261F] text-[#9EAA9F] border border-[#2A362D]",
  success: "bg-[#0D281E] text-[#16C784] border border-[#1B4D39]",
  warning: "bg-[#2E1E09] text-[#FFB020] border border-[#593A11]",
  danger: "bg-[#2D1214] text-[#F87171] border border-[#591C20]",
  info: "bg-[#0E2038] text-[#60A5FA] border border-[#1E3A5F]",
  gold: "bg-[#2E1E09] text-[#FFB020] border border-[#593A11]",
};

export interface BadgeProps {
  variant?: BadgeVariant;
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Badge({
  variant = "neutral",
  tone = "light",
  icon,
  children,
  className,
}: BadgeProps) {
  const variantClass = tone === "dark" ? DARK_VARIANT_CLASS[variant] : LIGHT_VARIANT_CLASS[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-semibold tracking-wide [&_svg]:h-3 [&_svg]:w-3",
        variantClass,
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
