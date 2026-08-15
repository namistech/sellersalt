import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDashboardData } from "@/services/dashboard";
import { PageHeader } from "@/components/shell";
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/data";
import { DashboardClient } from "./dashboard-client";

export default async function OverviewPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { organizationId?: string; name?: string | null; email?: string | null } | undefined;
  const organizationId = user?.organizationId;
  const userName = user?.name ?? user?.email?.split("@")[0] ?? "there";

  if (!organizationId) {
    return (
      <div>
        <PageHeader title="Overview" />
        <Card padding="lg">
          <EmptyState
            title="Your account isn't linked to a workspace yet"
            description="Try signing out and back in — if this persists, contact support."
          />
        </Card>
      </div>
    );
  }

  const [data, rawConnectors] = await Promise.all([
    getDashboardData(organizationId),
    prisma.connector.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      orderBy: [{ organizationId: "desc" }, { createdAt: "desc" }],
      select: { id: true, type: true, label: true, status: true, organizationId: true },
    }),
  ]);

  const connectors = rawConnectors.map((c) => ({
    id: c.id,
    type: c.type,
    label: c.label,
    status: c.status,
    scope: (c.organizationId ? "own" : "platform") as "own" | "platform",
  }));

  return <DashboardClient initialData={data} connectors={connectors} userName={userName} />;
}
