import type { Capability, WorkspaceContext } from "./types";
import { prisma } from "@/lib/db";

// Real-session → WorkspaceContext mapping. Deliberately a plain
// function, not a hook: (dashboard)/layout.tsx already resolves the
// real session server-side (getServerSession + isAdminEmail — see
// that file) and this just reshapes the same real values into the
// shell's typed context, with no new data fetching and no change to
// the existing auth/subscription redirect logic.
//
// Every real signed-in session today is account-type "individual" —
// Organization.kind doesn't exist yet (docs/architecture/organizations.md,
// still [DECISION REQUIRED] at the field level). Agency/Institute
// contexts are exercised only through src/services/mock/workspace.ts.

export interface RealSessionInput {
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  isAdmin: boolean;
}

export function buildRealWorkspaceContext(input: RealSessionInput): WorkspaceContext {
  const capabilities = new Set<Capability>(["discover:view"]);
  if (input.isAdmin) {
    capabilities.add("operate:view");
    capabilities.add("admin:preview");
  }

  return {
    user: {
      id: input.userId ?? "",
      name: input.userName ?? input.userEmail ?? "",
      email: input.userEmail ?? "",
      avatarUrl: input.userAvatarUrl ?? null,
    },
    organization: {
      id: input.organizationId ?? "",
      name: input.organizationName ?? "Your workspace",
      accountType: "individual",
    },
    roleLabel: input.isAdmin ? "Admin" : "Member",
    capabilities,
    // No availableWorkspaces, scope, or connectedShops today — real
    // multi-org switching and real Connected Shop data aren't wired
    // into the shell in this task (see this task's final report,
    // "Limitations"). The components exist and render correctly once
    // this data is supplied; they simply aren't supplied yet for the
    // real path.
  };
}

/** Single source of truth for "real NextAuth session -> WorkspaceContext",
 * including the avatar DB lookup — every server component that needs to
 * render DashboardShell for a real session should call this rather than
 * re-deriving it, so avatar/org shape can't drift between call sites
 * (this is exactly what happened before: shop-detail's page.tsx built its
 * own context inline and never got the avatarUrl fix applied to
 * (dashboard)/layout.tsx). */
export async function resolveWorkspaceContextForUser(
  user: { id?: string | null; name?: string | null; email?: string | null; organizationId?: string | null; organizationName?: string | null },
  isAdmin: boolean
): Promise<WorkspaceContext> {
  const avatarSetting = user.id
    ? await prisma.appSetting.findUnique({ where: { key: `user_avatar_${user.id}` } })
    : null;

  return buildRealWorkspaceContext({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userAvatarUrl: avatarSetting?.value ?? null,
    organizationId: user.organizationId,
    organizationName: user.organizationName,
    isAdmin,
  });
}
