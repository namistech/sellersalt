"use client";

import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "./cn";
import { useMounted, useOverlay } from "./overlay-utils";
import { IconButton } from "./IconButton";

// design-system-v1.md §6/§21 — Dialog (Modal). No dialog/overlay
// library is installed; portal + focus trap + Escape + backdrop-click
// + scroll-lock are implemented directly (see overlay-utils.ts) rather
// than adding a dependency.

export type DialogSize = "sm" | "md" | "lg" | "full";

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
  full: "max-w-[90vw]",
};

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Required — provides the dialog's accessible name (aria-labelledby). */
  title: string;
  description?: string;
  size?: DialogSize;
  children?: ReactNode;
  actions?: ReactNode;
  hideCloseButton?: boolean;
}

export function Dialog({ open, onClose, title, description, size = "md", children, actions, hideCloseButton }: DialogProps) {
  const mounted = useMounted();
  const titleId = useId();
  const descId = useId();
  const { containerRef } = useOverlay<HTMLDivElement>({ open, onClose });

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-paper-inverse/40" onClick={onClose} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn("relative z-10 w-full rounded-lg border border-line bg-surface shadow-lg", SIZE_CLASS[size])}
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
          {!hideCloseButton && <IconButton icon={<X />} variant="tertiary" size="compact" aria-label="Close" onClick={onClose} />}
        </div>

        {children && <div className="p-5">{children}</div>}

        {actions && <div className="flex justify-end gap-2 border-t border-line-subtle p-5">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}
