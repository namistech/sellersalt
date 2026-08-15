"use client";

import { createContext, useContext, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn, FOCUS_RING } from "./cn";

// design-system-v1.md §15 — underline-indicator tabs, implementing the
// WAI-ARIA Tabs pattern (roving tabindex, arrow-key navigation,
// Home/End) rather than a simplified click-only version, per this
// task's accessibility requirements.

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<Tabs.${component}> must be rendered inside <Tabs>.`);
  return ctx;
}

export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

function TabsRoot({ value, onChange, children, className }: TabsProps) {
  const baseId = useId();
  return (
    <TabsContext.Provider value={{ value, onChange, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

function TabsList({ children, className, "aria-label": ariaLabel }: TabsListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const list = listRef.current;
    if (!list) return;
    const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'));
    const currentIndex = tabs.findIndex((t) => t === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      tabs[nextIndex]?.focus();
      tabs[nextIndex]?.click();
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn("flex gap-6 border-b border-line-subtle", className)}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}

function TabsTrigger({ value, children, disabled }: TabsTriggerProps) {
  const { value: activeValue, onChange, baseId } = useTabsContext("Trigger");
  const selected = value === activeValue;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && onChange(value)}
      className={cn(
        "relative -mb-px border-b-2 py-3 text-body-md font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        FOCUS_RING,
        selected ? "border-accent text-ink" : "border-transparent text-ink-secondary hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

export interface TabsPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

function TabsPanel({ value, children, className }: TabsPanelProps) {
  const { value: activeValue, baseId } = useTabsContext("Panel");
  if (value !== activeValue) return null;

  return (
    <div id={`${baseId}-panel-${value}`} role="tabpanel" aria-labelledby={`${baseId}-tab-${value}`} tabIndex={0} className={cn("pt-4", className)}>
      {children}
    </div>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Panel: TabsPanel,
});
