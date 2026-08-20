import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganizationResearchRuns } from "@/marketplaces/core/acquisition/workbench";
import { SourceHealthTracker } from "@/marketplaces/core/acquisition/source-health";
import { ResearchClient } from "./research-client";

export const metadata = {
  title: "Ecommerce Research Center — SellerSalt",
  description: "Marketplace-independent ecommerce research workbench powered by public web observations, canonical scoring, and real-time provenance tracking.",
};

export default async function ResearchPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const organizationId = (session.user as any)?.organizationId as string | undefined;
  if (!organizationId) redirect("/login");

  const [recentRuns, sourceHealth] = await Promise.all([
    getOrganizationResearchRuns(organizationId, undefined, 10).catch(() => []),
    SourceHealthTracker.getAllHealth().catch(() => []),
  ]);

  return (
    <div className="p-6">
      <ResearchClient
        initialRecentRuns={recentRuns}
        initialSourceHealth={sourceHealth}
      />
    </div>
  );
}
