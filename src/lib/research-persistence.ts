"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * SellerSalt Workspace Memory & Research Persistence Helper
 * 
 * Safely persists query parameters, filters, view modes, and tab states
 * to sessionStorage and syncs with URL search parameters so research sessions
 * are never lost when navigating between dashboard surfaces.
 */

export function useResearchState<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const storageKey = `sellersalt_research_${key}`;

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = window.sessionStorage.getItem(storageKey);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // Fallback on storage errors
    }
    return initialValue;
  });

  const setPersistedState = useCallback((val: T | ((prev: T) => T)) => {
    setState((current) => {
      const next = typeof val === "function" ? (val as (prev: T) => T)(current) : val;
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
      }
      return next;
    });
  }, [storageKey]);

  return [state, setPersistedState];
}

/**
 * Gets a persisted research query or null if none was saved
 */
export function getSavedResearchQuery(surface: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`sellersalt_research_${surface}_query`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Saves a research query to workspace session memory
 */
export function saveResearchQuery(surface: string, query: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`sellersalt_research_${surface}_query`, JSON.stringify(query));
  } catch {
    // Ignore storage quota errors
  }
}
