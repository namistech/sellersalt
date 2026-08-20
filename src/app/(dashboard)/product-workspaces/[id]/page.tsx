import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProductOpportunityWorkspaceEngine } from "@/services/intelligence/product-opportunity-workspace-engine";
import { ProductOpportunityCockpit } from "@/components/workspace/ProductOpportunityCockpit";

interface WorkspacePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: WorkspacePageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Opportunity Workspace | SellerSalt`,
    description: `Evidence-grounded decision cockpit and launch specifications.`,
  };
}

export default async function WorkspaceDetailPage({ params }: WorkspacePageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const organizationId = (session.user as any)?.organizationId || "org_default";
  const { id } = await params;

  let workspace = await ProductOpportunityWorkspaceEngine.getWorkspace(organizationId, id);

  if (!workspace) {
    // If not found by exact ID, attempt creating from decoded ID as query
    const decodedQuery = decodeURIComponent(id).replace(/^ws_[^_]+_/, "");
    workspace = await ProductOpportunityWorkspaceEngine.createOrRefreshWorkspace({
      organizationId,
      query: decodedQuery,
      title: decodedQuery,
    });
  }

  if (!workspace) {
    notFound();
  }

  return <ProductOpportunityCockpit initialWorkspace={workspace} />;
}
