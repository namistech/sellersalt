"use client";

import { Table, EmptyState, formatRelativeTime, type Column } from "@/components/data";
import { StatusIndicator, Text } from "@/components/ui";
import { jobStatusIndicator, type JobStatus } from "@/services/jobs";

// Split out from dashboard/page.tsx (a Server Component): Table's column
// definitions are functions, and Server → Client props can't carry
// functions across the boundary — only plain, serializable data (the
// `jobs` array) crosses from the server page into this client component,
// which then builds the interactive Table itself.

export interface RecentJobRow {
  id: string;
  status: string;
  createdAt: string;
  searchConfigName: string;
}

const columns: Column<RecentJobRow>[] = [
  { key: "search", header: "Search", render: (r) => <Text size="body-sm">{r.searchConfigName}</Text> },
  {
    key: "createdAt",
    header: "Run",
    render: (r) => (
      <Text size="body-sm" color="secondary">
        {formatRelativeTime(r.createdAt)}
      </Text>
    ),
  },
  {
    key: "status",
    header: "Status",
    align: "right",
    render: (r) => {
      const meta = jobStatusIndicator(r.status as JobStatus);
      return <StatusIndicator status={meta.status} label={meta.label} />;
    },
  },
];

export function RecentJobsTable({ jobs }: { jobs: RecentJobRow[] }) {
  return (
    <Table<RecentJobRow>
      aria-label="Recent search runs"
      columns={columns}
      rows={jobs}
      getRowId={(r) => r.id}
      density="compact"
      emptyState={<EmptyState title="No runs yet" description="Search runs will show up here once you start one from Prospects." />}
    />
  );
}
