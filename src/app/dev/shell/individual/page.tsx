"use client";

import { AppShell, PageHeader } from "@/components/shell";
import { Card, Text } from "@/components/ui";
import { MOCK_INDIVIDUAL_CONTEXT, MOCK_NOTIFICATIONS, MOCK_SEARCH_RESULTS } from "@/services/mock/workspace";

// Internal-only verification route (noindex, unlinked from nav) — the
// controlled placeholder strategy this task specified, exercising
// AppShell against a real-shaped Individual WorkspaceContext without a
// real backend behind it. See /dev/shell/agency and /dev/shell/institute
// for the other two account shapes.

export default function DevShellIndividualPage() {
  return (
    <AppShell context={MOCK_INDIVIDUAL_CONTEXT} notifications={MOCK_NOTIFICATIONS} searchResults={MOCK_SEARCH_RESULTS} onSignOut={() => alert("Sign out (demo — no-op)")}>
      <PageHeader title="Overview" description="Individual account shell — /dev/shell/individual" />
      <Card padding="lg">
        <Text size="body-sm" color="secondary">
          This is a demo page rendered inside the real AppShell with a mock Individual WorkspaceContext. Sidebar,
          Topbar, notifications, and search are fully interactive here.
        </Text>
      </Card>
    </AppShell>
  );
}
