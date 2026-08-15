import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { isStagingVerificationAccount } from "@/lib/staging-verification";
import { prisma } from "@/lib/db";
import { resolveWorkspaceContextForUser } from "@/services/session";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";

  const user = session.user as any;
  const isAdmin = isAdminEmail(user?.email);
  const isStagingVerification = isStagingVerificationAccount(user?.email, host);

  // Hard block: an email/password account that hasn't confirmed its email
  // never reaches the dashboard, full stop — not a dismissible nag. OAuth
  // (Google/Etsy) sign-ins set emailVerified automatically at login time
  // (see the signIn callback in lib/auth.ts), so this check alone already
  // distinguishes "genuinely unverified" from "OAuth-verified" without
  // needing to branch on auth method here.
  if (!isAdmin && user?.id) {
    const verification = await prisma.user.findUnique({ where: { id: user.id }, select: { emailVerified: true } });
    if (!verification?.emailVerified) redirect("/verify-email");
  }

  // Every plan (including Started) now requires completed checkout — no
  // free tier exists anymore. Admins and designated staging verification
  // test accounts are exempt so testing can proceed without a live Stripe charge;
  // everyone else without an active or trialing subscription gets sent to finish checkout.
  if (!isAdmin && !isStagingVerification && user?.organizationId) {
    const sub = await prisma.subscription.findUnique({ where: { organizationId: user.organizationId } });
    const hasAccess = sub && (sub.status === "ACTIVE" || sub.status === "TRIALING");
    if (!hasAccess) redirect("/checkout");
  }

  const context = await resolveWorkspaceContextForUser(user, isAdmin);

  return <DashboardShell context={context}>{children}</DashboardShell>;
}
