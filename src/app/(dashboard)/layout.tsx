import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { isStagingVerificationAccount } from "@/lib/staging-verification";
import { prisma } from "@/lib/db";
import { buildRealWorkspaceContext } from "@/services/session";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";

  const user = session.user as any;
  const isAdmin = isAdminEmail(user?.email);
  const isStagingVerification = isStagingVerificationAccount(user?.email, host);

  // Every plan (including Started) now requires completed checkout — no
  // free tier exists anymore. Admins and designated staging verification
  // test accounts are exempt so testing can proceed without a live Stripe charge;
  // everyone else without an active or trialing subscription gets sent to finish checkout.
  if (!isAdmin && !isStagingVerification && user?.organizationId) {
    const sub = await prisma.subscription.findUnique({ where: { organizationId: user.organizationId } });
    const hasAccess = sub && (sub.status === "ACTIVE" || sub.status === "TRIALING");
    if (!hasAccess) redirect("/checkout");
  }

  const avatarSetting = user?.id
    ? await prisma.appSetting.findUnique({ where: { key: `user_avatar_${user.id}` } })
    : null;

  const context = buildRealWorkspaceContext({
    userId: user?.id,
    userName: user?.name,
    userEmail: user?.email,
    userAvatarUrl: avatarSetting?.value ?? null,
    organizationId: user?.organizationId,
    organizationName: user?.organizationName,
    isAdmin,
  });

  return <DashboardShell context={context}>{children}</DashboardShell>;
}
