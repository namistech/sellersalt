"use client";

import { AppShell, PageHeader } from "@/components/shell";
import { Card, Text } from "@/components/ui";
import { MOCK_INSTITUTE_CONTEXT, MOCK_NOTIFICATIONS, MOCK_SEARCH_RESULTS } from "@/services/mock/workspace";

// See /dev/shell/individual for context on this route's purpose.
// Institute shape exercises: ScopeSwitcher (Cohort), zero Connected
// Shops (selector correctly renders nothing), and Institute-only
// Manage items (Cohorts, Staff, Reports, Billing).

export default function DevShellInstitutePage() {
  return (
    <AppShell context={MOCK_INSTITUTE_CONTEXT} notifications={MOCK_NOTIFICATIONS} searchResults={MOCK_SEARCH_RESULTS} onSignOut={() => alert("Sign out (demo — no-op)")}>
      <PageHeader title="Overview" description="Institute account shell — /dev/shell/institute" />
      <Card padding="lg">
        <Text size="body-sm" color="secondary">
          Mock Institute WorkspaceContext (Etsy Bootcamp Academy): Cohort scope switcher, no Connected Shops, and
          Institute-only Manage items (Cohorts, Staff, Reports, Billing).
        </Text>
      </Card>
    </AppShell>
  );
}
