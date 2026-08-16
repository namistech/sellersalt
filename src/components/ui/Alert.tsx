import React, { type ReactNode } from "react";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

// design-system-v1.md §19/§20 — a colored left-border block, matching
// the in-app Alert treatment described for email/notification content
// too, so this one component is the shared pattern behind both.

export type AlertVariant = "info" | "success" | "warning" | "danger";

const VARIANT_CONFIG: Record<AlertVariant, { icon: ReactNode; border: string; bg: string; iconColor: string; role: "status" | "alert" }> = {
  info: { icon: <Info />, border: "border-l-info", bg: "bg-info-subtle", iconColor: "text-info", role: "status" },
  success: { icon: <CheckCircle />, border: "border-l-success", bg: "bg-success-subtle", iconColor: "text-success", role: "status" },
  // text-warn (not -strong) on bg-warn-subtle is ~2.9:1 — fails even the
  // 3:1 WCAG floor for icons/UI graphics, unlike success/info/danger's
  // DEFAULT tones here which already clear it. Uses -strong instead.
  warning: { icon: <AlertTriangle />, border: "border-l-warn", bg: "bg-warn-subtle", iconColor: "text-warn-strong", role: "alert" },
  danger: { icon: <XCircle />, border: "border-l-danger", bg: "bg-danger-subtle", iconColor: "text-danger", role: "alert" },
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  icon?: ReactNode;
  children?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ variant = "info", title, icon, children, onDismiss, className }: AlertProps) {
  const config = VARIANT_CONFIG[variant];
  return (
    <div
      role={config.role}
      className={cn("flex gap-3 rounded-md border-l-4 p-4", config.border, config.bg, className)}
    >
      <span aria-hidden="true" className={cn("mt-0.5 shrink-0 [&_svg]:h-5 [&_svg]:w-5", config.iconColor)}>
        {icon ?? config.icon}
      </span>
      <div className="flex-1 text-body-sm text-ink">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-1", "text-ink-secondary")}>{children}</div>}
      </div>
      {onDismiss && (
        <IconButton icon={<X />} size="compact" variant="tertiary" aria-label="Dismiss" onClick={onDismiss} className="-mr-1 -mt-1" />
      )}
    </div>
  );
}
