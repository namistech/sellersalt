"use client";

import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "./cn";
import { useMounted, useOverlay } from "./overlay-utils";
import { IconButton } from "./IconButton";

// design-system-v1.md §6/§25 — Drawer. Shares Dialog's overlay
// mechanics (overlay-utils.ts) but slides from an edge instead of
// centering, and is responsive by construction: a `side="right"` (or
// "left") drawer automatically becomes a bottom sheet below the `sm`
// breakpoint via CSS alone (design-system-v1.md §25's explicit rule),
// rather than requiring the caller to switch `side` per breakpoint.

export type DrawerSide = "left" | "right" | "bottom";
export type DrawerSize = "sm" | "md" | "lg";

const WIDTH_CLASS: Record<DrawerSize, string> = {
  sm: "sm:w-[400px]",
  md: "sm:w-[480px]",
  lg: "sm:w-[640px]",
};

function panelPositionClass(side: DrawerSide): string {
  if (side === "bottom") {
    return "inset-x-0 bottom-0 max-h-[85vh] rounded-t-lg";
  }
  // Mobile: always a bottom sheet. sm+: a true side panel.
  const sideClass = side === "left" ? "sm:left-0 sm:right-auto sm:rounded-r-lg" : "sm:right-0 sm:left-auto sm:rounded-l-lg";
  return cn("inset-x-0 bottom-0 max-h-[85vh] rounded-t-lg sm:inset-y-0 sm:bottom-auto sm:max-h-none sm:h-full sm:rounded-t-none", sideClass);
}

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  side?: DrawerSide;
  size?: DrawerSize;
  children?: ReactNode;
}

export function Drawer({ open, onClose, title, description, side = "right", size = "md", children }: DrawerProps) {
  const mounted = useMounted();
  const titleId = useId();
  const descId = useId();
  const { containerRef } = useOverlay<HTMLDivElement>({ open, onClose });

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div aria-hidden="true" className="absolute inset-0 bg-paper-inverse/40" onClick={onClose} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "absolute flex w-full flex-col overflow-y-auto border-line bg-surface shadow-lg",
          panelPositionClass(side),
          side !== "bottom" && WIDTH_CLASS[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line-subtle p-5">
          <div>
            <h2 id={titleId} className="text-h4 text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-body-sm text-ink-secondary">
                {description}
              </p>
            )}
          </div>
          <IconButton icon={<X />} variant="tertiary" size="compact" aria-label="Close" onClick={onClose} />
        </div>
        {children && <div className="flex-1 p-5">{children}</div>}
      </div>
    </div>,
    document.body
  );
}
