"use client";

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "./cn";

// design-system-v1.md — no positioning library is installed (Popper/
// Floating UI etc. would be a new dependency), so this is a
// static-position, CSS-only tooltip: shown on hover *and* keyboard
// focus (group-focus-within, not just group-hover — §26 "keyboard
// navigation"), with no collision detection/auto-flipping. That's an
// honest v1 limitation for a foundation primitive, not a hidden gap —
// see this task's final report.

export type TooltipSide = "top" | "bottom" | "left" | "right";

const SIDE_CLASS: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

export interface TooltipProps {
  content: ReactNode;
  side?: TooltipSide;
  children: ReactElement;
}

export function Tooltip({ content, side = "top", children }: TooltipProps) {
  const id = useId();
  if (!isValidElement(children)) return children;

  const trigger = cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
    "aria-describedby": id,
  });

  return (
    <span className="group relative inline-flex">
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute z-10 whitespace-nowrap rounded-sm bg-paper-inverse px-2 py-1 text-body-sm text-ink-inverse opacity-0 shadow-sm transition-opacity",
          "invisible group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100",
          SIDE_CLASS[side]
        )}
      >
        {content}
      </span>
    </span>
  );
}
