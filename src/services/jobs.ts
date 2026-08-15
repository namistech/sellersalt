import { fetchJson } from "./http";
import type { Status } from "@/components/ui";

// Adapter for the real Job backend (/api/jobs) — BullMQ-backed search
// runs (src/workers/index.ts). Used by the Prospects "Run now" action
// and (read-only) by the Dashboard's recent-jobs list.

export type JobStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";

export interface JobSummary {
  id: string;
  status: JobStatus;
  createdAt: string;
  resultCount: number | null;
  errorMessage: string | null;
  searchConfig?: { name: string };
  connector?: { label: string };
}

export async function fetchJobs(): Promise<JobSummary[]> {
  const data = await fetchJson<{ jobs: JobSummary[] }>("/api/jobs");
  return data.jobs ?? [];
}

export async function runSearch(searchConfigId: string): Promise<JobSummary> {
  const data = await fetchJson<{ job: JobSummary }>("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchConfigId }),
  });
  return data.job;
}

// The one place JobStatus maps onto the shared StatusIndicator Badge —
// every screen showing a Job's status (Dashboard recent jobs, Prospects
// "Run now") reuses this instead of re-deriving its own mapping.
export function jobStatusIndicator(status: JobStatus): { status: Status; label: string } {
  switch (status) {
    case "QUEUED":
      return { status: "pending", label: "Queued" };
    case "RUNNING":
      return { status: "syncing", label: "Running" };
    case "SUCCESS":
      return { status: "active", label: "Success" };
    case "FAILED":
      return { status: "failed", label: "Failed" };
  }
}
