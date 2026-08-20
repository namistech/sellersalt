import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BillingReconciliationService } from "@/services/billing/billing-reconciliation";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") !== "false";

  try {
    const report = await BillingReconciliationService.runAudit({
      organizationId,
      dryRun,
    });
    return NextResponse.json({ report });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to run reconciliation audit" },
      { status: 500 }
    );
  }
}
