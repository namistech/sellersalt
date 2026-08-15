"use client";

import { useEffect, useRef, useState } from "react";

// Internal shared logic behind Dialog and Drawer — not exported from
// index.ts. Both components need identical focus-trap/Escape/
// scroll-lock/portal-mount behavior; extracting it here once avoids
// implementing (and maintaining) the same overlay mechanics twice,
// per the "no duplicated component logic" quality gate in
// docs/design/frontend-execution-plan-v1.md §28.

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** True once mounted client-side — guards createPortal against SSR, where `document` doesn't exist. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export interface UseOverlayOptions {
  open: boolean;
  onClose: () => void;
}

/**
 * Wires up: focus moves into the overlay on open and returns to the
 * trigger on close; Tab is trapped within the overlay; Escape closes;
 * body scroll is locked while open.
 */
export function useOverlay<T extends HTMLElement>({ open, onClose }: UseOverlayOptions) {
  const containerRef = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const firstFocusable = container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? container)?.focus();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !container) return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose intentionally excluded: re-running this effect on every render-scoped closure change would re-trigger the open/focus/scroll-lock side effects
  }, [open]);

  return { containerRef };
}
