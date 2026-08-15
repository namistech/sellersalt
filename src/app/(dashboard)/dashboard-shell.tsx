"use client";

import { signOut } from "next-auth/react";
import { AppShell } from "@/components/shell";
import type { WorkspaceContext } from "@/services/types";

// Client wrapper around the real dashboard layout's server-resolved
// context — AppShell itself is client-only (interactive state, keyboard
// shortcuts). Real notifications/search results are intentionally empty
// arrays: no backend for either exists yet (frontend-only per this
// task's brief), and the shell should never show fabricated data on the
// real signed-in path — see this task's final report, "Limitations."
// The mock arrays in services/mock/workspace.ts are exercised only by
// /dev/shell/*.

export function DashboardShell({ context, children }: { context: WorkspaceContext; children: React.ReactNode }) {
  return (
    <AppShell context={context} notifications={[]} searchResults={[]} onSignOut={() => signOut({ callbackUrl: "/login" })}>
      {children}
    </AppShell>
  );
}
