import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;

  return (
    <div className="flex h-screen bg-paper">
      <Sidebar organizationName={user?.organizationName} isAdmin={isAdminEmail(user?.email)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userName={user?.name} userEmail={user?.email} />
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
