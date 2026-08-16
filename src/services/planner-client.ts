import { fetchJson } from "./http";
import type {
  PlannerItem,
  PlannerItemCreateInput,
  PlannerItemUpdateInput,
} from "@/types/planner";

export async function fetchPlannerItems(filters?: {
  status?: string;
  type?: string;
  search?: string;
  includeArchived?: boolean;
}): Promise<{ items: any[]; statusCounts: Record<string, number>; totalCount: number }> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters?.type && filters.type !== "ALL") params.set("type", filters.type);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.includeArchived) params.set("includeArchived", "true");

  const queryString = params.toString();
  const url = `/api/planner/items${queryString ? `?${queryString}` : ""}`;
  return fetchJson(url);
}

export async function fetchPlannerItemDetail(id: string): Promise<{ item: any }> {
  return fetchJson(`/api/planner/items/${encodeURIComponent(id)}`);
}

export async function createPlannerItem(
  input: PlannerItemCreateInput
): Promise<{ item: any; isExisting: boolean; message: string }> {
  return fetchJson("/api/planner/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updatePlannerItem(
  id: string,
  updates: PlannerItemUpdateInput
): Promise<{ item: any }> {
  return fetchJson(`/api/planner/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export async function deletePlannerItem(id: string): Promise<{ success: boolean; message?: string }> {
  return fetchJson(`/api/planner/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function archivePlannerItem(id: string): Promise<{ item: any }> {
  return updatePlannerItem(id, { status: "ARCHIVED" as any });
}
