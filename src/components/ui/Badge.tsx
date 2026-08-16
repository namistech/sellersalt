import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info" | "gold";
export type BadgeTone = "light" | "dark";

const LIGHT_VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-[#F0F2EE] text-[#2D3730] border border-[#D5DDD6]",
  success: "bg-[#E7FAF1] text-[#0E8F5D] border border-[#16C784]/40",
  warning: "bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]/40",
  danger: "bg-[#FEE2E2] text-[#DC2626] border border-[#EF4444]/40",
  info: "bg-[#EFF6FF] text-[#1D4ED8] border border-[#3B82F6]/40",
  gold: "bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]/40 font-bold",
};

const DARK_VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: "bg-[#1C261F] text-[#D1DCD2] border border-[#2A362D]",
  success: "bg-[#0D281E] text-[#16C784] border border-[#1B4D39]",
  warning: "bg-[#2A1E0B] text-[#FBBF24] border border-[#78480F]",
  danger: "bg-[#2D1214] text-[#F87171] border border-[#591C20]",
  info: "bg-[#0E2038] text-[#60A5FA] border border-[#1E3A5F]",
  gold: "bg-[#2A1E0B] text-[#FBBF24] border border-[#78480F]",
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
