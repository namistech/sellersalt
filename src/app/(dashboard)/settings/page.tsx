import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  const org = organizationId
    ? await prisma.organization.findUnique({ where: { id: organizationId } })
    : null;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">Workspace details and plan.</p>
      </header>

      <div className="space-y-6">
        <div className="card max-w-lg">
          <h2 className="mb-4 text-sm font-semibold text-ink">Workspace</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Name</dt>
              <dd className="font-medium text-ink">{org?.name ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Plan</dt>
              <dd className="font-medium text-ink">{org?.plan ?? "FREE"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Signed in as</dt>
              <dd className="font-medium text-ink">{session?.user?.email}</dd>
            </div>
          </dl>
        </div>

        <div className="card max-w-lg">
          <h2 className="mb-1 text-sm font-semibold text-ink">Billing</h2>
          <p className="mb-4 text-sm text-muted">Manage your plan and payment details.</p>
          <Link href="/settings/billing" className="btn-secondary">
            Go to billing
          </Link>
        </div>

        <div className="card max-w-lg opacity-60">
          <h2 className="mb-1 text-sm font-semibold text-ink">Team members</h2>
          <p className="text-sm text-muted">
            Invite teammates to this workspace. Coming soon — the workspace model already
            supports multiple members, this just needs the invite flow.
          </p>
        </div>
      </div>
    </div>
  );
}
