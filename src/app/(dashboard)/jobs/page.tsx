"use client";

import { useEffect, useState } from "react";

interface JobRow {
  id: string;
  status: string;
  triggeredBy: string;
  startedAt: string | null;
  finishedAt: string | null;
  resultCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  searchConfig: { name: string };
  connector: { label: string };
}

const STATUS_STYLES: Record<string, string> = {
  QUEUED: "bg-gray-100 text-gray-600",
  RUNNING: "bg-accent-soft text-accent-dark",
  SUCCESS: "bg-green-50 text-success",
  FAILED: "bg-red-50 text-danger",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/jobs");
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Poll every 5s so "Run now" from the Prospects page shows live progress here.
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Jobs</h1>
        <p className="mt-1 text-sm text-muted">Every automation run, queued, in progress, or finished.</p>
      </header>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted">No jobs yet. Trigger a run from the Prospects page.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Search</th>
                <th className="py-2 pr-4">Connector</th>
                <th className="py-2 pr-4">Trigger</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Results</th>
                <th className="py-2 pr-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="py-2 pr-4 font-medium text-ink">{j.searchConfig.name}</td>
                  <td className="py-2 pr-4">{j.connector.label}</td>
                  <td className="py-2 pr-4 text-muted">{j.triggeredBy}</td>
                  <td className="py-2 pr-4">
                    <span className={`badge ${STATUS_STYLES[j.status] ?? ""}`}>{j.status}</span>
                    {j.status === "FAILED" && j.errorMessage && (
                      <div className="mt-1 max-w-xs text-xs text-danger">{j.errorMessage}</div>
                    )}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{j.resultCount ?? "—"}</td>
                  <td className="py-2 pr-4 text-muted">{new Date(j.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
