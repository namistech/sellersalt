import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdminEmail } from "@/lib/is-admin";
import { AdminPackagesClient } from "./admin-client";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    redirect("/dashboard");
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Admin — Packages</h1>
        <p className="mt-1 text-sm text-muted">Manage plan tiers and assign custom packages to organizations.</p>
      </header>
      <AdminPackagesClient />
    </div>
  );
}
