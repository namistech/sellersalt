import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCanonicalOpportunities, calculatePipelineHealth } from "@/services/opportunity-memory";
import { getOwnShopIntelligence } from "@/services/own-shop-intelligence";
import { WorkspaceClient } from "./workspace-client";

export const metadata: Metadata = {
  title: "Operating Workspace | SellerSalt",
  description: "Your central seller operating system — Opportunity Inbox, 10-stage execution pipeline, own-shop intelligence, and comparison decision mode.",
};

export default async function WorkspacePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; organizationId?: string; name?: string | null; email?: string | null } | undefined;
  const organizationId = user?.organizationId ?? "org_default";

  const [opportunities, ownShopReport, pipelineHealth] = await Promise.all([
    getCanonicalOpportunities(organizationId),
    getOwnShopIntelligence(organizationId),
    calculatePipelineHealth(organizationId),
  ]);

  return (
    <WorkspaceClient
      organizationId={organizationId}
      initialOpportunities={opportunities}
      initialOwnShopReport={ownShopReport}
      initialPipelineHealth={pipelineHealth}
    />
  );
}
