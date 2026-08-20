import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getResearchRunDetails } from "@/marketplaces/core/acquisition/workbench";
import { RunDetailClient } from "./run-detail-client";

export const metadata = {
  title: "Research Report Detail — SellerSalt",
  description: "Detailed marketplace intelligence report, signal breakdowns, and provenance.",
};

export default async function ResearchRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const organizationId = (session.user as any)?.organizationId as string | undefined;
  if (!organizationId) redirect("/login");

  const { id } = await params;
  const run = await getResearchRunDetails(id, organizationId);

  return (
    <div className="p-6">
      <RunDetailClient run={run} />
    </div>
  );
}
