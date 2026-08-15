"use client";

import { useEffect, useRef, useState } from "react";

// Shared open/close-on-outside-click/Escape mechanics for the three
// switcher dropdowns (Workspace/Scope/ConnectedShop) and AccountMenu —
// extracted once so each switcher only differs in what it displays, not
// in how it opens/closes (docs/design/frontend-execution-plan-v1.md §28,
// "no duplicated component logic").

export function useDropdown<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}
