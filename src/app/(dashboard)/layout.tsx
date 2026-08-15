import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";
import { buildRealWorkspaceContext } from "@/services/session";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  const isAdmin = isAdminEmail(user?.email);

  // Every plan (including Started) now requires completed checkout — no
  // free tier exists anymore. Admins are exempt so the founder/team can't
  // lock themselves out; everyone else without an active or trialing
  // subscription gets sent to finish checkout before reaching the app.
  if (!isAdmin && user?.organizationId) {
    const sub = await prisma.subscription.findUnique({ where: { organizationId: user.organizationId } });
    const hasAccess = sub && (sub.status === "ACTIVE" || sub.status === "TRIALING");
    if (!hasAccess) redirect("/checkout");
  }

  const context = buildRealWorkspaceContext({
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
    organizationId: user?.organizationId,
    organizationName: user?.organizationName,
    isAdmin,
  });

  return <DashboardShell context={context}>{children}</DashboardShell>;
}
