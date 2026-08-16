"use client";

import React from "react";
import { LayoutGrid, List, Table as TableIcon } from "lucide-react";
import { cn } from "./cn";

export type ViewMode = "grid" | "list" | "table";

export interface ViewSwitchProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  modes?: ViewMode[];
  size?: "sm" | "md";
  className?: string;
}

export function ViewSwitch({
  value,
  onChange,
  modes = ["grid", "list", "table"],
  size = "sm",
  className,
}: ViewSwitchProps) {
  const ICON_MAP = {
    grid: LayoutGrid,
    list: List,
    table: TableIcon,
  };

  const LABEL_MAP = {
    grid: "Tiles",
    list: "List",
    table: "Dense Table",
  };

  return (
    <div
      role="group"
      aria-label="Display View Switcher"
      className={cn(
        "inline-flex items-center rounded-lg border border-line bg-surface-muted p-0.5 shadow-2xs",
        className
      )}
    >
      {modes.map((mode) => {
        const Icon = ICON_MAP[mode];
        const isActive = value === mode;

        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            title={LABEL_MAP[mode]}
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-all duration-150 text-xs",
              size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5",
              isActive
                ? "bg-surface text-ink font-bold shadow-xs border border-line-subtle"
                : "text-ink-tertiary hover:text-ink hover:bg-surface/50 border border-transparent"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{LABEL_MAP[mode]}</span>
          </button>
        );
      })}
    </div>
  );
}
