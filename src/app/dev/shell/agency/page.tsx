"use client";

import { AppShell, PageHeader } from "@/components/shell";
import { Card, Text } from "@/components/ui";
import { MOCK_AGENCY_CONTEXT, MOCK_NOTIFICATIONS, MOCK_SEARCH_RESULTS } from "@/services/mock/workspace";

// See /dev/shell/individual for context on this route's purpose.
// Agency shape exercises: WorkspaceSwitcher (availableWorkspaces),
// ScopeSwitcher (Client), ConnectedShopSelector, and the
// Clients/Employees/Reports/Billing Manage items via the shared
// placeholder route.

export default function DevShellAgencyPage() {
  return (
    <AppShell context={MOCK_AGENCY_CONTEXT} notifications={MOCK_NOTIFICATIONS} searchResults={MOCK_SEARCH_RESULTS} onSignOut={() => alert("Sign out (demo — no-op)")}>
      <PageHeader title="Overview" description="Agency account shell — /dev/shell/agency" />
      <Card padding="lg">
        <Text size="body-sm" color="secondary">
          Mock Agency WorkspaceContext (Meridian Growth): Client scope switcher, per-client Connected Shop, and
          Agency-only Manage items (Clients, Employees, Reports, Billing) all render through the same shell as
          Individual.
        </Text>
      </Card>
    </AppShell>
  );
}
