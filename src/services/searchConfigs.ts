import { fetchJson } from "./http";

// Adapter for the real SearchConfig backend (/api/search-configs,
// /api/search-configs/[id]). Powers both the Prospects "Results" view
// (grouping) and the "Saved Searches" tab (Wave 4 — a tab within
// Prospects, not a new nav item, per the locked IA).

export type ScheduleFrequency = "MANUAL" | "EVERY_6_HOURS" | "DAILY" | "WEEKLY";

export const SCHEDULE_FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  MANUAL: "Manual only",
  EVERY_6_HOURS: "Every 6 hours",
  DAILY: "Daily",
  WEEKLY: "Weekly",
};

export function scheduleFrequencyFromCron(cron: string | null): ScheduleFrequency {
  if (!cron) return "MANUAL";
  if (cron === "0 */6 * * *") return "EVERY_6_HOURS";
  if (cron === "0 6 * * *") return "DAILY";
  if (cron === "0 6 * * 1") return "WEEKLY";
  return "MANUAL";
}

export interface SearchConfigSummary {
  id: string;
  name: string;
  keywords: string[];
  minPrice: number;
  maxPrice: number;
  minShopAgeMonths: number;
  maxShopAgeMonths: number;
  minReviewCount: number;
  scheduleCron: string | null;
  createdAt: string;
  connector?: { label: string; type: string };
}

export interface CreateSearchConfigInput {
  connectorId: string;
  name: string;
  keywords: string[];
  minPrice: number;
  maxPrice: number;
  minShopAgeMonths: number;
  maxShopAgeMonths: number;
  minReviewCount: number;
  scheduleFrequency: ScheduleFrequency;
}

export async function fetchSearchConfigs(): Promise<SearchConfigSummary[]> {
  const data = await fetchJson<{ searchConfigs: SearchConfigSummary[] }>("/api/search-configs");
  return data.searchConfigs ?? [];
}

export async function createSearchConfig(input: CreateSearchConfigInput): Promise<SearchConfigSummary> {
  const data = await fetchJson<{ searchConfig: SearchConfigSummary }>("/api/search-configs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return data.searchConfig;
}

export async function updateSearchConfigSchedule(id: string, scheduleFrequency: ScheduleFrequency): Promise<void> {
  await fetchJson<{ ok: true }>(`/api/search-configs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduleFrequency }),
  });
}

export async function deleteSearchConfig(id: string): Promise<void> {
  await fetchJson<{ ok: true }>(`/api/search-configs/${id}`, { method: "DELETE" });
}
