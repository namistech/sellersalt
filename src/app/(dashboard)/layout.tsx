import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { prisma } from "@/lib/db";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";

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

  return (
    <div className="flex h-screen bg-paper">
      <Sidebar organizationName={user?.organizationName} isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userName={user?.name} userEmail={user?.email} />
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
