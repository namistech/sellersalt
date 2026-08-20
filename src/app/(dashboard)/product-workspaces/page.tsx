import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ProductOpportunityWorkspaceEngine } from "@/services/intelligence/product-opportunity-workspace-engine";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Boxes, Plus, Compass, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Product Opportunity Workspaces | SellerSalt",
  description: "Evidence-grounded product opportunity, sourcing specifications, and launch intelligence cockpit.",
};

export default async function ProductWorkspacesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const organizationId = (session.user as any)?.organizationId || "org_default";
  const workspaces = await ProductOpportunityWorkspaceEngine.listWorkspaces(organizationId);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Boxes className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Launch Intelligence Cockpit
            </span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Product Opportunity Workspaces</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Turn discovered opportunities into grounded Bill of Materials, RFQ sourcing specs, and validated unit economics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/discovery">
            <Button size="compact" variant="primary" className="text-xs font-bold">
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              Discover Opportunities
            </Button>
          </Link>
        </div>
      </div>

      {/* Workspaces List */}
      {workspaces.length === 0 ? (
        <Card className="p-12 text-center border rounded-2xl bg-card space-y-3">
          <Boxes className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No Workspaces Created Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Discover an opportunity in the Discovery Center or Opportunity Radar, then open it in a Product Opportunity Workspace.
          </p>
          <Link href="/discovery">
            <Button size="compact" variant="secondary" className="text-xs mt-2">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Go to Discovery Center
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/product-workspaces/${encodeURIComponent(ws.id)}`}>
              <Card className="p-5 border rounded-2xl bg-card hover:border-primary/50 transition-all space-y-3 shadow-xs flex flex-col justify-between h-full">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        ws.verdict === "PURSUE"
                          ? "success"
                          : ws.verdict === "TEST" || ws.verdict === "INVESTIGATE"
                          ? "info"
                          : "warning"
                      }
                      className="text-[10px] font-bold"
                    >
                      {ws.verdict}
                    </Badge>
                    <span className="text-xs font-black text-primary">{ws.score}/100</span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground line-clamp-2">{ws.title}</h3>
                </div>

                <div className="flex items-center justify-between pt-3 border-t text-[11px] text-muted-foreground">
                  <span>Updated {new Date(ws.updatedAt).toLocaleDateString()}</span>
                  <span className="text-primary font-bold flex items-center">
                    Open Cockpit <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
