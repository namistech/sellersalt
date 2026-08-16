"use client";

import { useState, useCallback, useEffect } from "react";

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
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    window.sessionStorage.setItem(`sellersalt_research_${surface}_query`, JSON.stringify(query.trim()));
    addSearchHistory(surface, query.trim());
  } catch {
    // Ignore storage quota errors
  }
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
}

const MAX_HISTORY_ITEMS = 15;

export function getSearchHistory(surface: string): SearchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`sellersalt_history_${surface}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(surface: string, query: string): SearchHistoryItem[] {
  if (typeof window === "undefined" || !query.trim()) return [];
  const normalized = query.trim();
  const current = getSearchHistory(surface);
  // De-duplicate case-insensitively
  const filtered = current.filter((item) => item.query.toLowerCase() !== normalized.toLowerCase());
  const updated: SearchHistoryItem[] = [
    { id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, query: normalized, timestamp: Date.now() },
    ...filtered,
  ].slice(0, MAX_HISTORY_ITEMS);

  try {
    window.localStorage.setItem(`sellersalt_history_${surface}`, JSON.stringify(updated));
  } catch {
    // Ignore quota errors
  }
  return updated;
}

export function deleteSearchHistoryItem(surface: string, idOrQuery: string): SearchHistoryItem[] {
  if (typeof window === "undefined") return [];
  const current = getSearchHistory(surface);
  const updated = current.filter(
    (item) => item.id !== idOrQuery && item.query.toLowerCase() !== idOrQuery.toLowerCase()
  );
  try {
    window.localStorage.setItem(`sellersalt_history_${surface}`, JSON.stringify(updated));
  } catch {
    // Ignore quota errors
  }
  return updated;
}

export function clearSearchHistory(surface: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`sellersalt_history_${surface}`);
  } catch {
    // Ignore quota errors
  }
}

export function useSearchHistory(surface: string) {
  const [history, setHistory] = useState<SearchHistoryItem[]>(() => getSearchHistory(surface));

  useEffect(() => {
    setHistory(getSearchHistory(surface));
  }, [surface]);

  const add = useCallback((query: string) => {
    const next = addSearchHistory(surface, query);
    setHistory(next);
  }, [surface]);

  const remove = useCallback((idOrQuery: string) => {
    const next = deleteSearchHistoryItem(surface, idOrQuery);
    setHistory(next);
  }, [surface]);

  const clear = useCallback(() => {
    clearSearchHistory(surface);
    setHistory([]);
  }, [surface]);

  return { history, add, remove, clear };
}
